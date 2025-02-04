import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    httpOnly: true, // Prevents XSS attacks
    sameSite: "strict", // Protects against CSRF attacks
    secure: process.env.NODE_ENV === "production", // Ensure HTTPS in production
    domain: process.env.NODE_ENV === "production" ? ".yourdomain.com" : undefined, // Set domain in production
    path: "/", // Make sure the cookie is accessible on all routes
  });

  return token;
};
