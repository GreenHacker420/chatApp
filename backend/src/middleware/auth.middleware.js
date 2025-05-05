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

/**
 * Middleware to protect routes by verifying JWT token
 * Special handling for /check endpoint to support authentication status checks
 */
export const protectRoute = async (req, res, next) => {
  try {
    // Check if JWT cookie exists
    const token = req.cookies?.jwt;

    // Special handling for auth check endpoint
    const isCheckEndpoint = req.path === '/check' || req.path === '/google/success';

    if (!token) {
      if (isCheckEndpoint) {
        // For check endpoints, continue with null user instead of 401
        req.user = null;
        return next();
      }
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("✅ JWT verification successful for user:", decoded.userId);
    } catch (jwtError) {
      console.error("❌ JWT verification failed:", jwtError.message);

      // Clear invalid cookie
      res.clearCookie("jwt", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        path: "/"
      });
      console.log("✅ Cleared invalid JWT cookie");

      if (isCheckEndpoint) {
        req.user = null;
        return next();
      }
      return res.status(401).json({ message: "Invalid token" });
    }

    // Validate token type
    if (!decoded.tokenType || decoded.tokenType !== "auth") {
      if (isCheckEndpoint) {
        req.user = null;
        return next();
      }
      return res.status(401).json({ message: "Invalid token type" });
    }

    // Find the user
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      if (isCheckEndpoint) {
        req.user = null;
        return next();
      }
      return res.status(401).json({ message: "User not found" });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error("❌ Authentication error:", error.message);

    // Special handling for check endpoint
    if (req.path === '/check' || req.path === '/google/success') {
      req.user = null;
      return next();
    }

    return res.status(500).json({ message: "Authentication error" });
  }
};

// Alias for backward compatibility
export const protect = protectRoute;
