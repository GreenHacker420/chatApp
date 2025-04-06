import crypto from "crypto";
import bcrypt from "bcryptjs";
import Token from "../models/token.model.js";
import sendEmail from "../utils/sendEmail.js";

export const sendPasswordResetEmail = async (user) => {
  try {
    await Token.findOneAndDelete({ userId: user._id, tokenType: "passwordReset" });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = await bcrypt.hash(rawToken, 10);

    await new Token({
      userId: user._id,
      token: hashedToken,
      tokenType: "passwordReset",
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes expiration
    }).save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;
    await sendEmail({
      email: user.email,
      subject: "Password Reset Request",
      text: `Click here to reset your password: ${resetUrl}`,
    });

    return "Password reset email sent.";
  } catch (error) {
    console.error("Password Reset Email Error:", error.message);
    throw new Error("Failed to send password reset email.");
  }
};
