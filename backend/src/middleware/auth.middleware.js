import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    // ✅ Check token in both cookies and headers
    const token = req.cookies?.jwt || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No token provided" });
    }

    try {
      // ✅ Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!decoded || !decoded.userId) {
        return res.status(401).json({ message: "Unauthorized - Invalid token" });
      }

      // ✅ Fetch user & exclude password
      const user = await User.findById(decoded.userId).select("-password");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.verified) {
        return res.status(403).json({ message: "Access denied. Please verify your email first." });
      }

      // ✅ Prevent access if the user is deactivated (optional feature)
      if (user.isDisabled) {
        return res.status(403).json({ message: "Your account has been disabled. Contact support." });
      }

      req.user = user;
      next();
    } catch (err) {
      console.error("JWT Verification Error:", err.message);
      
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Session expired. Please log in again." });
      }
      
      return res.status(401).json({ message: "Invalid token. Authentication failed." });
    }
  } catch (error) {
    console.error("Error in protectRoute middleware:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
