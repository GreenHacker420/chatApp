import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import cloudinary from "../lib/cloudinary.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Create a new group
export const createGroup = async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;
    const creator = req.user._id;

    // Check if group name already exists
    const existingGroup = await Group.findOne({ name });
    if (existingGroup) {
      throw new ApiError(400, "Group name already exists");
    }

    // Create new group
    const group = await Group.create({
      name,
      description,
      creator,
      members: [creator],
      admins: [creator],
      isPrivate,
    });

    // Populate creator details
    await group.populate("creator", "username profilePic");

    return res
      .status(201)
      .json(new ApiResponse(201, group, "Group created successfully"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Error while creating group");
  }
};

// Get all groups for a user
export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    const groups = await Group.find({ members: userId })
      .populate("creator", "username profilePic")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    return res
      .status(200)
      .json(new ApiResponse(200, groups, "Groups fetched successfully"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Error while fetching groups");
  }
};

// Get group by ID
export const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId)
      .populate("creator", "username profilePic")
      .populate("members", "username profilePic")
      .populate("admins", "username profilePic")
      .populate("lastMessage");

    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    if (!group.isMember(userId)) {
      throw new ApiError(403, "You are not a member of this group");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, group, "Group fetched successfully"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Error while fetching group");
  }
};

// Update group
export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    const { name, description, isPrivate } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    if (!group.canModify(userId)) {
      throw new ApiError(403, "You don't have permission to update this group");
    }

    // Check if new name already exists
    if (name && name !== group.name) {
      const existingGroup = await Group.findOne({ name });
      if (existingGroup) {
        throw new ApiError(400, "Group name already exists");
      }
    }

    // Update group
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      {
        name: name || group.name,
        description: description || group.description,
        isPrivate: isPrivate !== undefined ? isPrivate : group.isPrivate,
      },
      { new: true }
    )
      .populate("creator", "username profilePic")
      .populate("members", "username profilePic")
      .populate("admins", "username profilePic");

    return res
      .status(200)
      .json(new ApiResponse(200, updatedGroup, "Group updated successfully"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Error while updating group");
  }
};

// Update group image
export const updateGroupImage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    if (!group.canModify(userId)) {
      throw new ApiError(403, "You don't have permission to update this group");
    }

    if (!req.file) {
      throw new ApiError(400, "No image file provided");
    }

    // Upload image to Cloudinary
    const result = await uploadToCloudinary(req.file.path, "group_images");

    // Update group image
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      { image: result.secure_url },
      { new: true }
    )
      .populate("creator", "username profilePic")
      .populate("members", "username profilePic")
      .populate("admins", "username profilePic");

    return res
      .status(200)
      .json(new ApiResponse(200, updatedGroup, "Group image updated successfully"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Error while updating group image");
  }
};

