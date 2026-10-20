import { Schema } from "mongoose";
import mongoose from "mongoose";

const channelJoinRequestSchema = new Schema(
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
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "cancelled"],
      default: "pending",
      index: true,
    },
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    respondedByClerkId: {
      type: String,
      default: null,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    note: {
      type: String,
      default: "",
      maxlength: 300,
    },
  },
  { timestamps: true }
);

// Indexes for fast lookup of active requests per channel & user
channelJoinRequestSchema.index({ channel: 1, clerkUserId: 1, status: 1 });
channelJoinRequestSchema.index({ channel: 1, status: 1, createdAt: -1 });

export default mongoose.model("ChannelJoinRequest", channelJoinRequestSchema);

