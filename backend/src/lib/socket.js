import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL] // Use production frontend URL
    : ["http://localhost:5173"]; // Development URL

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Store online users
const userSocketMap = new Map(); 

export function getReceiverSocketId(userId) {
  return userSocketMap.get(userId);
}

io.on("connection", (socket) => {
  console.log("✅ A user connected:", socket.id);

  const userId = socket.handshake.query.userId;
  
  if (userId) {
    userSocketMap.set(userId, socket.id);
    socket.data.userId = userId; // Store userId in socket data
    io.emit("getOnlineUsers", Array.from(userSocketMap.keys())); // Notify all users
  }

  // Real-time messaging
  socket.on("sendMessage", ({ senderId, receiverId, message }) => {
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", { senderId, message });
    }
  });

  // Notify sender when a message is read
  socket.on("messageRead", ({ senderId, receiverId }) => {
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageRead", { senderId, receiverId });
    }
  });

  // Heartbeat to detect connection loss
  socket.on("ping", () => {
    socket.emit("pong"); // Reply to confirm connection
  });

  socket.on("disconnect", () => {
    console.log("❌ A user disconnected:", socket.id);

    const storedUserId = socket.data.userId;
    if (storedUserId) {
      userSocketMap.delete(storedUserId);
      io.emit("getOnlineUsers", Array.from(userSocketMap.keys())); // Update online users list
    }
  });

  socket.on("error", (err) => {
    console.error("Socket error:", err.message);
  });
});

export { io, app, server }; 
