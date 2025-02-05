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
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6 || ["password", "123456", "qwerty"].includes(password)) {
      return res.status(400).json({ message: "Choose a stronger password (min 6 characters, no common passwords)." });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (!existingUser.verified) {
        await Token.findOneAndDelete({ userId: existingUser._id }); // ✅ Delete old token before creating a new one
        const token = await new Token({
          userId: existingUser._id,
          token: crypto.randomBytes(32).toString("hex"),
        }).save();

        const url = `${process.env.BASE_URL}/verify/${existingUser._id}/${token.token}`;
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

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      verified: false,
    });

    const token = await new Token({
      userId: newUser._id,
      token: crypto.randomBytes(32).toString("hex"),
    }).save();

    const url = `${process.env.BASE_URL}/verify/${newUser._id}/${token.token}`;
    await sendEmail({
      email: newUser.email,
      subject: "Email Confirmation",
      text: `Click here to verify your email: ${url}`,
    });

    res.status(201).json({ message: "Signup successful! Please check your email to verify your account." });
  } catch (error) {
    console.error("Signup Error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user || !user.password) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!user.verified) {
      await Token.findOneAndDelete({ userId: user._id }); // ✅ Delete old verification token
      const token = await new Token({
        userId: user._id,
        token: crypto.randomBytes(32).toString("hex"),
      }).save();

      const url = `${process.env.BASE_URL}/verify/${user._id}/${token.token}`;
      await sendEmail({
        email: user.email,
        subject: "Email Confirmation",
        text: `Click here to verify your email: ${url}`,
      });

      return res.status(400).json({ message: "Please verify your email. A new verification email has been sent." });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Logout
export const logout = (req, res) => {
  res.cookie("jwt", "", { maxAge: 0 });
  res.status(200).json({ message: "Logged out successfully" });
};

// ✅ Update Profile
export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) return res.status(400).json({ message: "Profile picture is required" });

    const uploadResponse = await cloudinary.uploader.upload(profilePic, {
      folder: "profile_pics",
      allowed_formats: ["jpg", "png", "jpeg"],
      transformation: [{ width: 500, height: 500, crop: "limit" }], // ✅ Prevent oversized images
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Profile Update Error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Check Authentication
export const checkAuth = (req, res) => {
  res.status(200).json(req.user);
};

// ✅ Verify Email
export const verifyEmail = async (req, res) => {
  try {
    const { id, token } = req.params;

    const tokenDoc = await Token.findOne({ userId: id, token });
    if (!tokenDoc) {
      return res.status(400).json({ message: "Invalid or expired token. Please request a new verification email." });
    }

    const user = await User.findById(id);
    if (!user || user.verified) {
      return res.status(400).json({ message: "User not found or already verified." });
    }

    user.verified = true;
    await user.save();
    await Token.findByIdAndDelete(tokenDoc._id);

    res.redirect(`${process.env.CLIENT_URL}/login?verified=true`);
  } catch (error) {
    console.error("Email Verification Error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Resend Verification Email (Limited to Once per 5 Min)
export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user || user.verified) {
      return res.status(400).json({ message: "User not found or already verified." });
    }

    const existingToken = await Token.findOne({ userId: user._id });
    if (existingToken && (Date.now() - existingToken.createdAt < 5 * 60 * 1000)) {
      return res.status(429).json({ message: "Please wait before requesting another verification email." });
    }

    await Token.findOneAndDelete({ userId: user._id });
    const token = await new Token({ userId: user._id, token: crypto.randomBytes(32).toString("hex") }).save();

    const url = `${process.env.BASE_URL}/verify/${user._id}/${token.token}`;
    await sendEmail({ email: user.email, subject: "Verify Your Email", text: `Click here: ${url}` });

    res.status(200).json({ message: "A new verification email has been sent." });
  } catch (error) {
    console.error("Resend Email Error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

