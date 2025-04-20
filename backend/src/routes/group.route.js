import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
  createGroup,
  getUserGroups,
  getGroupById,
  updateGroup,
  addMembers,
  removeMembers,
  makeAdmin,
  removeAdmin,
  leaveGroup,
  deleteGroup,
  getGroupMessages,
  sendGroupMessage,
} from "../controllers/group.controller.js";

const router = express.Router();

// All routes are protected
router.use(protectRoute);

// Group management routes
router.post("/", createGroup);
router.get("/", getUserGroups);
router.get("/:groupId", getGroupById);
router.put("/:groupId", updateGroup);
router.post("/:groupId/members", addMembers);
router.delete("/:groupId/members", removeMembers);
router.post("/:groupId/admins", makeAdmin);
router.delete("/:groupId/admins", removeAdmin);
router.post("/:groupId/leave", leaveGroup);
router.delete("/:groupId", deleteGroup);

// Group messaging routes
router.get("/:groupId/messages", getGroupMessages);
router.post("/:groupId/messages", sendGroupMessage);

export default router; 