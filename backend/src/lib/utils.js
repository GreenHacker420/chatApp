import jwt from "jsonwebtoken";

/**
 * ✅ Generates an authentication token & sets it as a cookie (if response object provided)
 * @param {string} userId - The ID of the authenticated user
 * @param {Object} res - Express response object (optional)
 * @param {string} expiresIn - Token expiration time (default: 7 days)
 * @returns {string} JWT token
 */
export const generateToken = (userId, res = null, expiresIn = "7d") => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn });

  // ✅ If a response object is provided, set the token in an HTTP-only cookie
  if (res) {
    res.cookie("jwt", token, {
      maxAge: expiresIn === "7d" ? 7 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000, // 7 days or 15 mins
      httpOnly: true, // ✅ Prevents XSS attacks
      sameSite: "Strict", // ✅ Protects against CSRF attacks
      secure: process.env.NODE_ENV === "production", // ✅ Use HTTPS in production
      domain: process.env.NODE_ENV === "production" ? ".yourdomain.com" : undefined, // ✅ Set domain in production
      path: "/", // ✅ Ensure the cookie is accessible on all routes
    });
  }

  return token;
};

/**
 * ✅ Generates a refresh token with a longer expiry (e.g., 30 days)
 * @param {string} userId - The ID of the user
 * @returns {string} Refresh JWT token
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.REFRESH_SECRET, { expiresIn: "30d" });
};
