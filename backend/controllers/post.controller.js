import ImageKit from "imagekit";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Comment from "../models/comment.model.js";
import { getOrSyncUser } from "../lib/userSync.js";
import { getClerkUserRole } from "../middlewares/requireAdmin.js";

export const getPosts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 2;

  const query = {};

  console.log(req.query);

  const cat = req.query.cat;
  const author = req.query.author;
  const searchQuery = req.query.search;
  const sortQuery = req.query.sort;
  const featured = req.query.featured;

  if (cat) {
    query.category = cat;
  }

  if (searchQuery) {
    query.title = { $regex: searchQuery, $options: "i" };
  }

  if (author) {
    const user = await User.findOne({
      username: { $regex: new RegExp(`^${author}$`, "i") },
    }).select("_id");

    if (!user) {
      return res.status(404).json("No post found!");
    }

    query.user = user._id;
  }

  let sortObj = { createdAt: -1 };

  if (sortQuery) {
    switch (sortQuery) {
      case "newest":
        sortObj = { createdAt: -1 };
        break;
      case "oldest":
        sortObj = { createdAt: 1 };
        break;
      case "popular":
        sortObj = { visit: -1 };
        break;
      case "trending":
        sortObj = { visit: -1 };
        query.createdAt = {
          $gte: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000),
        };
        break;
      default:
        break;
    }
  }

  if (featured) {
    query.isFeatured = true;
  }

  const posts = await Post.find(query)
    .populate("user", "username")
    .sort(sortObj)
    .limit(limit)
    .skip((page - 1) * limit);

  const totalPosts = await Post.countDocuments();
  const hasMore = page * limit < totalPosts;

  res.status(200).json({ posts, hasMore });
};

export const getPost = async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug }).populate(
    "user",
    "username img clerkUserId about"
  );
  res.status(200).json(post);
};

export const createPost = async (req, res) => {
  const clerkUserId = req.auth.userId;

  if (!clerkUserId) {
    return res.status(401).json("Not authenticated!");
  }

  const user = await getOrSyncUser(clerkUserId);

  if (!user) {
    return res.status(404).json("User not found!");
  }

  if (!req.body.title || !req.body.title.trim()) {
    return res.status(400).json("Title is required!");
  }

  let baseSlug = req.body.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!baseSlug) {
    baseSlug = `post-${Date.now()}`;
  }

  let slug = baseSlug;
  let existingPost = await Post.findOne({ slug });
  let counter = 2;

  while (existingPost) {
    slug = `${baseSlug}-${counter}`;
    existingPost = await Post.findOne({ slug });
    counter++;
  }

  const newPost = new Post({ user: user._id, slug, ...req.body });

  const post = await newPost.save();
  res.status(200).json(post);
};

export const deletePost = async (req, res) => {
  const clerkUserId = req.auth.userId;

  if (!clerkUserId) {
    return res.status(401).json("Not authenticated!");
  }

  const role = await getClerkUserRole(req);

  if (role === "admin") {
    await Post.findByIdAndDelete(req.params.id);
    await Comment.deleteMany({ post: req.params.id });
    return res.status(200).json("Post has been deleted");
  }

  const user = await getOrSyncUser(clerkUserId);

  if (!user) {
    return res.status(404).json("User not found!");
  }

  const deletedPost = await Post.findOneAndDelete({
    _id: req.params.id,
    user: user._id,
  });

  if (!deletedPost) {
    return res.status(403).json("You can delete only your posts!");
  }

  res.status(200).json("Post has been deleted");
};

export const featurePost = async (req, res) => {
  const clerkUserId = req.auth.userId;
  const postId = req.body.postId;

  if (!clerkUserId) {
    return res.status(401).json("Not authenticated!");
  }

  const role = await getClerkUserRole(req);

  if (role !== "admin") {
    return res.status(403).json("You cannot feature posts!");
  }

  const post = await Post.findById(postId);

  if (!post) {
    return res.status(404).json("Post not found!");
  }

  const isFeatured = post.isFeatured;

  const updatedPost = await Post.findByIdAndUpdate(
    postId,
    {
      isFeatured: !isFeatured,
    },
    { new: true }
  );

  res.status(200).json(updatedPost);
};

export const getMyPosts = async (req, res) => {
  const clerkUserId = req.auth.userId;

  if (!clerkUserId) {
    return res.status(401).json("Not authenticated!");
  }

  const user = await getOrSyncUser(clerkUserId);

  if (!user) {
    return res.status(404).json("User not found!");
  }

  const posts = await Post.find({ user: user._id })
    .populate("user", "username img clerkUserId about")
    .sort({ createdAt: -1 })
    .lean();

  const postIds = posts.map((p) => p._id);

  let countMap = {};
  if (postIds.length > 0) {
    const commentCounts = await Comment.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ]);

    commentCounts.forEach((c) => {
      countMap[c._id.toString()] = c.count;
    });
  }

  const postsWithCommentCount = posts.map((p) => ({
    ...p,
    commentCount: countMap[p._id.toString()] || 0,
  }));

  res.status(200).json(postsWithCommentCount);
};

