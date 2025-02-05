import mongoose from "mongoose";
import validator from "validator"; // ✅ Using validator.js for better validation

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, "Invalid email format"], // ✅ More accurate email validation
      index: true,
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [3, "Full name must be at least 3 characters long"],
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // ✅ Do not return password by default
      required: function () {
        return !this.isGoogleAuth; // ✅ Password is required ONLY if the user is NOT a Google user
      },
      validate: {
        validator: function (value) {
          return !validator.isIn(value, ["password", "123456", "qwerty"]); // ✅ Prevents weak passwords
        },
        message: "Choose a stronger password.",
      },
    },
    profilePic: {
      type: String,
      default: "",
    },
    verified: {
      type: Boolean,
      default: false,
    },
    isGoogleAuth: {
      type: Boolean,
      default: false, // ✅ New field to track Google users
    },
  },
  { timestamps: true }
);

// ✅ Ensure Google users do not have required password validation
userSchema.pre("validate", function (next) {
  if (this.isGoogleAuth) {
    this.password = undefined; // ✅ Prevents validation error for Google users
  }
  next();
});

// ✅ Indexing for faster queries
userSchema.index({ email: 1, isGoogleAuth: 1 }, { unique: true }); // ✅ Prevent duplicate Google and email users

const User = mongoose.model("User", userSchema);

export default User;
