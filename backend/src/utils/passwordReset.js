import crypto from "crypto";
import bcrypt from "bcryptjs";
import Token from "../models/token.model.js";
import sendEmail from "../utils/sendEmail.js";

export const sendPasswordResetEmail = async (user) => {
  try {
    // Delete any existing password reset tokens
    await Token.deleteMany({ userId: user._id, tokenType: "passwordReset" });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = await bcrypt.hash(rawToken, 10);

    await new Token({
      userId: user._id,
      token: hashedToken,
      tokenType: "passwordReset",
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes expiration
    }).save();

    // Use CLIENT_URL for the frontend URL
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;
    
    // Send email with HTML content for better formatting
    await sendEmail({
      email: user.email,
      subject: "Password Reset Request",
      text: `Click here to reset your password: ${resetUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hello ${user.fullName},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${resetUrl}" 
               style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>This link will expire in 15 minutes.</p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            ${resetUrl}
          </p>
        </div>
      `
    });

    console.log("✅ Password reset email sent to:", user.email);
    return "Password reset email sent.";
  } catch (error) {
    console.error("❌ Password Reset Email Error:", error.message);
    throw new Error("Failed to send password reset email.");
  }
};
