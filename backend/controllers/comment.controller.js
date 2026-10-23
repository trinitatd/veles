import Comment from "../models/comment.model.js";
import User from "../models/user.model.js";
import { getOrSyncUser } from "../lib/userSync.js";
import { getClerkUserRole } from "../middlewares/requireAdmin.js";

export const getPostComments = async (req, res) => {
  const comments = await Comment.find({ post: req.params.postId })
    .populate("user", "username img clerkUserId")
    .sort({ createdAt: -1 });

  res.json(comments);
};

export const addComment = async (req, res) => {
  const clerkUserId = req.auth.userId;
  const postId = req.params.postId;

  if (!clerkUserId) {
    return res.status(401).json("Not authenticated!");
  }

  const user = await getOrSyncUser(clerkUserId);

  if (!user) {
    return res.status(404).json("User not found!");
  }

  const newComment = new Comment({
    ...req.body,
    user: user._id,
    post: postId,
  });

  const savedComment = await newComment.save();
  const populatedComment = await Comment.findById(savedComment._id).populate(
    "user",
    "username img clerkUserId"
  );

  res.status(201).json(populatedComment);
};

export const deleteComment = async (req, res) => {
  const clerkUserId = req.auth?.userId;
  const id = req.params.id;

  if (!clerkUserId) {
    return res.status(401).json("Not authenticated!");
  }

  const role = await getClerkUserRole(req);

  if (role === "admin") {
    const deleted = await Comment.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json("Comment not found!");
    }
    return res.status(200).json("Comment has been deleted");
  }

  const user = await getOrSyncUser(clerkUserId);
  if (!user) {
    return res.status(404).json("User not found!");
  }

  const comment = await Comment.findById(id).populate("post");
  if (!comment) {
    return res.status(404).json("Comment not found!");
  }

  const isCommentOwner = comment.user.toString() === user._id.toString();
  const isPostAuthor =
    comment.post && comment.post.user.toString() === user._id.toString();

  // DELETE: Comment owner OR post author (or admin)
  if (!isCommentOwner && !isPostAuthor && role !== "admin") {
    return res
      .status(403)
      .json("You can delete only your own comment or comments on your own post!");
  }

  await Comment.findByIdAndDelete(id);
  res.status(200).json("Comment deleted");
};

export const updateComment = async (req, res) => {
  const clerkUserId = req.auth?.userId;
  const id = req.params.id;

  if (!clerkUserId) {
    return res.status(401).json("Not authenticated!");
  }

  const desc = req.body?.desc;
  if (!desc || !desc.trim()) {
    return res.status(400).json("Comment description cannot be empty!");
  }

  const role = await getClerkUserRole(req);

  const user = await getOrSyncUser(clerkUserId);
  if (!user) {
    return res.status(404).json("User not found!");
  }

  const comment = await Comment.findById(id).populate("post");
  if (!comment) {
    return res.status(404).json("Comment not found!");
  }

  const isCommentOwner = comment.user.toString() === user._id.toString();
  const isAdmin = role === "admin";

  // EDIT: ONLY the comment owner can edit
  // Being the post author does NOT grant permission to edit other users' comments
  if (!isCommentOwner) {
    return res
      .status(403)
      .json("You can edit only your own comment!");
  }

  comment.desc = desc.trim();
  await comment.save();

  const populatedComment = await Comment.findById(id).populate(
    "user",
    "username img clerkUserId"
  );
  res.status(200).json(populatedComment);
};
