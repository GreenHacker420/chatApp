import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

/** ✅ Get Users for Sidebar (With Unread Messages First) **/
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // Fetch all users except the logged-in user
    const users = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    // Get unread message count for each user
    const usersWithUnreadCount = await Promise.all(
      users.map(async (user) => {
        const unreadCount = await Message.countDocuments({
          senderId: user._id,
          receiverId: loggedInUserId,
          isRead: false,
        });

        return { ...user._doc, unreadCount };
      })
    );

    // ✅ Sort users: those with unread messages come first
    usersWithUnreadCount.sort((a, b) => b.unreadCount - a.unreadCount);

    res.status(200).json(usersWithUnreadCount);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/** ✅ Get Messages and Mark Them as Read **/
export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    // Fetch messages between the two users
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    // ✅ Mark messages as read for this chat
    await Message.updateMany(
      { senderId: userToChatId, receiverId: myId, isRead: false },
      { $set: { isRead: true } }
    );

    // ✅ Notify the sender that their message was read
    const senderSocketId = getReceiverSocketId(userToChatId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messageRead", { senderId: myId, receiverId: userToChatId });
    }

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/** ✅ Send a New Message **/
export const sendMessage = async (req, res) => {
  try {
    const { text, image, video } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let mediaUrl = null;
    let mediaType = null;

    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder: "chat_images",
        allowed_formats: ["jpg", "jpeg", "png", "gif"],
      });
      mediaUrl = uploadResponse.secure_url;
      mediaType = "image";
    } else if (video) {
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
      isRead: false, // ✅ Mark message as unread by default
    });

    await newMessage.save();

    // ✅ Emit real-time update if receiver is online
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
