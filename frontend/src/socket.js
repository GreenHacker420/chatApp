import { io } from "socket.io-client";
import { config } from "./config/env";
import toast from "react-hot-toast";

// Create a socket instance with configuration from env.js
export const socket = io(config.SOCKET.URL, {
  ...config.SOCKET.CONFIG,
  autoConnect: false, // Don't connect automatically, let auth store handle it
  reconnection: true,
  reconnectionAttempts: 10, // Increased attempts
  reconnectionDelay: 1000,
  timeout: 20000 // Increased timeout for better reliability
});

// Add connection event listeners
socket.on("connect", () => {
  console.log("✅ Socket connected successfully");

  // Debug socket events
  const events = socket._callbacks || {};
  const eventNames = Object.keys(events).filter(key => key !== '$connecting' && key !== '$connect' && key !== '$disconnect');
  console.log("Socket is listening for events:", eventNames);
});

socket.on("connect_error", (error) => {
  console.error("Socket connection error:", error);
  toast.error("Connection error. Please try refreshing the page.");
});

socket.on("disconnect", (reason) => {
  console.log("Socket disconnected:", reason);
  if (reason === "io server disconnect" || reason === "transport close") {
    // Server initiated disconnect or transport closed, try to reconnect
    console.log("Attempting to reconnect socket in 1 second...");
    setTimeout(() => {
      socket.connect();
    }, 1000);
  }
});

// Debug event for newMessage
socket.on("newMessage", (data) => {
  console.log("Socket received newMessage event:", data);
});

// Export a function to connect with user ID
export const connectSocket = (userId) => {
  if (!userId) {
    console.warn("Cannot connect socket without userId");
    return;
  }

  console.log("Connecting socket for user ID:", userId);

  // Set auth parameters
  socket.auth = { userId };
  socket.io.opts.query = { userId };

  // Disconnect if already connected to ensure clean state
  if (socket.connected) {
    console.log("Socket already connected, disconnecting first");
    socket.disconnect();
  }

  // Connect with a slight delay to ensure proper connection
  setTimeout(() => {
    try {
      socket.connect();
      console.log("🔹 Socket connection initiated for user:", userId);

      // Verify connection after a short delay
      setTimeout(() => {
        if (socket.connected) {
          console.log("✅ Socket connection verified");
          socket.emit("online", { userId });
        } else {
          console.warn("⚠️ Socket failed to connect after timeout");
        }
      }, 1000);
    } catch (error) {
      console.error("❌ Error connecting socket:", error);
    }
  }, 300);

  return socket;
};