import mongoose from "mongoose";

const Schema = mongoose.Schema;
const tokenSchema = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true, // ✅ Prevent duplicate tokens
    },
    tokenType: {
      type: String,
      enum: ["emailVerification", "passwordReset"], // ✅ Helps categorize tokens
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 3600, // ✅ Token expires after 1 hour
    },
  },
  { timestamps: true } // ✅ Adds `createdAt` and `updatedAt`
);

const Token = mongoose.model("Token", tokenSchema);
export default Token;
