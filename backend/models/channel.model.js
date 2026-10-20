import { Schema } from "mongoose";
import mongoose from "mongoose";

const channelSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    creatorClerkId: {
      type: String,
      required: true,
      index: true,
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "deleted"],
      default: "active",
      index: true,
    },
    memberCount: {
      type: Number,
      default: 1,
      min: 0,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    deletedAt: {
      type: Date,
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

// Compound index for fast queries
channelSchema.index({ status: 1, visibility: 1, lastActivityAt: -1 });

export default mongoose.model("Channel", channelSchema);

