import { Schema } from "mongoose";
import mongoose from "mongoose";

const adminLogSchema = new Schema(
  {
    adminClerkId: {
      type: String,
      required: true,
    },
    adminUsername: {
      type: String,
      default: "Admin",
    },
    action: {
      type: String,
      required: true,
      enum: [
        "DELETE_POST",
        "UPDATE_POST",
        "FEATURE_POST",
        "UNFEATURE_POST",
        "DELETE_COMMENT",
        "UPDATE_COMMENT",
        "UPDATE_USER_ROLE",
        "DELETE_USER",
      ],
    },
    details: {
      type: String,
      required: true,
    },
    targetId: {
      type: String,
    },
    targetType: {
      type: String,
      enum: ["post", "comment", "user"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("AdminLog", adminLogSchema);