// Add member to group
export const addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const adminId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    if (!group.canModify(adminId)) {
      throw new ApiError(403, "You don't have permission to add members");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    if (group.isMember(userId)) {
      throw new ApiError(400, "User is already a member of this group");
    }

    // Add user to members
    group.members.push(userId);
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("creator", "username profilePic")
      .populate("members", "username profilePic")
      .populate("admins", "username profilePic");

    return res
      .status(200)
      .json(new ApiResponse(200, updatedGroup, "Member added successfully"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Error while adding member");
  }
};

// Remove member from group
export const removeMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const adminId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    if (!group.canModify(adminId)) {
      throw new ApiError(403, "You don't have permission to remove members");
    }

    if (group.isCreator(userId)) {
      throw new ApiError(400, "Cannot remove group creator");
    }

    if (!group.isMember(userId)) {
      throw new ApiError(400, "User is not a member of this group");
    }

    // Remove user from members and admins
    group.members = group.members.filter(
      (member) => member.toString() !== userId
    );
    group.admins = group.admins.filter(
      (admin) => admin.toString() !== userId
    );
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("creator", "username profilePic")
      .populate("members", "username profilePic")
      .populate("admins", "username profilePic");

    return res
      .status(200)
      .json(new ApiResponse(200, updatedGroup, "Member removed successfully"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Error while removing member");
  }
};

// Make member admin
export const makeAdmin = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const adminId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    if (!group.isCreator(adminId)) {
      throw new ApiError(403, "Only group creator can make admins");
    }

    if (!group.isMember(userId)) {
      throw new ApiError(400, "User is not a member of this group");
    }

    if (group.isAdmin(userId)) {
      throw new ApiError(400, "User is already an admin");
    }

    // Add user to admins
    group.admins.push(userId);
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("creator", "username profilePic")
      .populate("members", "username profilePic")
      .populate("admins", "username profilePic");

    return res
      .status(200)
      .json(new ApiResponse(200, updatedGroup, "Admin added successfully"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Error while making admin");
  }
};

// Remove admin
export const removeAdmin = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const adminId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    if (!group.isCreator(adminId)) {
      throw new ApiError(403, "Only group creator can remove admins");
    }

    if (!group.isAdmin(userId)) {
      throw new ApiError(400, "User is not an admin");
    }

    // Remove user from admins
    group.admins = group.admins.filter(
      (admin) => admin.toString() !== userId
    );
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("creator", "username profilePic")
      .populate("members", "username profilePic")
      .populate("admins", "username profilePic");

    return res
      .status(200)
      .json(new ApiResponse(200, updatedGroup, "Admin removed successfully"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Error while removing admin");
  }
};

// Leave group
export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    if (!group.isMember(userId)) {
      throw new ApiError(400, "You are not a member of this group");
    }

    if (group.isCreator(userId)) {
      throw new ApiError(400, "Group creator cannot leave the group");
    }

    // Remove user from members and admins
    group.members = group.members.filter(
      (member) => member.toString() !== userId
    );
    group.admins = group.admins.filter(
      (admin) => admin.toString() !== userId
    );
    await group.save();

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Left group successfully"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Error while leaving group");
  }
};

// Delete group
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, "Group not found");
    }

    if (!group.isCreator(userId)) {
      throw new ApiError(403, "Only group creator can delete the group");
    }

    // Delete all messages in the group
    await Message.deleteMany({ group: groupId });

    // Delete the group
    await Group.findByIdAndDelete(groupId);

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Group deleted successfully"));
  } catch (error) {
    throw new ApiError(500, error?.message || "Error while deleting group");
  }
};

// Get group messages
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;
    const { page = 1, limit = 50 } = req.query;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is a member of the group
    if (!group.members.includes(userId)) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    const messages = await Message.find({
      groupId,
      $and: [
        { isDeletedForEveryone: false },
        { $or: [{ deletedFor: { $ne: userId } }, { deletedFor: { $exists: false } }] }
      ]
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("senderId", "fullName profilePic");

    const totalMessages = await Message.countDocuments({
      groupId,
      $and: [
        { isDeletedForEveryone: false },
        { $or: [{ deletedFor: { $ne: userId } }, { deletedFor: { $exists: false } }] }
      ]
    });

    res.status(200).json({
      messages,
      totalMessages,
      totalPages: Math.ceil(totalMessages / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error in getGroupMessages:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Send message to group
export const sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { text, image, video } = req.body;
    const senderId = req.user._id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is a member of the group
    if (!group.members.includes(senderId)) {
      return res.status(403).json({ message: "You are not a member of this group" });
    }

    let mediaUrl = null;
    let mediaType = null;

    if (image) {
      // Prevents malicious file uploads
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
      // Ensures correct resource type for video uploads
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
      groupId,
      text,
      image: mediaType === "image" ? mediaUrl : null,
      video: mediaType === "video" ? mediaUrl : null,
      isRead: false,
    });

    await newMessage.save();
    await newMessage.populate("senderId", "fullName profilePic");

    // Notify all group members about the new message
    group.members.forEach(memberId => {
      if (memberId.toString() !== senderId.toString()) {
        const socketId = getReceiverSocketId(memberId);
        if (socketId) {
          io.to(socketId).emit("newGroupMessage", {
            message: newMessage,
            groupId,
            groupName: group.name
          });
        }
      }
    });

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendGroupMessage:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
}; 