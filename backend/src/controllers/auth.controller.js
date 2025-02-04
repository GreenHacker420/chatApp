import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";
import Token from "../models/token.model.js";

export const signup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (!existingUser.verified) {
        // If user exists but is not verified, send verification email again
        let token = await Token.findOne({ userId: existingUser._id });

        if (!token) {
          token = new Token({
            userId: existingUser._id,
            token: crypto.randomBytes(32).toString("hex"),
          });
          await token.save();
        }

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

    // Hash Password & Create User
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      verified: false,
    });

    // Create Verification Token
    const token = await new Token({
      userId: newUser._id,
      token: crypto.randomBytes(32).toString("hex"),
    }).save();

    // Send Verification Email
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

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("🔍 Received login request:", { email, password }); // Debugging

    const user = await User.findOne({ email }).select("+password"); // ✅ Ensure password is retrieved

    if (!user) {
      console.log("❌ User not found for email:", email);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!user.password) {
      console.log("❌ User password is missing in database for:", email);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    if (!user.verified) {
      let token = await Token.findOneAndUpdate(
        { userId: user._id }, 
        { token: crypto.randomBytes(32).toString("hex") }, 
        { new: true, upsert: true } // Create a new token if not found
      );
    
      const url = `${process.env.BASE_URL}/verify/${user._id}/${token.token}`;
    
      try {
        await sendEmail({
          email: user.email,
          subject: "Email Confirmation",
          text: `Click here to verify your email: ${url}`,
        });
    
        return res.status(400).json({
          message: "Please verify your email. A new verification email has been sent.",
        });
      } catch (error) {
        console.error("❌ Error sending verification email:", error);
        return res.status(500).json({
          message: "Failed to send verification email. Please try again later.",
        });
      }
    }
    

    console.log("🔍 Comparing passwords...");
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    
    if (!isPasswordCorrect) {
      console.log("❌ Incorrect password for:", email);
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
    console.error("❌ Login Error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout Error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) return res.status(400).json({ message: "Profile picture is required" });

    const uploadResponse = await cloudinary.uploader.upload(profilePic, {
      folder: "profile_pics",
      allowed_formats: ["jpg", "png", "jpeg"],
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

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.error("CheckAuth Error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { id, token } = req.params;

    // Find token
    const tokenDoc = await Token.findOne({ userId: id, token });

    if (!tokenDoc) {
      return res.status(400).json({
        message: "Invalid or expired token. Please request a new verification email.",
      });
    }

    // Find the user
    const user = await User.findById(id);
    if (!user) {
      return res.status(400).json({ message: "User not found." });
    }

    if (user.verified) {
      return res.status(400).json({ message: "Email is already verified." });
    }

    // Verify user and delete token
    user.verified = true;
    await user.save();
    await Token.findByIdAndDelete(tokenDoc._id);

    // Redirect user to frontend
    const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
    res.redirect(`${CLIENT_URL}/login?verified=true`);
  } catch (error) {
    console.error("Email Verification Error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found." });
    }

    if (user.verified) {
      return res.status(400).json({ message: "Email is already verified." });
    }

    // Generate a new token
    let token = await Token.findOneAndUpdate(
      { userId: user._id },
      { token: crypto.randomBytes(32).toString("hex") },
      { new: true, upsert: true }
    );

    const url = `${process.env.BASE_URL}/verify/${user._id}/${token.token}`;

    await sendEmail({
      email: user.email,
      subject: "Resend Email Verification",
      html: `<p>Click the button below to verify your email:</p>
             <a href="${url}" style="padding: 10px; background: #007BFF; color: #fff; text-decoration: none; border-radius: 5px;">Verify Email</a>`
    });

    return res.status(200).json({
      message: "A new verification email has been sent.",
    });
  } catch (error) {
    console.error("Resend Email Error:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


