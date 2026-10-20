import { Schema } from "mongoose";
import mongoose from "mongoose";

const channelMemberSchema = new Schema(
  {
    channel: {
      type: Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clerkUserId: {
      type: String,
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["creator", "member"],
      default: "member",
    },
    status: {
      type: String,
      enum: ["active", "removed", "left"],
      default: "active",
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index to guarantee uniqueness per user and channel
channelMemberSchema.index({ channel: 1, clerkUserId: 1 }, { unique: true });
channelMemberSchema.index({ clerkUserId: 1, status: 1 });

export default mongoose.model("ChannelMember", channelMemberSchema);

