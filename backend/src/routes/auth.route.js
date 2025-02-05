import express from "express";
import passport from "../lib/passport.js"; // ✅ Import Passport Config
import {
  checkAuth,
  login,
  logout,
  signup,
  updateProfile,
  verifyEmail,
  resendVerificationEmail,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { rateLimit } from "express-rate-limit"; // ✅ Prevents spam on email verification

const router = express.Router();

// ✅ Rate Limiter for Email Verification Resend (Prevents Spam)
const emailRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // Allow max 3 requests per 5 min
  message: "Too many requests. Please wait before resending verification email.",
});

// ✅ Public Routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/verify/:id/:token", verifyEmail);
router.post("/resend-verification", emailRateLimiter, resendVerificationEmail);

// ✅ Google OAuth Routes
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=true` }),
  (req, res) => {
    // ✅ Generate JWT Token for Google OAuth users
    const token = generateToken(req.user._id); // Generate JWT
    res.redirect(`${process.env.CLIENT_URL}/google-auth-success?token=${token}`);
  }
);

// ✅ Protected Routes
router.put("/update-profile", protectRoute, updateProfile);
router.get("/check", protectRoute, checkAuth);

// ✅ Logout Route - Clears Cookie Properly
router.post("/logout", (req, res) => {
  res.clearCookie("jwt", { httpOnly: true, sameSite: "Strict", secure: process.env.NODE_ENV === "production" });
  res.status(200).json({ message: "Logged out successfully" });
});

export default router;
