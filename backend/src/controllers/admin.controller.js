import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";
import { ApiError, ApiResponse } from "../utils/apiResponse.js";

// Check if user is admin
const isAdmin = async (userId) => {
  const user = await User.findById(userId);
  return user?.role === 'admin';
};

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    if (!await isAdmin(userId)) {
      throw new ApiError(403, "Access denied. Admin privileges required.");
    }

    // Get counts
    const userCount = await User.countDocuments();
    const messageCount = await Message.countDocuments();
    const groupCount = await Group.countDocuments();
    
    // Get recent users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("fullName email profilePic createdAt");
    
    // Get recent messages
    const recentMessages = await Message.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("senderId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic");
    
    // Get user activity (users with most messages)
    const userActivity = await Message.aggregate([
      { $group: { _id: "$senderId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    // Populate user details
    const userActivityWithDetails = await User.populate(userActivity, {
      path: "_id",
      select: "fullName profilePic"
    });
    
    return res.status(200).json(
      new ApiResponse(200, {
        stats: {
          userCount,
          messageCount,
          groupCount
        },
        recentUsers,
        recentMessages,
        userActivity: userActivityWithDetails
      }, "Dashboard statistics retrieved successfully")
    );
  } catch (error) {
    throw new ApiError(500, error?.message || "Error while fetching dashboard statistics");
  }
};

// Get all users with pagination
export const getAllUsers = async (req, res) => {
  try {
    const userId = req.user._id;
    
    if (!await isAdmin(userId)) {
      throw new ApiError(403, "Access denied. Admin privileges required.");
    }
    
    const { page = 1, limit = 10, search = "" } = req.query;
    const skip = (page - 1) * limit;
    
    // Build search query
    const searchQuery = search 
      ? { 
          $or: [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } }
          ] 
        } 
      : {};
    
    // Get users with pagination
    const users = await User.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("-password");
    
    // Get total count for pagination
    const totalUsers = await User.countDocuments(searchQuery);
    
    return res.status(200).json(
      new ApiResponse(200, {
        users,
        pagination: {
          total: totalUsers,
          page: parseInt(page),
          pages: Math.ceil(totalUsers / limit)
        }
      }, "Users retrieved successfully")
    );
  } catch (error) {
    throw new ApiError(500, error?.message || "Error while fetching users");
  }
};

// Get user details
export const getUserDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    const { targetUserId } = req.params;
    
    if (!await isAdmin(userId)) {
      throw new ApiError(403, "Access denied. Admin privileges required.");
    }
    
    const user = await User.findById(targetUserId).select("-password");
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    
    // Get user's message count
    const messageCount = await Message.countDocuments({
      $or: [
        { senderId: targetUserId },
        { receiverId: targetUserId }
      ]
    });
    
    // Get user's groups
    const groups = await Group.find({ members: targetUserId })
      .select("name description image");
    
    return res.status(200).json(
      new ApiResponse(200, {
        user,
        stats: {
          messageCount,
          groupCount: groups.length
        },
        groups
      }, "User details retrieved successfully")
    );
  } catch (error) {
    throw new ApiError(500, error?.message || "Error while fetching user details");
  }
};

// Update user role
export const updateUserRole = async (req, res) => {
  try {
    const userId = req.user._id;
    const { targetUserId } = req.params;
    const { role } = req.body;
    
    if (!await isAdmin(userId)) {
      throw new ApiError(403, "Access denied. Admin privileges required.");
    }
    
    // Validate role
    if (!["user", "admin", "moderator"].includes(role)) {
      throw new ApiError(400, "Invalid role. Must be 'user', 'admin', or 'moderator'");
    }
    
    const user = await User.findById(targetUserId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    
    // Update role
    user.role = role;
    await user.save();
    
    return res.status(200).json(
      new ApiResponse(200, { user }, "User role updated successfully")
    );
  } catch (error) {
    throw new ApiError(500, error?.message || "Error while updating user role");
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { targetUserId } = req.params;
    
    if (!await isAdmin(userId)) {
      throw new ApiError(403, "Access denied. Admin privileges required.");
    }
    
    const user = await User.findById(targetUserId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    
    // Delete user's messages
    await Message.deleteMany({
      $or: [
        { senderId: targetUserId },
        { receiverId: targetUserId }
      ]
    });
    
    // Remove user from groups
    await Group.updateMany(
      { members: targetUserId },
      { $pull: { members: targetUserId, admins: targetUserId } }
    );
    
    // Delete user
    await User.findByIdAndDelete(targetUserId);
    
    return res.status(200).json(
      new ApiResponse(200, null, "User deleted successfully")
    );
  } catch (error) {
    throw new ApiError(500, error?.message || "Error while deleting user");
  }
};

// Get all messages with pagination
export const getAllMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    
    if (!await isAdmin(userId)) {
      throw new ApiError(403, "Access denied. Admin privileges required.");
    }
    
    const { page = 1, limit = 20, search = "" } = req.query;
    const skip = (page - 1) * limit;
    
    // Build search query
    const searchQuery = search 
      ? { text: { $regex: search, $options: "i" } } 
      : {};
    
    // Get messages with pagination
    const messages = await Message.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("senderId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic");
    
    // Get total count for pagination
    const totalMessages = await Message.countDocuments(searchQuery);
    
    return res.status(200).json(
      new ApiResponse(200, {
        messages,
        pagination: {
          total: totalMessages,
          page: parseInt(page),
          pages: Math.ceil(totalMessages / limit)
        }
      }, "Messages retrieved successfully")
    );
  } catch (error) {
    throw new ApiError(500, error?.message || "Error while fetching messages");
  }
};

// Delete message (admin can delete any message)
export const adminDeleteMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;
    
    if (!await isAdmin(userId)) {
      throw new ApiError(403, "Access denied. Admin privileges required.");
    }
    
    const message = await Message.findById(messageId);
    if (!message) {
      throw new ApiError(404, "Message not found");
    }
    
    // Delete message completely
    await Message.findByIdAndDelete(messageId);
    
    return res.status(200).json(
      new ApiResponse(200, null, "Message deleted successfully")
    );
  } catch (error) {
    throw new ApiError(500, error?.message || "Error while deleting message");
  }
}; 