import { Schema } from "mongoose";
import mongoose from "mongoose";

const messageReportSchema = new Schema(
  {
    message: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      required: true,
      index: true,
    },
    channel: {
      type: Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
      index: true,
    },
    reporter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reporterClerkId: {
      type: String,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed", "actioned"],
      default: "pending",
      index: true,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedByClerkId: {
      type: String,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolutionNote: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Prevent duplicate reports from the same user for the same message
messageReportSchema.index({ message: 1, reporterClerkId: 1 }, { unique: true });

export default mongoose.model("MessageReport", messageReportSchema);

