import { io } from "socket.io-client";
import { config } from "./config/env";

// Create a socket instance with configuration from env.js
export const socket = io(config.SOCKET.URL, {
  ...config.SOCKET.CONFIG,
  autoConnect: false // Don't connect automatically, let auth store handle it
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

  // Connect if not already connected
  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};