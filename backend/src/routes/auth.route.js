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

const router = express.Router();

// ✅ Public Routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/verify/:id/:token", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);

// ✅ Google OAuth Routes
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
    "/google/callback",
    passport.authenticate("google", {
      failureRedirect: `${process.env.CLIENT_URL}/login?error=true`,
    }),
    (req, res) => {
      // ✅ Redirect user to a frontend page that will handle authentication
      res.redirect(`${process.env.CLIENT_URL}/google-auth-success`);
    }
  );
  
// ✅ Protected Routes
router.put("/update-profile", protectRoute, updateProfile);
router.get("/check", protectRoute, checkAuth);

export default router;
