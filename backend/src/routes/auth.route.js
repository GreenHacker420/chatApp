import express from "express";
import { checkAuth, login, logout, signup, updateProfile, verifyEmail, resendVerificationEmail } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/verify/:id/:token", verifyEmail); // Fixed email verification route
router.post("/resend-verification", resendVerificationEmail);


// Protected routes
router.put("/update-profile", protectRoute, updateProfile);
router.get("/check", protectRoute, checkAuth);

export default router;
