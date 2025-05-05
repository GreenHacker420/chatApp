import { Server } from "socket.io";
import http from "http";
import express from "express";
import User from "../models/user.model.js";

const app = express();
const server = http.createServer(app);

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL] // ✅ Use production frontend URL
    : ["http://localhost:5173"]; // ✅ Development URL

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === "production"
      ? process.env.FRONTEND_URL
      : "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  pingTimeout: 60000, // ✅ Increased timeout to prevent unnecessary disconnects
  pingInterval: 25000, // ✅ Send a ping every 25s to keep connection alive
  transports: ['websocket', 'polling'], // ✅ Allow fallback to polling
});

// ✅ Store online users with their details
const userSocketMap = new Map();

// Store active group calls
const activeGroupCalls = new Map();

export function getReceiverSocketId(userId) {
  return userSocketMap.get(userId);
}

io.on("connection", async (socket) => {
  console.log("✅ A user connected:", socket.id);

  // Get userId from query params or auth
  const userId = socket.handshake.query.userId || socket.handshake.auth.userId;

  if (userId) {
    try {
      // Get user details from database
      const user = await User.findById(userId).select('fullName email');
      if (user) {
        console.log(`✅ User connected: ${user.fullName} (${user.email}) with socket ${socket.id}`);
        userSocketMap.set(userId, socket.id);
        socket.data.userId = userId;
        socket.data.userName = user.fullName;
        io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
      } else {
        console.warn(`⚠️ Socket connected with invalid userId: ${userId}`);
      }
    } catch (error) {
      console.error(`❌ Error fetching user details: ${error.message}`);
    }
  } else {
    console.warn("⚠️ Socket connected without userId:", socket.id);
  }

  // ✅ Handle real-time messaging
  socket.on("sendMessage", ({ senderId, receiverId, message }) => {
    if (!message || !senderId || !receiverId) return; // ✅ Prevent sending empty messages

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", { senderId, message });
    }
  });

  // ✅ Notify sender when a message is read
  socket.on("messageRead", ({ senderId, receiverId }) => {
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageRead", { senderId, receiverId });
    }
  });

  // ✅ Handle typing indicator
  socket.on("typing", ({ senderId, receiverId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { senderId });
    }
  });

  // ✅ Handle stopping typing
  socket.on("stopTyping", ({ senderId, receiverId }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stopTyping", { senderId });
    }
  });

  // ✅ Handle message deletion
  socket.on("deleteMessage", async ({ messageId, receiverId, deleteForEveryone }) => {
    try {
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeleted", { messageId, deleteForEveryone });
      }
    } catch (error) {
      console.error("Error in deleteMessage socket event:", error.message);
    }
  });

  // ✅ Handle active chat status
  socket.on("activeChat", ({ userId, chatId }) => {
    io.emit("userActiveChat", { userId, chatId });
  });

  // ✅ Handle user disconnection properly
  socket.on("disconnect", (reason) => {
    const userName = socket.data.userName || 'Unknown User';
    console.log(`❌ User disconnected: ${userName} (${socket.id}), reason: ${reason}`);
    const storedUserId = socket.data.userId;
    if (storedUserId) {
      userSocketMap.delete(storedUserId);
      io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
    }
  });

  // ✅ Handle WebSocket reconnections
  socket.on("reconnect_attempt", () => {
    const userName = socket.data.userName || 'Unknown User';
    console.log(`🔄 Reconnecting attempt for user: ${userName} (${socket.data.userId})`);
  });

  socket.on("reconnect", async () => {
    const userName = socket.data.userName || 'Unknown User';
    console.log(`🔄 User reconnected: ${userName} (${socket.id})`);
    if (socket.data.userId) {
      userSocketMap.set(socket.data.userId, socket.id);
      io.emit("getOnlineUsers", Array.from(userSocketMap.keys())); // ✅ Sync online users
    }
  });

  // ✅ Catch socket errors
  socket.on("error", (err) => {
    const userName = socket.data.userName || 'Unknown User';
    console.error(`⚠️ Socket error for ${userName}:`, err.message);
  });

  // Handle WebRTC signaling
  socket.on("webrtc-offer", ({ to, offer }) => {
    console.log(`Relaying WebRTC offer from ${socket.data.userId} to ${to}`);
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("webrtc-offer", {
        from: socket.data.userId,
        offer
      });
    }
  });

  socket.on("webrtc-answer", ({ to, answer }) => {
    console.log(`Relaying WebRTC answer from ${socket.data.userId} to ${to}`);
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("webrtc-answer", {
        from: socket.data.userId,
        answer
      });
    }
  });

  socket.on("webrtc-ice-candidate", ({ to, candidate }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("webrtc-ice-candidate", {
        from: socket.data.userId,
        candidate
      });
    }
  });

  // Handle call initiation
  socket.on("initiateCall", ({ callerId, callerName, receiverId, isVideo }) => {
    console.log(`Call initiated from ${callerName} to ${receiverId}`);
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incomingCall", {
        callerId,
        callerName,
        isVideo
      });
    }
  });

  socket.on("acceptCall", ({ callerId, receiverId }) => {
    console.log(`Call accepted by ${receiverId}`);
    const callerSocketId = getReceiverSocketId(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("callAccepted", { receiverId });
    }
  });

  socket.on("rejectCall", ({ callerId, receiverId }) => {
    console.log(`Call rejected by ${receiverId}`);
    const callerSocketId = getReceiverSocketId(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("callRejected", { receiverId });
    }
  });

  socket.on("endCall", ({ userId, remoteUserId }) => {
    console.log(`Call ended by ${userId}`);
    const remoteSocketId = getReceiverSocketId(remoteUserId);
    if (remoteSocketId) {
      io.to(remoteSocketId).emit("callEnded", { userId });
    }
  });

  // Handle group call events
  socket.on("joinGroupCall", ({ groupId, userId }) => {
    socket.join(`groupCall:${groupId}`);
    if (!activeGroupCalls.has(groupId)) {
      activeGroupCalls.set(groupId, new Set());
    }
    activeGroupCalls.get(groupId).add(userId);
    io.to(`groupCall:${groupId}`).emit("participantJoined", { userId });
  });

  socket.on("startGroupCall", ({ groupId, userId }) => {
    io.to(`groupCall:${groupId}`).emit("participantJoined", { userId });
  });

  socket.on("endGroupCall", ({ groupId }) => {
    if (activeGroupCalls.has(groupId)) {
      activeGroupCalls.delete(groupId);
    }
    io.to(`groupCall:${groupId}`).emit("groupCallEnded");
  });

  socket.on("leaveGroupCall", ({ groupId, userId }) => {
    socket.leave(`groupCall:${groupId}`);
    if (activeGroupCalls.has(groupId)) {
      activeGroupCalls.get(groupId).delete(userId);
      if (activeGroupCalls.get(groupId).size === 0) {
        activeGroupCalls.delete(groupId);
      }
    }
    io.to(`groupCall:${groupId}`).emit("participantLeft", { userId });
  });
});

export { app, server, io };
