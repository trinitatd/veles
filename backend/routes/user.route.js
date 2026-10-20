import express from "express";
import {
  getUserSavedPosts,
  savePost,
  getUserProfile,
  updateUserProfile,
  getUserReadlist,
  toggleReadlist,
  getPublicUserProfile,
} from "../controllers/user.controller.js";

const router = express.Router();

router.get("/profile", getUserProfile);
router.patch("/profile", updateUserProfile);
router.get("/saved", getUserSavedPosts);
router.patch("/save", savePost);
router.get("/readlist", getUserReadlist);
router.patch("/readlist", toggleReadlist);
router.get("/by-username/:username", getPublicUserProfile);
router.get("/:username", getPublicUserProfile);

export default router; 