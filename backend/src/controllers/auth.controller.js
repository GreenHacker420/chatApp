import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";
import Token from "../models/token.model.js";
import axios from "axios";
import config from "../config/env.js";

// Helper function to exchange authorization code for tokens
const exchangeCodeForTokens = async (code) => {
  try {
    console.log("🔹 Exchanging code for tokens");

    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
      code,
      client_id: config.GOOGLE.CLIENT_ID,
      client_secret: config.GOOGLE.CLIENT_SECRET,
      redirect_uri: 'postmessage', // Special value for client-side flow
      grant_type: 'authorization_code'
    });

    const response = await axios.post(tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    console.log("✅ Token exchange successful");
    return response.data;
  } catch (error) {
    console.error("❌ Token exchange error:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
};

// Helper function to fetch user info from Google
const fetchGoogleUserInfo = async (accessToken) => {
  try {
    console.log("🔹 Fetching user info from Google");

    const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    console.log("✅ User info fetched successfully");

    // Map Google response to our expected format
    return {
      email: response.data.email,
      name: response.data.name,
      picture: response.data.picture
    };
  } catch (error) {
    console.error("❌ Error fetching user info:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
};

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
    console.log("🔹 Login attempt for:", req.body.email);
    const { email, password } = req.body;

    // Find user by email with password included
    const user = await User.findOne({ email }).select("+password");

    // Check if user exists and has a password
    if (!user || !user.password) {
      console.log("❌ Login failed: Invalid credentials");
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // Check if email is verified
    if (!user.verified && !user.isGoogleAuth) {
      console.log("❌ Login failed: Email not verified");
      return res.status(400).json({ message: "Please verify your email before logging in." });
    }

    // Verify password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      console.log("❌ Login failed: Incorrect password");
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // Generate JWT token and set cookie
    const token = generateToken(user._id, res);
    console.log("✅ Login successful for:", user.email);
    console.log("✅ Token generated:", token ? "Success" : "Failed");

    // Log cookie details for debugging
    const cookieOptions = {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      path: "/",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      secure: process.env.NODE_ENV === "production"
    };
    console.log("✅ Cookie options:", JSON.stringify(cookieOptions));

    // Return user data (excluding sensitive information)
    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
      verified: user.verified || user.isGoogleAuth
    });
  } catch (error) {
    console.error("❌ Login Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Logout
export const logout = (req, res) => {
  try {
    console.log("🔹 Logout request received");

    // Clear the JWT cookie with proper options
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
      expires: new Date(0), // Immediate expiration
    });

    console.log("✅ User logged out successfully");
    res.status(200).json({ message: "Logged out successfully." });
  } catch (error) {
    console.error("❌ Logout Error:", error);
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
      return res.status(200).json(null);
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

// ✅ Change Password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters long." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("Change Password Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Update Password
export const updatePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.user._id;

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Update Password Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Delete Account
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    await User.findByIdAndDelete(userId);
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(0),
    });

    res.status(200).json({ message: "Account deleted successfully." });
  } catch (error) {
    console.error("Delete Account Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Get Profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Google Authentication
export const googleAuth = async (req, res) => {
  try {
    console.log("🔹 Google Auth Request Received");
    const { userData } = req.body;

    // Check if we received an authorization code
    if (userData && userData.code) {
      console.log("✅ Received Google authorization code");

      // Exchange the code for tokens
      const tokenResponse = await exchangeCodeForTokens(userData.code);

      if (!tokenResponse || !tokenResponse.access_token) {
        console.error("❌ Failed to exchange code for tokens");
        return res.status(400).json({ message: "Failed to authenticate with Google" });
      }

      // Get user info using the access token
      const userInfo = await fetchGoogleUserInfo(tokenResponse.access_token);

      if (!userInfo || !userInfo.email) {
        console.error("❌ Failed to fetch user info from Google");
        return res.status(400).json({ message: "Failed to get user information from Google" });
      }

      // Extract user information
      const { email, name, picture } = userInfo;

      // Check if user already exists
      let user = await User.findOne({ email });

      if (!user) {
        console.log("✅ Creating new user from Google auth:", email);
        // Create a new user if they don't exist
        user = await User.create({
          email,
          fullName: name,
          profilePic: picture || "https://res.cloudinary.com/dkd5jblv5/image/upload/v1675976806/Default_ProfilePic.png",
          verified: true,
          isGoogleAuth: true
        });
      } else {
        console.log("✅ Existing user found for Google auth:", email);
        // Update existing user with Google information if needed
        if (!user.isGoogleAuth) {
          user.isGoogleAuth = true;
          user.verified = true;
          if (!user.profilePic && picture) {
            user.profilePic = picture;
          }
          await user.save();
        }
      }

      // Generate JWT token and set cookie
      generateToken(user._id, res);

      // Return user data
      return res.status(200).json({
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profilePic: user.profilePic,
        verified: true
      });
    } else if (userData && userData.email) {
      // Legacy path for direct user data (if needed)
      console.log("⚠️ Using legacy path with direct user data");

      // Extract user information from Google data
      const { email, name, picture } = userData;

      // Check if user already exists
      let user = await User.findOne({ email });

      if (!user) {
        console.log("✅ Creating new user from Google auth:", email);
        // Create a new user if they don't exist
        user = await User.create({
          email,
          fullName: name,
          profilePic: picture || "https://res.cloudinary.com/dkd5jblv5/image/upload/v1675976806/Default_ProfilePic.png",
          verified: true,
          isGoogleAuth: true
        });
      } else {
        console.log("✅ Existing user found for Google auth:", email);
        // Update existing user with Google information if needed
        if (!user.isGoogleAuth) {
          user.isGoogleAuth = true;
          user.verified = true;
          if (!user.profilePic && picture) {
            user.profilePic = picture;
          }
          await user.save();
        }
      }

      // Generate JWT token and set cookie
      generateToken(user._id, res);

      // Return user data
      return res.status(200).json({
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        profilePic: user.profilePic,
        verified: true
      });
    } else {
      return res.status(400).json({ message: "Invalid Google authentication data" });
    }
  } catch (error) {
    console.error("❌ Google Auth Error:", error);
    res.status(500).json({ message: "Google authentication failed" });
  }
};

