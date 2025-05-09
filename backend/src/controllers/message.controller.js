import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import cloudinary from "../lib/cloudinary.js";
import { ApiError, ApiResponse } from "../utils/apiResponse.js";

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
    const { content, receiverId, image, video } = req.body;
    const senderId = req.user._id;

    if (!receiverId) {
      return res.status(400).json({ error: "Receiver ID is required" });
    }

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

    // Log the message content for debugging
    console.log("Creating new message with content:", content);

    const newMessage = new Message({
      senderId,
      receiverId,
      content: content || null,
      text: content || null, // Set both fields for consistency
      image: mediaType === "image" ? mediaUrl : null,
      video: mediaType === "video" ? mediaUrl : null,
      isRead: false,
    });

    console.log("New message object:", {
      senderId,
      receiverId,
      content: content ? "Content present" : "No content",
      text: content ? "Text present" : "No text",
      hasImage: mediaType === "image",
      hasVideo: mediaType === "video"
    });

    await newMessage.save();

    // Populate both sender and receiver information for proper display
    await newMessage.populate("senderId", "fullName profilePic");
    await newMessage.populate("receiverId", "fullName profilePic");

    // ✅ Notify receiver in real-time
    const receiverSocketId = getReceiverSocketId(receiverId);
    console.log("Receiver socket ID:", receiverSocketId || "Not found");

    if (receiverSocketId) {
      console.log("Emitting newMessage event to socket:", receiverSocketId);
      io.to(receiverSocketId).emit("newMessage", newMessage);
      console.log("Message emitted successfully");
    } else {
      console.log("Receiver not online, message will be delivered when they connect");
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
    // Get the sender ID from the URL parameter
    const senderId = req.params.id;
    const receiverId = req.user._id;

    if (!senderId) {
      return res.status(400).json({ error: "Sender ID is required" });
    }

    console.log(`Marking messages as read from sender ${senderId} to receiver ${receiverId}`);

    // Update all unread messages from this sender to this receiver
    const result = await Message.updateMany(
      { senderId, receiverId, isRead: false },
      { $set: { isRead: true } }
    );

    console.log(`Updated ${result.modifiedCount} messages as read`);

    // Notify the sender that their messages have been read
    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      console.log(`Emitting messagesRead event to socket ${senderSocketId}`);
      io.to(senderSocketId).emit("messagesRead", { senderId, receiverId });
    } else {
      console.log(`Sender ${senderId} is not online, no real-time notification sent`);
    }

    res.status(200).json({
      message: "Messages marked as read",
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error("Error in markMessagesAsRead:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete message (for me or for everyone)
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { deleteForEveryone } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      throw new ApiError(404, "Message not found");
    }

    // Check if user is the sender or an admin
    const isSender = message.senderId.toString() === userId.toString();
    const isAdmin = await User.findById(userId).then(user => user?.role === 'admin');

    if (!isSender && !isAdmin) {
      throw new ApiError(403, "You don't have permission to delete this message");
    }

    if (deleteForEveryone) {
      // Only sender or admin can delete for everyone
      if (!isSender && !isAdmin) {
        throw new ApiError(403, "Only the sender or admin can delete a message for everyone");
      }

      // Delete for everyone
      message.isDeletedForEveryone = true;
      message.deletedFor = [];
    } else {
      // Delete for me only
      if (!message.deletedFor.includes(userId)) {
        message.deletedFor.push(userId);
      }
    }

    await message.save();

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Message deleted successfully"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Error while deleting message");
  }
};
