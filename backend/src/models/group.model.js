import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      default: "",
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    admins: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    isPrivate: {
      type: Boolean,
      default: false,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
groupSchema.index({ name: "text" });
groupSchema.index({ members: 1 });
groupSchema.index({ creator: 1 });

// Methods
groupSchema.methods.isMember = function(userId) {
  return this.members.includes(userId);
};

groupSchema.methods.isAdmin = function(userId) {
  return this.admins.includes(userId);
};

groupSchema.methods.isCreator = function(userId) {
  return this.creator.toString() === userId.toString();
};

groupSchema.methods.canModify = function(userId) {
  return this.isAdmin(userId) || this.isCreator(userId);
};

const Group = mongoose.model("Group", groupSchema);

export default Group; 