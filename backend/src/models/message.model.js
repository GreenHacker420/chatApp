import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },
    content: { type: String, default: null }, // Primary field for message content
    text: { type: String, default: null }, // For backward compatibility
    image: { type: String, default: null },
    video: { type: String, default: null }, // ✅ Added missing video field
    isRead: { type: Boolean, default: false }, // ✅ Track read status
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Users who have deleted this message
    isDeletedForEveryone: { type: Boolean, default: false }, // Whether the message is deleted for everyone
  },
  { timestamps: true }
);

// ✅ Index for faster query performance
messageSchema.index({ createdAt: 1 }); // ✅ Index for sorting in pagination
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 }); // ✅ Compound index for chat queries
messageSchema.index({ receiverId: 1, isRead: 1 }); // ✅ Optimize unread messages lookup
messageSchema.index({ groupId: 1, createdAt: 1 }); // ✅ Added group index

const Message = mongoose.model("Message", messageSchema);
export default Message;
