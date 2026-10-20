import { Schema } from "mongoose";
import mongoose from "mongoose";

const messageSchema = new Schema(
  {
    channel: {
      type: Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderClerkId: {
      type: String,
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deletedByClerkId: {
      type: String,
      default: null,
    },
    deletionReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for querying chronological message stream in a channel
messageSchema.index({ channel: 1, createdAt: 1 });
messageSchema.index({ channel: 1, createdAt: -1 });

export default mongoose.model("Message", messageSchema);

