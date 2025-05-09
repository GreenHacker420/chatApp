// import jwt from "jsonwebtoken";

// export const generateToken = (userId, res) => {
//   try {
//     const token = jwt.sign(
//       { userId, tokenType: "auth" }, // ✅ Ensures tokenType is included
//       process.env.JWT_SECRET,
//       { expiresIn: "7d" }
//     );

//     res.cookie("jwt", token, {
//       maxAge: 7 * 24 * 60 * 60 * 1000, // ✅ 7 days in milliseconds
//       httpOnly: true, // ✅ Prevents XSS attacks
//       sameSite: "strict", // ✅ Protects against CSRF attacks
//       secure: process.env.NODE_ENV === "production", // ✅ Use HTTPS in production
//       path: "/", // ✅ Cookie accessible across all routes
//     });

//     return token;
//   } catch (error) {
//     console.error("❌ Error generating token:", error.message);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// import jwt from "jsonwebtoken";

// export const generateToken = (userId, res = null) => {
//   try {
//     console.log("🔹 Generating Token for User:", userId);

//     const token = jwt.sign(
//       { userId, tokenType: "auth" },
//       process.env.JWT_SECRET,
//       { expiresIn: "7d" }
//     );

//     console.log("✅ Token Generated:", token.slice(0, 10) + "... (truncated)");

//     // ✅ Only set a cookie if `res` is provided
//     if (res) {
//       res.cookie("jwt", token, {
//         expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "strict",
//         path: "/",
//       });
//       return token;
//     }

//     // ✅ Return token directly if `res` is not provided (for OAuth)
//     return token;
//   } catch (error) {
//     console.error("❌ Error generating token:", error.message);

//     // ✅ Prevent crashing when `res` is not available
//     if (res) {
//       res.status(500).json({ message: "Token generation failed" });
//     }

//     return null;
//   }
// };


import jwt from "jsonwebtoken";

/**
 * Generate a JWT token and set it as an HTTP-only cookie
 * @param {string} userId - User ID to include in the token
 * @param {object} res - Express response object (optional)
 * @returns {string} - The generated token
 */
export const generateToken = (userId, res) => {
  try {
    console.log("🔹 Generating Token for User:", userId);

    // Create token with user ID and token type
    const token = jwt.sign(
      { userId, tokenType: "auth" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set cookie if response object is provided
    if (res) {
      const cookieOptions = {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        path: "/",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        secure: process.env.NODE_ENV === "production"
      };

      res.cookie("jwt", token, cookieOptions);
      console.log("✅ Cookie set with token");
    }

    return token;
  } catch (error) {
    console.error("❌ Error generating token:", error.message);
    if (res) res.status(500).json({ message: "Token generation failed" });
    return null;
  }
};
