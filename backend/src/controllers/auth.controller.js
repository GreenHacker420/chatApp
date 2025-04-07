import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";
import Token from "../models/token.model.js";

// ✅ Sign Up
export const signup = async (req, res) => {
  try {
    console.log("🔹 Signup Request Received:", req.body);

    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (password.length < 8 || ["password", "12345678", "qwertyuiop"].includes(password.toLowerCase())) {
      return res.status(400).json({ message: "Choose a stronger password (min 8 characters, no common passwords)." });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log("⚠️ Existing User Found:", existingUser.email);

      if (!existingUser.verified) {
        console.log("🔄 Resending Verification Email");

        await Token.findOneAndDelete({ userId: existingUser._id });

        const rawToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = await bcrypt.hash(rawToken, 10);

        await new Token({
          userId: existingUser._id,
          token: hashedToken,
          tokenType: "emailVerification",
        }).save();

        const url = `${process.env.BASE_URL}/verify/${existingUser._id}/${rawToken}`;
        console.log("📩 Verification Email Sent to:", existingUser.email, "URL:", url);

        await sendEmail({
          email: existingUser.email,
          subject: "Email Confirmation",
          text: `Click here to verify your email: ${url}`,
        });

        return res.status(400).json({
          message: "This email is already registered but not verified. A new verification email has been sent.",
        });
      }

      return res.status(400).json({ message: "Email already exists and is verified." });
    }

    console.log("✅ Creating New User");

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      verified: false,
    });

    console.log("✅ User Created:", newUser._id);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = await bcrypt.hash(rawToken, 10);

    await new Token({
      userId: newUser._id,
      token: hashedToken,
      tokenType: "emailVerification",
    }).save();

    const url = `${process.env.BASE_URL}/verify/${newUser._id}/${rawToken}`;
    console.log("📩 Sending Verification Email to:", newUser.email, "URL:", url);

    await sendEmail({
      email: newUser.email,
      subject: "Email Confirmation",
      text: `Click here to verify your email: ${url}`,
    });

    res.status(201).json({ message: "Signup successful! Please check your email to verify your account." });
  } catch (error) {
    console.error("❌ Signup Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user || !user.password) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    if (!user.verified) {
      return res.status(400).json({ message: "Please verify your email before logging in." });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Logout
export const logout = (req, res) => {
  try {
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(0),
    });

    res.status(200).json({ message: "Logged out successfully." });
  } catch (error) {
    console.error("Logout Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Update Profile (with Cloudinary Image Upload)
export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ message: "Profile picture is required." });
    }

    const uploadResponse = await cloudinary.uploader.upload(profilePic, {
      folder: "profile_pics",
      allowed_formats: ["jpg", "png", "jpeg"],
      transformation: [{ width: 500, height: 500, crop: "limit" }],
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Check Authentication
export const checkAuth = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated." });
    }

    res.status(200).json(req.user);
  } catch (error) {
    console.error("CheckAuth Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Resend Verification Email
export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.verified) {
      return res.status(400).json({ message: "User not found or already verified." });
    }

    await Token.findOneAndDelete({ userId: user._id });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = await bcrypt.hash(rawToken, 10);

    await new Token({
      userId: user._id,
      token: hashedToken,
      tokenType: "emailVerification",
    }).save();

    const url = `${process.env.BASE_URL}/verify/${user._id}/${rawToken}`;
    await sendEmail({ email: user.email, subject: "Verify Your Email", text: `Click here: ${url}` });

    res.status(200).json({ message: "A new verification email has been sent." });
  } catch (error) {
    console.error("Resend Email Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Verify Email
export const verifyEmail = async (req, res) => {
  try {
    const { id, token } = req.params;
    const tokenDoc = await Token.findOne({ userId: id });

    if (!tokenDoc || !(await bcrypt.compare(token, tokenDoc.token))) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    const user = await User.findById(id);
    user.verified = true;
    await user.save();
    await Token.findByIdAndDelete(tokenDoc._id);

    res.redirect(`${process.env.CLIENT_URL}/login?verified=true`);
  } catch (error) {
    console.error("Email Verification Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found." });
    }

    // Delete any existing password reset token
    await Token.findOneAndDelete({ userId: user._id, tokenType: "passwordReset" });

    // Generate a new token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = await bcrypt.hash(rawToken, 10);

    await new Token({
      userId: user._id,
      token: hashedToken,
      tokenType: "passwordReset",
      expiresAt: Date.now() + 15 * 60 * 1000, // Expires in 15 minutes
    }).save();

    // Send email
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;
    await sendEmail({
      email: user.email,
      subject: "Password Reset Request",
      text: `Click here to reset your password: ${resetUrl}`,
    });

    res.status(200).json({ message: "Password reset email sent." });
  } catch (error) {
    console.error("Forgot Password Error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    // Find token and validate
    const tokenDoc = await Token.findOne({ tokenType: "passwordReset" });
    if (!tokenDoc) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    const isValid = await bcrypt.compare(token, tokenDoc.token);
    if (!isValid) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    // Update user password
    const user = await User.findById(tokenDoc.userId);
    if (!user) {
      return res.status(400).json({ message: "User not found." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    await Token.findByIdAndDelete(tokenDoc._id);

    res.status(200).json({ message: "Password reset successful." });
  } catch (error) {
    console.error("Reset Password Error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

