import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import cloudinary from "../lib/cloudinary.js";

// ✅ Get Messages with Pagination & Mark as Read
export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
      $and: [
        { isDeletedForEveryone: false },
        { $or: [{ deletedFor: { $ne: myId } }, { deletedFor: { $exists: false } }] }
      ]
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("senderId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic");

    const totalMessages = await Message.countDocuments({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
      $and: [
        { isDeletedForEveryone: false },
        { $or: [{ deletedFor: { $ne: myId } }, { deletedFor: { $exists: false } }] }
      ]
    });

    // ✅ Mark unread messages as read when fetching
    await Message.updateMany(
      { senderId: userToChatId, receiverId: myId, isRead: false },
      { $set: { isRead: true } }
    );

    // ✅ Notify sender that messages have been read
    const senderSocketId = getReceiverSocketId(userToChatId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesRead", { senderId: myId, receiverId: userToChatId });
    }

    res.status(200).json({
      messages,
      totalMessages,
      totalPages: Math.ceil(totalMessages / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error in getMessages:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};


// ✅ Get Users for Sidebar (Supports Pagination)
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const { page = 1, limit } = req.query;

    // ✅ If limit=0 or not provided, fetch all users
    const queryLimit = limit && parseInt(limit) > 0 ? parseInt(limit) : 0;

    const users = await User.find({ _id: { $ne: loggedInUserId } })
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * queryLimit)
      .limit(queryLimit || 0); // ✅ 0 means no limit (fetch all)

    // ✅ Fix: Define `totalUsers`
    const totalUsers = await User.countDocuments({ _id: { $ne: loggedInUserId } });

    res.status(200).json({
      users,
      totalUsers,
      totalPages: queryLimit > 0 ? Math.ceil(totalUsers / queryLimit) : 1, // ✅ Adjust pages
      currentPage: Number(page),
    });
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};


// ✅ Send Message (Supports Image & Video)
export const sendMessage = async (req, res) => {
  try {
    const { text, image, video } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let mediaUrl = null;
    let mediaType = null;

    if (image) {
      // ✅ Prevents malicious file uploads
      if (!image.startsWith("data:image/")) {
        return res.status(400).json({ error: "Invalid image file" });
      }
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder: "chat_images",
        allowed_formats: ["jpg", "jpeg", "png", "gif"],
        transformation: [{ width: 800, height: 800, crop: "limit" }],
      });
      mediaUrl = uploadResponse.secure_url;
      mediaType = "image";
    } else if (video) {
      // ✅ Ensures correct resource type for video uploads
      if (!video.startsWith("data:video/")) {
        return res.status(400).json({ error: "Invalid video file" });
      }
      const uploadResponse = await cloudinary.uploader.upload(video, {
        resource_type: "video",
        folder: "chat_videos",
        allowed_formats: ["mp4", "mov", "avi"],
      });
      mediaUrl = uploadResponse.secure_url;
      mediaType = "video";
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: mediaType === "image" ? mediaUrl : null,
      video: mediaType === "video" ? mediaUrl : null,
      isRead: false,
    });

    await newMessage.save();

    // ✅ Notify receiver in real-time
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Mark Messages as Read
export const markMessagesAsRead = async (req, res) => {
  try {
    const { senderId } = req.body;
    const receiverId = req.user._id;

    await Message.updateMany(
      { senderId, receiverId, isRead: false },
      { $set: { isRead: true } }
    );

    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesRead", { senderId, receiverId });
    }

    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("Error in markMessagesAsRead:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete message for me or for everyone
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { deleteForEveryone } = req.body;
    const userId = req.user._id;

    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if the user is the sender of the message
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "You can only delete your own messages" });
    }

    if (deleteForEveryone) {
      // Delete for everyone
      message.isDeletedForEveryone = true;
      await message.save();

      // Notify all receivers that a message was deleted
      const receiverSocketId = getReceiverSocketId(message.receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeleted", { messageId, deleteForEveryone: true });
      }
    } else {
      // Delete for me only
      if (!message.deletedFor.includes(userId)) {
        message.deletedFor.push(userId);
        await message.save();
      }
    }

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error in deleteMessage:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
