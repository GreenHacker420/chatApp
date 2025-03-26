// import mongoose from "mongoose";

// const Schema = mongoose.Schema;
// const tokenSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     token: {
//       type: String,
//       required: true,
//       unique: true, // ✅ Prevent duplicate tokens
//     },
//     tokenType: {
//       type: String,
//       enum: ["emailVerification", "passwordReset"], // ✅ Helps categorize tokens
//       required: true,
//     },
//     createdAt: {
//       type: Date,
//       default: Date.now,
//       expires: 3600, // ✅ Token expires after 1 hour
//     },
//   },
//   { timestamps: true } // ✅ Adds `createdAt` and `updatedAt`
// );

// const Token = mongoose.model("Token", tokenSchema);
// export default Token;

import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    tokenType: {
      type: String,
      enum: ["emailVerification", "passwordReset"],
      required: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // ✅ Token expires in 10 minutes
      required: true,
    },
  },
  { timestamps: true }
);

// ✅ Automatically delete expired tokens (TTL Index)
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 600 });

// ✅ Ensure a user cannot have multiple active tokens of the same type
tokenSchema.index({ userId: 1, tokenType: 1 }, { unique: true });

const Token = mongoose.model("Token", tokenSchema);
export default Token;

