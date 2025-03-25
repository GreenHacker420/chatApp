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

export const generateToken = (userId, res) => {
  try {
    console.log("🔹 Generating Token for User:", userId);

    const token = jwt.sign(
      { userId, tokenType: "auth" }, 
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("✅ Token Generated:", token);

    // ✅ Ensure res is provided, then set the cookie
    if (res) {
      res.cookie("jwt", token, {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });
    }

    return token; // Still return the token if needed
  } catch (error) {
    console.error("❌ Error generating token:", error.message);
    if (res) res.status(500).json({ message: "Token generation failed" });
    return null;
  }
};
