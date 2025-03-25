import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL] // ✅ Use production frontend URL
    : ["http://localhost:5173"]; // ✅ Development URL

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
  pingTimeout: 30000, // ✅ Increased timeout to prevent unnecessary disconnects
  pingInterval: 10000, // ✅ Send a ping every 10s to keep connection alive
});

// ✅ Store online users
const userSocketMap = new Map(); 

export function getReceiverSocketId(userId) {
  return userSocketMap.get(userId);
}

io.on("connection", (socket) => {
  console.log("✅ A user connected:", socket.id);

  const userId = socket.handshake.query.userId;
  
  if (userId) {
    userSocketMap.set(userId, socket.id);
    socket.data.userId = userId;
    io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
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

  // ✅ Handle active chat status
  socket.on("activeChat", ({ userId, chatId }) => {
    io.emit("userActiveChat", { userId, chatId });
  });

  // ✅ Handle user disconnection properly
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    const storedUserId = socket.data.userId;
    if (storedUserId) {
      userSocketMap.delete(storedUserId);
      io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
    }});

  // ✅ Handle WebSocket reconnections
  socket.on("reconnect_attempt", () => {
    console.log(`🔄 Reconnecting attempt for user: ${socket.data.userId}`);
  });

  socket.on("reconnect", () => {
    console.log(`🔄 User reconnected: ${socket.id}`);
    if (socket.data.userId) {
      userSocketMap.set(socket.data.userId, socket.id);
      io.emit("getOnlineUsers", Array.from(userSocketMap.keys())); // ✅ Sync online users
    }
  });

  // ✅ Catch socket errors
  socket.on("error", (err) => {
    console.error("⚠️ Socket error:", err.message);
  });
});

export { io, app, server };
