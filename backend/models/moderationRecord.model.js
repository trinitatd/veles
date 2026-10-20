import { Schema } from "mongoose";
import mongoose from "mongoose";

const moderationRecordSchema = new Schema(
  {
    targetId: {
      type: String,
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["channel", "message", "member", "report", "request"],
      required: true,
      index: true,
    },
    channel: {
      type: Schema.Types.ObjectId,
      ref: "Channel",
      default: null,
      index: true,
    },
    moderator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    moderatorClerkId: {
      type: String,
      required: true,
      index: true,
    },
    moderatorRole: {
      type: String,
      enum: ["creator", "admin"],
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "DELETE_MESSAGE",
        "DELETE_CHANNEL",
        "REMOVE_MEMBER",
        "RESOLVE_REPORT",
        "DISMISS_REPORT",
        "ACCEPT_JOIN_REQUEST",
        "DECLINE_JOIN_REQUEST",
      ],
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
    details: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

moderationRecordSchema.index({ createdAt: -1 });

export default mongoose.model("ModerationRecord", moderationRecordSchema);

