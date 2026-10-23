import mongoose from "mongoose";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Comment from "../models/comment.model.js";
import AdminLog from "../models/adminLog.model.js";
import Channel from "../models/channel.model.js";
import Message from "../models/message.model.js";
import MessageReport from "../models/messageReport.model.js";
import ModerationRecord from "../models/moderationRecord.model.js";
import { getIO } from "../socket.js";
import { clerkClient } from "@clerk/express";
import { getOrSyncUser } from "../lib/userSync.js";

// Helper to log administrative actions
const recordAdminLog = async (req, action, details, targetId = null, targetType = null) => {
  try {
    const clerkUserId = req.auth?.userId;
    let adminUsername = "Admin";
    if (clerkUserId) {
      const user = await User.findOne({ clerkUserId }).select("username");
      if (user?.username) {
        adminUsername = user.username;
      }
    }

    await AdminLog.create({
      adminClerkId: clerkUserId || "unknown",
      adminUsername,
      action,
      details,
      targetId: targetId ? targetId.toString() : null,
      targetType,
    });
  } catch (err) {
    console.error("Failed to record admin log:", err.message);
  }
};

/**
 * GET /admin/stats
 * Platform-wide statistics using MongoDB aggregation pipelines
 */
export const getAdminStats = async (req, res, next) => {
  try {
    const [totalUsers, totalPosts, totalComments] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Comment.countDocuments(),
    ]);

    // Aggregate total views across all posts
    const viewResult = await Post.aggregate([
      { $group: { _id: null, totalViews: { $sum: "$visit" } } },
    ]);
    const totalViews = viewResult[0]?.totalViews || 0;

    // Aggregate total likes across all posts
    const likeResult = await Post.aggregate([
      {
        $project: {
          likeCount: { $size: { $ifNull: ["$likes", []] } },
        },
      },
      { $group: { _id: null, totalLikes: { $sum: "$likeCount" } } },
    ]);
    const totalLikes = likeResult[0]?.totalLikes || 0;

    // Category distribution across all posts
    const categoryCounts = await Post.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const knownCategories = [
      { slug: "web-design", label: "Web Design" },
      { slug: "ai_ml", label: "AI & ML" },
      { slug: "databases", label: "Databases" },
      { slug: "seo", label: "SEO" },
      { slug: "devops", label: "DevOps" },
      { slug: "general", label: "General" },
    ];

    const countByCat = {};
    categoryCounts.forEach((c) => {
      if (c._id) {
        countByCat[c._id] = c.count;
      }
    });

    const categoryDistribution = knownCategories.map((kc) => {
      const count = countByCat[kc.slug] || 0;
      const percentage =
        totalPosts > 0 ? Math.round((count / totalPosts) * 100) : 0;
      return {
        slug: kc.slug,
        label: kc.label,
        count,
        percentage,
      };
    });

    // Recent articles (latest 6)
    const recentPosts = await Post.find()
      .populate("user", "username img email")
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    // Attach comment counts to recent articles
    const postIds = recentPosts.map((p) => p._id);
    if (postIds.length > 0) {
      const commentCounts = await Comment.aggregate([
        { $match: { post: { $in: postIds } } },
        { $group: { _id: "$post", count: { $sum: 1 } } },
      ]);
      const commentMap = {};
      commentCounts.forEach((c) => {
        commentMap[c._id.toString()] = c.count;
      });
      recentPosts.forEach((p) => {
        p.commentCount = commentMap[p._id.toString()] || 0;
        p.likesCount = p.likes ? p.likes.length : 0;
      });
    }

    // Recent admin activity logs
    const recentLogs = await AdminLog.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    res.status(200).json({
      totalUsers,
      totalPosts,
      totalComments,
      totalViews,
      totalLikes,
      categoryDistribution,
      recentPosts,
      recentLogs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /admin/posts
 * Paginated list of all posts with search, category & featured filters, sorting
 */
export const getAdminPosts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
    const search = req.query.search?.trim();
    const category = req.query.cat || req.query.category;
    const featured = req.query.featured;
    const sort = req.query.sort || "newest";

    const query = {};

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    if (category && category !== "all") {
      query.category = category;
    }

    if (featured === "true") {
      query.isFeatured = true;
    } else if (featured === "false") {
      query.isFeatured = false;
    }

    let sortObj = { createdAt: -1 };
    switch (sort) {
      case "oldest":
        sortObj = { createdAt: 1 };
        break;
      case "popular":
        sortObj = { visit: -1 };
        break;
      case "newest":
      default:
        sortObj = { createdAt: -1 };
        break;
    }

    const totalPosts = await Post.countDocuments(query);
    const posts = await Post.find(query)
      .populate("user", "username img email clerkUserId")
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const postIds = posts.map((p) => p._id);
    if (postIds.length > 0) {
      const commentCounts = await Comment.aggregate([
        { $match: { post: { $in: postIds } } },
        { $group: { _id: "$post", count: { $sum: 1 } } },
      ]);
      const commentMap = {};
      commentCounts.forEach((c) => {
        commentMap[c._id.toString()] = c.count;
      });
      posts.forEach((p) => {
        p.commentCount = commentMap[p._id.toString()] || 0;
        p.likesCount = p.likes ? p.likes.length : 0;
      });
    }

    res.status(200).json({
      posts,
      totalPosts,
      page,
      totalPages: Math.ceil(totalPosts / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /admin/posts/:id
 * Admin edit post (disabled)
 */
export const updateAdminPost = async (req, res) => {
  return res.status(403).json("Editing posts is disabled for administrators.");
};

/**
 * DELETE /admin/posts/:id
 * Admin delete any post on the platform with associated comments cleanup
 */
export const deleteAdminPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json("Post not found!");
    }

    const postTitle = post.title;
    await Post.findByIdAndDelete(id);
    await Comment.deleteMany({ post: id });

    await recordAdminLog(
      req,
      "DELETE_POST",
      `Deleted article "${postTitle}" and its comments`,
      id,
      "post"
    );

    res.status(200).json({ message: "Post has been deleted by admin" });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /admin/posts/:id/featured (or PATCH /admin/posts/:id/feature)
 * Toggle or explicitly set featured status of any post
 */
export const featureAdminPost = async (req, res, next) => {
  try {
    const id = req.params.id || req.body.postId;
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json("Post not found!");
    }

    const newFeaturedState =
      req.body.isFeatured !== undefined
        ? Boolean(req.body.isFeatured)
        : !post.isFeatured;

    post.isFeatured = newFeaturedState;
    const updatedPost = await post.save();

    await recordAdminLog(
      req,
      newFeaturedState ? "FEATURE_POST" : "UNFEATURE_POST",
      `${newFeaturedState ? "Featured" : "Unfeatured"} article "${post.title}"`,
      post._id,
      "post"
    );

    res.status(200).json(updatedPost);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /admin/comments
 * Paginated list of comments across the platform with search & post filtering
 */
export const getAdminComments = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
    const search = req.query.search?.trim();
    const postId = req.query.postId;

    const query = {};

    if (search) {
      query.desc = { $regex: search, $options: "i" };
    }

    if (postId) {
      query.post = postId;
    }

    const totalComments = await Comment.countDocuments(query);
    const comments = await Comment.find(query)
      .populate("user", "username img email clerkUserId")
      .populate("post", "title slug isFeatured")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.status(200).json({
      comments,
      totalComments,
      page,
      totalPages: Math.ceil(totalComments / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /admin/comments/:id
 * Admin edit comment (disabled)
 */
export const updateAdminComment = async (req, res) => {
  return res.status(403).json("Editing comments is disabled for administrators.");
};

/**
 * DELETE /admin/comments/:id
 * Admin delete any comment on the platform
 */
export const deleteAdminComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findById(id).populate("post", "title");

    if (!comment) {
      return res.status(404).json("Comment not found!");
    }

    const postTitle = comment.post?.title || "article";
    await Comment.findByIdAndDelete(id);

    await recordAdminLog(
      req,
      "DELETE_COMMENT",
      `Deleted comment on "${postTitle}"`,
      id,
      "comment"
    );

    res.status(200).json({ message: "Comment has been deleted by admin" });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /admin/users
 * Paginated list of users with article count, comment count, and Clerk role
 */
export const getAdminUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
    const search = req.query.search?.trim();

    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const userIds = users.map((u) => u._id);
    const clerkUserIds = users.map((u) => u.clerkUserId).filter(Boolean);

    // Aggregate article counts for these users
    const postCounts = await Post.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: "$user", count: { $sum: 1 } } },
    ]);
    const postCountMap = {};
    postCounts.forEach((p) => {
      postCountMap[p._id.toString()] = p.count;
    });

    // Aggregate comment counts for these users
    const commentCounts = await Comment.aggregate([
      { $match: { user: { $in: userIds } } },
      { $group: { _id: "$user", count: { $sum: 1 } } },
    ]);
    const commentCountMap = {};
    commentCounts.forEach((c) => {
      commentCountMap[c._id.toString()] = c.count;
    });

    // Fetch roles from Clerk for these clerkUserIds
    const roleMap = {};
    if (clerkUserIds.length > 0) {
      try {
        const clerkUsers = await clerkClient.users.getUserList({
          userId: clerkUserIds,
          limit: 100,
        });
        clerkUsers.data.forEach((cu) => {
          roleMap[cu.id] =
            cu.publicMetadata?.role || cu.privateMetadata?.role || "user";
        });
      } catch (err) {
        console.error("Error fetching Clerk user roles in getAdminUsers:", err.message);
      }
    }

    const enrichedUsers = users.map((u) => ({
      _id: u._id,
      clerkUserId: u.clerkUserId,
      username: u.username,
      email: u.email,
      img: u.img,
      createdAt: u.createdAt,
      about: u.about || "",
      articlesCount: postCountMap[u._id.toString()] || 0,
      commentsCount: commentCountMap[u._id.toString()] || 0,
      role: roleMap[u.clerkUserId] || "user",
    }));

    res.status(200).json({
      users: enrichedUsers,
      totalUsers,
      page,
      totalPages: Math.ceil(totalUsers / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /admin/users/:id/role
 * Admin update user role in Clerk public metadata
 */
export const updateAdminUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || (role !== "admin" && role !== "user")) {
      return res.status(400).json("Role must be 'admin' or 'user'");
    }

    // Lookup user in Mongo by _id or clerkUserId
    let user = null;
    if (id.startsWith("user_")) {
      user = await User.findOne({ clerkUserId: id });
    } else {
      user = await User.findById(id);
    }

    if (!user) {
      return res.status(404).json("User not found!");
    }

    const requestingClerkId = req.auth?.userId;
    if (user.clerkUserId === requestingClerkId && role !== "admin") {
      return res
        .status(400)
        .json("You cannot demote your own administrator account!");
    }

    // Update role in Clerk user publicMetadata
    await clerkClient.users.updateUserMetadata(user.clerkUserId, {
      publicMetadata: {
        role,
      },
    });

    await recordAdminLog(
      req,
      "UPDATE_USER_ROLE",
      `Changed role for @${user.username} to ${role}`,
      user._id,
      "user"
    );

    res.status(200).json({
      message: `User role successfully updated to ${role}`,
      userId: user._id,
      clerkUserId: user.clerkUserId,
      role,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /admin/users/:id
 * Admin removes a user across platforms (Clerk auth platform + local database)
 * Their activities (posts, comments, messages, channels) are preserved.
 */
export const deleteAdminUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Lookup user in Mongo by _id or clerkUserId
    let user = null;
    if (id.startsWith("user_")) {
      user = await User.findOne({ clerkUserId: id });
    } else if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id);
    }
    if (!user) {
      user = await User.findOne({ clerkUserId: id });
    }

    if (!user) {
      return res.status(404).json("User not found!");
    }

    const requestingClerkId = req.auth?.userId;
    if (user.clerkUserId === requestingClerkId) {
      return res
        .status(400)
        .json("You cannot delete your own administrator account!");
    }

    const username = user.username;
    const clerkUserId = user.clerkUserId;
    const userId = user._id;

    // 1. Remove user from Clerk (the external authentication platform)
    if (clerkUserId) {
      try {
        await clerkClient.users.deleteUser(clerkUserId);
      } catch (clerkErr) {
        console.warn(
          `Clerk deleteUser note for ${clerkUserId}:`,
          clerkErr?.message || clerkErr
        );
      }
    }

    // 2. Remove user from MongoDB (local database platform)
    await User.findByIdAndDelete(userId);

    // 3. User activities (posts, comments, channels, messages) are preserved:
    // We intentionally DO NOT delete Post, Comment, Channel, or Message records.

    // 4. Record administrative audit log
    await recordAdminLog(
      req,
      "DELETE_USER",
      `Removed user @${username} across platforms (activities preserved)`,
      userId,
      "user"
    );

    res.status(200).json({
      message: `User @${username} has been removed across platforms successfully. Their activities were preserved.`,
      userId,
      clerkUserId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /admin/logs
 * Retrieve recent administrative activity logs
 */
export const getAdminLogs = async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit) || 20));
    const logs = await AdminLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /admin/channels
 * Paginated list of channels across the platform (Platform Admin)
 */
export const getAdminChannels = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 15));
    const search = req.query.search?.trim();
    const status = req.query.status || "active";
    const visibility = req.query.visibility;

    const query = {};
    if (status === "all") {
      // Query all channels including deleted (for audit tests)
    } else {
      query.status = status;
    }

    if (visibility && visibility !== "all") {
      query.visibility = visibility;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const totalChannels = await Channel.countDocuments(query);
    const channels = await Channel.find(query)
      .populate("creator", "username img clerkUserId email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.status(200).json({
      channels,
      totalChannels,
      page,
      totalPages: Math.ceil(totalChannels / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /admin/channels/:id
 * Admin soft-delete any channel
 */
export const deleteAdminChannel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const channel = await Channel.findById(id);

    if (!channel) {
      return res.status(404).json("Channel not found!");
    }

    const clerkUserId = req.auth?.userId;
    const user = await getOrSyncUser(clerkUserId);
    const reason = req.body.reason || "Deleted by platform administrator";

    channel.status = "deleted";
    channel.deletedAt = new Date();
    channel.deletedByClerkId = clerkUserId;
    channel.deletionReason = reason;
    await channel.save();

    await ModerationRecord.create({
      targetId: channel._id.toString(),
      targetType: "channel",
      channel: channel._id,
      moderator: user?._id,
      moderatorClerkId: clerkUserId,
      moderatorRole: "admin",
      action: "DELETE_CHANNEL",
      reason,
      details: `Admin deleted channel: ${channel.name} (${channel.slug})`,
    });

    await recordAdminLog(
      req,
      "DELETE_POST",
      `Platform admin deleted channel "${channel.name}"`,
      channel._id,
      "post"
    );

    const io = getIO();
    if (io) {
      io.to(channel._id.toString()).emit("channel_deleted", {
        channelId: channel._id.toString(),
        name: channel.name,
        reason,
      });
      io.socketsLeave(channel._id.toString());
    }

    res.status(200).json("Channel deleted by administrator");
  } catch (error) {
    next(error);
  }
};

/**
 * GET /admin/reports
 * View reported messages across all channels
 */
export const getAdminReports = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit) || 20));
    const status = req.query.status || "all";

    const query = {};
    if (status !== "all") {
      query.status = status;
    }

    const totalReports = await MessageReport.countDocuments(query);
    const reports = await MessageReport.find(query)
      .populate("reporter", "username img clerkUserId email")
      .populate("channel", "name slug")
      .populate({
        path: "message",
        populate: { path: "sender", select: "username img email" },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.status(200).json({
      reports,
      totalReports,
      page,
      totalPages: Math.ceil(totalReports / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /admin/reports/:id
 * Resolve or dismiss a message report
 */
export const resolveAdminReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, action, reason } = req.body; // status: "reviewed" | "dismissed" | "actioned"

    if (!["reviewed", "dismissed", "actioned"].includes(status)) {
      return res.status(400).json("Invalid report status");
    }

    const report = await MessageReport.findById(id).populate("message");
    if (!report) {
      return res.status(404).json("Report not found!");
    }

    const clerkUserId = req.auth?.userId;
    const user = await getOrSyncUser(clerkUserId);

    report.status = status;
    report.resolvedBy = user?._id;
    report.resolvedByClerkId = clerkUserId;
    report.resolvedAt = new Date();
    report.resolutionNote = reason || `Report marked as ${status}`;
    await report.save();

    // If action is DELETE_MESSAGE, delete the message as well
    if (action === "DELETE_MESSAGE" && report.message && !report.message.isDeleted) {
      const message = await Message.findById(report.message._id);
      if (message) {
        message.isDeleted = true;
        message.deletedAt = new Date();
        message.deletedBy = user?._id;
        message.deletedByClerkId = clerkUserId;
        message.deletionReason = reason || "Removed by administrator following user report";
        message.content = "[This message was deleted]";
        await message.save();

        const channel = await Channel.findById(message.channel);
        if (channel) {
          const io = getIO();
          if (io) {
            io.to(channel._id.toString()).emit("message_deleted", {
              messageId: message._id.toString(),
              channelId: channel._id.toString(),
              isDeleted: true,
              content: "[This message was deleted]",
              deletedAt: message.deletedAt,
              deletedByClerkId,
            });
          }
        }
      }
    }

    await ModerationRecord.create({
      targetId: report._id.toString(),
      targetType: "report",
      channel: report.channel,
      moderator: user?._id,
      moderatorClerkId: clerkUserId,
      moderatorRole: "admin",
      action: action === "DELETE_MESSAGE" ? "DELETE_MESSAGE" : "RESOLVE_REPORT",
      reason: reason || `Report ${status}`,
      details: `Admin ${status} report for message ${report.message?._id || "unknown"}`,
    });

    res.status(200).json({
      message: `Report successfully marked as ${status}`,
      report,
    });
  } catch (error) {
    next(error);
  }
};
