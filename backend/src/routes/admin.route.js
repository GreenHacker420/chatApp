import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getDashboardStats,
  getAllUsers,
  getUserDetails,
  updateUserRole,
  deleteUser,
  getAllMessages,
  adminDeleteMessage
} from "../controllers/admin.controller.js";

const router = express.Router();

// All routes are protected and require admin privileges
router.use(protectRoute);

// Dashboard
router.get("/dashboard", getDashboardStats);

// User management
router.get("/users", getAllUsers);
router.get("/users/:targetUserId", getUserDetails);
router.patch("/users/:targetUserId/role", updateUserRole);
router.delete("/users/:targetUserId", deleteUser);

// Message management
router.get("/messages", getAllMessages);
router.delete("/messages/:messageId", adminDeleteMessage);

export default router; 