export const getPostById = async (req, res) => {
  const post = await Post.findById(req.params.id).populate(
    "user",
    "username img clerkUserId about"
  );

  if (!post) {
    return res.status(404).json("Post not found!");
  }

  res.status(200).json(post);
};

export const updatePost = async (req, res) => {
  const clerkUserId = req.auth.userId;

  if (!clerkUserId) {
    return res.status(401).json("Not authenticated!");
  }

  const user = await getOrSyncUser(clerkUserId);

  if (!user) {
    return res.status(404).json("User not found!");
  }

  const role = await getClerkUserRole(req);
  const post = await Post.findById(req.params.id);

  if (!post) {
    return res.status(404).json("Post not found!");
  }

  if (post.user.toString() !== user._id.toString() && role !== "admin") {
    return res.status(403).json("You can edit only your posts!");
  }

  const { title, category, desc, content, img } = req.body;

  if (title && title.trim() && title.trim() !== post.title) {
    let baseSlug = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!baseSlug) {
      baseSlug = `post-${Date.now()}`;
    }

    let slug = baseSlug;
    let existingPost = await Post.findOne({ slug, _id: { $ne: post._id } });
    let counter = 2;

    while (existingPost) {
      slug = `${baseSlug}-${counter}`;
      existingPost = await Post.findOne({ slug, _id: { $ne: post._id } });
      counter++;
    }

    post.title = title.trim();
    post.slug = slug;
  }

  if (category) post.category = category;
  if (desc !== undefined) post.desc = desc;
  if (content !== undefined) post.content = content;
  if (img !== undefined) post.img = img;

  const updatedPost = await post.save();
  res.status(200).json(updatedPost);
};

const imagekit = new ImageKit({
  urlEndpoint: process.env.IK_URL_ENDPOINT,
  publicKey: process.env.IK_PUBLIC_KEY,
  privateKey: process.env.IK_PRIVATE_KEY,
});

export const uploadAuth = async (req, res) => {
  const result = imagekit.getAuthenticationParameters();
  res.send(result);
};

export const likePost = async (req, res) => {
  const clerkUserId = req.auth?.userId;
  const postId = req.params.id;

  if (!clerkUserId) {
    return res.status(401).json("Not authenticated!");
  }

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json("Post not found!");
  }

  const likes = post.likes || [];
  const isLiked = likes.includes(clerkUserId);

  if (isLiked) {
    await Post.findByIdAndUpdate(postId, {
      $pull: { likes: clerkUserId },
    });
  } else {
    await Post.findByIdAndUpdate(postId, {
      $addToSet: { likes: clerkUserId },
    });
  }

  const updatedPost = await Post.findById(postId);
  res.status(200).json({
    message: isLiked ? "Post unliked" : "Post liked",
    isLiked: !isLiked,
    likesCount: updatedPost.likes ? updatedPost.likes.length : 0,
    likes: updatedPost.likes || [],
  });
};

export const getLikedPosts = async (req, res) => {
  const clerkUserId = req.auth?.userId;
  if (!clerkUserId) {
    return res.status(401).json("Not authenticated!");
  }
  const posts = await Post.find({ likes: clerkUserId })
    .populate("user", "username img")
    .sort({ createdAt: -1 });
  res.status(200).json(posts);
};

export const getSavedPostsDetailed = async (req, res) => {
  const clerkUserId = req.auth?.userId;
  if (!clerkUserId) {
    return res.status(401).json("Not authenticated!");
  }
  const user = await getOrSyncUser(clerkUserId);
  if (!user) {
    return res.status(404).json("User not found!");
  }
  const posts = await Post.find({ _id: { $in: user.savedPosts || [] } })
    .populate("user", "username img")
    .sort({ createdAt: -1 });
  res.status(200).json(posts);
};

export const getReadlistPostsDetailed = async (req, res) => {
  const clerkUserId = req.auth?.userId;
  if (!clerkUserId) {
    return res.status(401).json("Not authenticated!");
  }
  const user = await getOrSyncUser(clerkUserId);
  if (!user) {
    return res.status(404).json("User not found!");
  }
  const posts = await Post.find({ _id: { $in: user.readlist || [] } })
    .populate("user", "username img")
    .sort({ createdAt: -1 });
  res.status(200).json(posts);
};
