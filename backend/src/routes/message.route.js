import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, sendMessage, getUsersForSidebar ,markMessagesAsRead } from "../controllers/message.controller.js";

const router = express.Router();

// ✅ Fetch paginated user list (Ensure getUsersForSidebar exists)
router.get("/users", protectRoute, getUsersForSidebar); 

// ✅ Fetch paginated messages for a chat
router.get("/:id", protectRoute, getMessages); 

// ✅ Send a message
router.post("/send/:id", protectRoute, sendMessage);

router.post("/mark-as-read/:id", protectRoute, markMessagesAsRead);

export default router;
