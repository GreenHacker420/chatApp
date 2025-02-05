import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: null }, // ✅ Default to null for better structure
    image: { type: String, default: null },
    video: { type: String, default: null }, // ✅ Added missing video field
    isRead: { type: Boolean, default: false }, // ✅ Track read status
  },
  { timestamps: true }
);

// ✅ Index for faster query performance
messageSchema.index({ createdAt: 1 }); // ✅ Index for sorting in pagination
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 }); // ✅ Compound index for chat queries
messageSchema.index({ receiverId: 1, isRead: 1 }); // ✅ Optimize unread messages lookup

const Message = mongoose.model("Message", messageSchema);
export default Message;
