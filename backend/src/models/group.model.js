import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    groupImage: { type: String, default: null },
    isPrivate: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for faster queries
groupSchema.index({ members: 1 });
groupSchema.index({ name: 1 });
groupSchema.index({ creator: 1 });

const Group = mongoose.model("Group", groupSchema);
export default Group; 