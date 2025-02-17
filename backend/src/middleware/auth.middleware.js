import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      // ✅ Allow guest users when checking auth status
      req.user = null;
      return next();
    }

    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.tokenType || decoded.tokenType !== "auth") {
      return res.status(401).json({ message: "Token validation failed: tokenType is invalid or missing" });
    }

    // ✅ Find user
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user; // Attach user to request
    next();
  } catch (error) {
    console.error("❌ Token validation error:", error);
    req.user = null; // ✅ Allow frontend to detect unauthenticated state
    next();
  }
};
