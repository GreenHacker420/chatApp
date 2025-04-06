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
  forgotPassword,
  resetPassword
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { rateLimit } from "express-rate-limit"; // ✅ Prevents spam on email verification
import { generateToken } from "../lib/utils.js"; // ✅ Ensure correct path


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

// ✅ Forgot Password
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// ✅ Google OAuth Routes
router.get("/google", passport.authenticate("google", { scope: ["openid", "profile", "email"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=true` }),
  (req, res) => {
    if (!req.user) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=OAuthFailed`);
    }

    // ✅ Store JWT in HTTP-only cookie
    res.cookie("jwt", generateToken(req.user._id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.redirect(`${process.env.CLIENT_URL}/google-auth-success`);
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
