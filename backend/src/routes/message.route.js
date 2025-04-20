import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, sendMessage, getUsersForSidebar, markMessagesAsRead, deleteMessage } from "../controllers/message.controller.js";

const router = express.Router();

// ✅ Fetch paginated user list (Ensure getUsersForSidebar exists)
router.get("/users", protectRoute, getUsersForSidebar); 

// ✅ Fetch paginated messages for a chat
router.get("/:id", protectRoute, getMessages); 

// ✅ Send a message
router.post("/", protectRoute, sendMessage);

router.post("/mark-as-read/:id", protectRoute, markMessagesAsRead);

// ✅ Delete a message
router.delete("/:messageId", protectRoute, deleteMessage);

export default router;
