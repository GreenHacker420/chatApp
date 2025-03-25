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
    const token = req.cookies.jwt; // ✅ Read token from HTTP-only cookie

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || decoded.tokenType !== "auth") {
      return res.status(401).json({ message: "Invalid token" });
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user; // ✅ Attach user to request
    next();
  } catch (error) {
    console.error("❌ Token validation error:", error.message);
    res.status(401).json({ message: "Unauthorized" });
  }
};
