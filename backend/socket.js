const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/user.model");
const os = require('os');

let io;
const onlineUsers = new Map(); // Track online users
const lanUsers = new Map(); // Track users on LAN with their IP addresses

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id;
    console.log("User connected:", userId);

    // Update user's online status
    onlineUsers.set(userId.toString(), {
      socketId: socket.id,
      lastSeen: Date.now()
    });

    // Update database
    User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: Date.now()
    }).exec();

    // Broadcast user's online status to all connected clients
    io.emit("userStatusChange", {
      userId: userId.toString(),
      isOnline: true
    });

    // Join user's personal room
    socket.join(userId.toString());

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected:", userId);

      // Remove from online users
      onlineUsers.delete(userId.toString());

      // Update database
      User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: Date.now()
      }).exec();

      // Broadcast user's offline status
      io.emit("userStatusChange", {
        userId: userId.toString(),
        isOnline: false
      });
    });

    // Handle user status check
    socket.on("checkUserStatus", async (targetUserId) => {
      const isOnline = onlineUsers.has(targetUserId);
      socket.emit("userStatusResponse", {
        userId: targetUserId,
        isOnline
      });
    });

    // Handle call initiation
    socket.on("initiateCall", async (data) => {
      try {
        const { callerId, callerName, receiverId, isVideo, timestamp } = data;

        // Validate the call data
        if (!callerId || !receiverId) {
          throw new Error("Invalid call data");
        }

        // Check if receiver is online using our online users map
        const isReceiverOnline = onlineUsers.has(receiverId);

        if (!isReceiverOnline) {
          socket.emit("callError", { message: "User is offline" });
          return;
        }

        // Emit call notification to receiver
        io.to(receiverId).emit("incomingCall", {
          callerId,
          callerName,
          isVideo,
          timestamp
        });

        // Notify caller that call was initiated
        socket.emit("callInitiated", {
          receiverId,
          timestamp
        });
      } catch (error) {
        console.error("Error initiating call:", error);
        socket.emit("callError", { message: "Failed to initiate call" });
      }
    });

    // Handle call acceptance
    socket.on("acceptCall", async (data) => {
      try {
        const { callerId, receiverId, timestamp } = data;

        // Validate the call data
        if (!callerId || !receiverId) {
          throw new Error("Invalid call data");
        }

        // Notify caller that call was accepted
        io.to(callerId).emit("callAccepted", {
          receiverId,
          timestamp
        });
      } catch (error) {
        console.error("Error accepting call:", error);
        socket.emit("callError", { message: "Failed to accept call" });
      }
    });

    // Handle call rejection
    socket.on("rejectCall", async (data) => {
      try {
        const { callerId, receiverId, reason } = data;

        // Validate the call data
        if (!callerId || !receiverId) {
          throw new Error("Invalid call data");
        }

        // Notify caller that call was rejected
        io.to(callerId).emit("callRejected", {
          receiverId,
          reason,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error("Error rejecting call:", error);
        socket.emit("callError", { message: "Failed to reject call" });
      }
    });

    // Handle call ending
    socket.on("endCall", async (data) => {
      try {
        const { userId, remoteUserId } = data;

        // Validate the call data
        if (!userId || !remoteUserId) {
          throw new Error("Invalid call data");
        }

        // Notify both users that call has ended
        io.to(remoteUserId).emit("callEnded", {
          userId,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error("Error ending call:", error);
        socket.emit("callError", { message: "Failed to end call" });
      }
    });

    // WebRTC signaling
    socket.on("offer", (data) => {
      const { target, sdp } = data;
      io.to(target).emit("offer", {
        target: socket.user._id,
        sdp
      });
    });

    socket.on("answer", (data) => {
      const { target, sdp } = data;
      io.to(target).emit("answer", {
        target: socket.user._id,
        sdp
      });
    });

    socket.on("ice-candidate", (data) => {
      const { target, candidate } = data;
      io.to(target).emit("ice-candidate", {
        target: socket.user._id,
        candidate
      });
    });

    // Handle LAN connection information
    socket.on("lan-connection-info", (data) => {
      const { lanIpAddresses } = data;
      if (lanIpAddresses && Array.isArray(lanIpAddresses)) {
        // Store user's LAN IP addresses
        lanUsers.set(userId.toString(), {
          userId: userId.toString(),
          name: socket.user.fullName || socket.user.name || socket.user.username || "User",
          lanIpAddresses,
          lastUpdated: Date.now()
        });

        console.log(`User ${userId} registered LAN IPs:`, lanIpAddresses);
      }
    });

    // Handle LAN scanning
    socket.on("scan-lan", () => {
      try {
        // Get local network interfaces
        const networkInterfaces = os.networkInterfaces();
        const localIps = [];

        // Extract local IP addresses
        Object.keys(networkInterfaces).forEach(ifaceName => {
          networkInterfaces[ifaceName].forEach(iface => {
            // Only include IPv4 and non-internal addresses
            if (iface.family === 'IPv4' && !iface.internal) {
              localIps.push(iface.address);
            }
          });
        });

        // Find users on the same network
        const lanUsersList = [];
        lanUsers.forEach((user, id) => {
          // Skip current user
          if (id === userId.toString()) return;

          // Check if any IP addresses match the subnet
          const isOnSameNetwork = user.lanIpAddresses.some(ip => {
            return localIps.some(localIp => {
              // Simple subnet check - compare first three octets
              const localSubnet = localIp.split('.').slice(0, 3).join('.');
              const userSubnet = ip.split('.').slice(0, 3).join('.');
              return localSubnet === userSubnet;
            });
          });

          if (isOnSameNetwork) {
            lanUsersList.push({
              id: user.userId,
              name: user.name,
              ip: user.lanIpAddresses[0] // Just use the first IP for display
            });
          }
        });

        // Send LAN users list to the client
        socket.emit("lan-users", lanUsersList);
        console.log(`Sent ${lanUsersList.length} LAN users to ${userId}`);
      } catch (error) {
        console.error("Error scanning LAN:", error);
        socket.emit("lan-users", []);
      }
    });
  });

  return io;
};

module.exports = { initializeSocket };