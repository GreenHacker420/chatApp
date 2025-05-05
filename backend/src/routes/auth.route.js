import express from "express";
import passport from "passport";
import {
  checkAuth,
  login,
  logout,
  signup,
  updateProfile,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  updatePassword,
  deleteAccount,
  getProfile,
  googleAuth
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { rateLimiter, loginRateLimiter } from "../middleware/rateLimiter.middleware.js";
import { generateToken } from "../lib/utils.js";
import config from "../config/env.js";

const router = express.Router();

// Public routes
router.post("/signup", signup);
router.post("/login", loginRateLimiter, login);
router.post("/google-login", googleAuth);

// This should be protected but allow unauthenticated access
router.get("/check", (req, res, next) => {
  // If there's no user, just return null instead of 401
  if (!req.cookies?.jwt) {
    return res.status(200).json(null);
  }
  next();
}, checkAuth);

router.post("/resend-verification", rateLimiter, resendVerificationEmail);
router.get("/verify/:id/:token", verifyEmail);
router.post("/forgot-password", rateLimiter, forgotPassword);
router.post("/reset-password/:token", resetPassword);

// Protected routes
router.get("/profile", protectRoute, getProfile);
router.put("/profile", protectRoute, updateProfile);
router.post("/logout", protectRoute, logout);
router.put("/password", protectRoute, changePassword);
router.put("/update-password", protectRoute, updatePassword);
router.delete("/delete", protectRoute, deleteAccount);

// Google OAuth routes
router.get("/google", passport.authenticate("google", {
  scope: ["profile", "email"],
  prompt: "select_account"
}));

router.get("/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: config.isDevelopment
      ? "http://localhost:5173/login?error=google_auth_failed"
      : `${config.CLIENT.URL}/login?error=google_auth_failed`
  }),
  (req, res) => {
    if (!req.user) {
      const redirectUrl = config.isDevelopment
        ? "http://localhost:5173/login?error=OAuthFailed"
        : `${config.CLIENT.URL}/login?error=OAuthFailed`;
      return res.redirect(redirectUrl);
    }

    // Store JWT in HTTP-only cookie
    res.cookie("jwt", generateToken(req.user._id), {
      httpOnly: true,
      secure: !config.isDevelopment,
      sameSite: config.isDevelopment ? "lax" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to home page after successful login
    const successRedirect = config.isDevelopment
      ? "http://localhost:5173"
      : config.CLIENT.URL;

    console.log(`🔹 Auth success, redirecting to: ${successRedirect}`);
    res.redirect(successRedirect);
  }
);

// Google auth success endpoint for frontend to fetch user data
router.get("/google/success", protectRoute, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  res.status(200).json({
    user: {
      _id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      profilePic: req.user.profilePic,
      verified: req.user.verified || true
    }
  });
});

router.get("/test", protectRoute, (req, res) => {
  res.json({
    message: "Authentication successful!",
    user: req.user
  });
});

export default router;
