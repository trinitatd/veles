import express from "express";
import {
  getPosts,
  getPost,
  getMyPosts,
  getPostById,
  getPostsByAuthor,
  createPost,
  updatePost,
  deletePost,
  uploadAuth,
  featurePost,
  likePost,
  getLikedPosts,
  getSavedPostsDetailed,
  getReadlistPostsDetailed,
} from "../controllers/post.controller.js";
import increaseVisit from "../middlewares/increaseVisit.js";

const router = express.Router();

router.get("/upload-auth", uploadAuth);
router.get("/user/my-posts", getMyPosts);
router.get("/user/liked-posts", getLikedPosts);
router.get("/user/saved-posts", getSavedPostsDetailed);
router.get("/user/readlist-posts", getReadlistPostsDetailed);
router.get("/by-id/:id", getPostById);
router.get("/author/:username", getPostsByAuthor);
router.get("/", getPosts);
router.get("/:slug", increaseVisit, getPost);
router.post("/", createPost);
router.patch("/feature", featurePost);
router.patch("/:id/like", likePost);
router.patch("/:id", updatePost);
router.delete("/:id", deletePost);

export default router;
