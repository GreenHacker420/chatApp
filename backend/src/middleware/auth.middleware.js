// import jwt from "jsonwebtoken";
// import User from "../models/user.model.js";

// export const protectRoute = async (req, res, next) => {
//   try {
//     const token = req.cookies.jwt;

//     if (!token) {
//       // ✅ Allow guest users when checking auth status
//       req.user = null;
//       return next();
//     }

//     // ✅ Verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     if (!decoded.tokenType || decoded.tokenType !== "auth") {
//       return res.status(401).json({ message: "Token validation failed: tokenType is invalid or missing" });
//     }

//     // ✅ Find user
//     const user = await User.findById(decoded.userId).select("-password");

//     if (!user) {
//       return res.status(401).json({ message: "User not found" });
//     }

//     req.user = user; // Attach user to request
//     next();
//   } catch (error) {
//     console.error("❌ Token validation error:", error);
//     req.user = null; // ✅ Allow frontend to detect unauthenticated state
//     next();
//   }
// };


import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies?.jwt; // ✅ Ensure cookies exist before accessing

    if (!token) {
      // For the check endpoint, return null instead of 401
      if (req.path === '/check') {
        req.user = null;
        return next();
      }
      return res.status(401).json({ message: "Not authenticated" }); // ✅ Properly return 401 Unauthorized
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

    req.user = user; // ✅ Attach user to request
    next();
  } catch (error) {
    console.error("❌ Token validation error:", error.message);
    // For the check endpoint, return null instead of 401
    if (req.path === '/check') {
      req.user = null;
      return next();
    }
    return res.status(401).json({ message: "Unauthorized" }); // ✅ Ensure proper 401 response
  }
};

// Alias for backward compatibility
export const protect = protectRoute;
