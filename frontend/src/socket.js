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
});

socket.on("connect_error", (error) => {
  console.error("Socket connection error:", error);
  toast.error("Connection error. Please try refreshing the page.");
});

socket.on("disconnect", (reason) => {
  console.log("Socket disconnected:", reason);
  if (reason === "io server disconnect" || reason === "transport close") {
    // Server initiated disconnect or transport closed, try to reconnect
    setTimeout(() => {
      socket.connect();
    }, 1000);
  }
});

// Export a function to connect with user ID
export const connectSocket = (userId) => {
  if (!userId) {
    console.warn("Cannot connect socket without userId");
    return;
  }

  // Set auth parameters
  socket.auth = { userId };
  socket.io.opts.query = { userId };

  // Disconnect if already connected to ensure clean state
  if (socket.connected) {
    socket.disconnect();
  }

  // Connect with a slight delay to ensure proper connection
  setTimeout(() => {
    socket.connect();
    console.log("🔹 Socket connection initiated for user:", userId);
  }, 300);

  return socket;
};