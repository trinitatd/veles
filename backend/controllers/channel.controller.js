import Channel from "../models/channel.model.js";
import ChannelMember from "../models/channelMember.model.js";
import ChannelJoinRequest from "../models/channelJoinRequest.model.js";
import Message from "../models/message.model.js";
import MessageReport from "../models/messageReport.model.js";
import ModerationRecord from "../models/moderationRecord.model.js";
import AdminLog from "../models/adminLog.model.js";
import User from "../models/user.model.js";
import { getOrSyncUser } from "../lib/userSync.js";
import { getClerkUserRole } from "../middlewares/requireAdmin.js";
import { getIO } from "../socket.js";
import { checkMessageRateLimit } from "../middlewares/rateLimiter.js";

/**
 * Helper to generate a unique channel slug
 */
const generateUniqueSlug = async (name, currentChannelId = null) => {
  let baseSlug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!baseSlug) {
    baseSlug = `channel-${Date.now()}`;
  }

  let slug = baseSlug;
  const query = { slug };
  if (currentChannelId) {
    query._id = { $ne: currentChannelId };
  }

  let existing = await Channel.findOne(query);
  let counter = 2;
  while (existing) {
    slug = `${baseSlug}-${counter}`;
    query.slug = slug;
    existing = await Channel.findOne(query);
    counter++;
  }

  return slug;
};

/**
 * Helper to find active channel by slug or ObjectId
 */
export const findActiveChannel = async (slugOrId) => {
  if (!slugOrId || typeof slugOrId !== "string") return null;
  const clean = slugOrId.trim();
  const query = {
    $or: [{ slug: clean.toLowerCase() }],
    status: "active",
  };
  if (clean.match(/^[0-9a-fA-F]{24}$/)) {
    query.$or.push({ _id: clean });
  }
  return Channel.findOne(query);
};

/**
 * GET /channels
 * Public channel discovery with search, pagination, and user membership flags
 */
export const getChannels = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit) || 20));
    const search = req.query.search?.trim();
    const visibility = req.query.visibility; // optional filter
    const clerkUserId = req.auth?.userId;

    const query = { status: "active" };

    // If visibility parameter provided, filter on it; otherwise both public and private are discoverable
    if (visibility === "public" || visibility === "private") {
      query.visibility = visibility;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const totalChannels = await Channel.countDocuments(query);
    const channels = await Channel.find(query)
      .populate("creator", "username img clerkUserId email")
      .sort({ lastActivityAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // If authenticated, attach user's membership and request status for each channel
    if (clerkUserId && channels.length > 0) {
      const channelIds = channels.map((c) => c._id);
      const [userMemberships, userRequests, pendingCounts] = await Promise.all([
        ChannelMember.find({
          channel: { $in: channelIds },
          clerkUserId,
          status: "active",
        }).lean(),
        ChannelJoinRequest.find({
          channel: { $in: channelIds },
          clerkUserId,
        })
          .sort({ createdAt: -1 })
          .lean(),
        ChannelJoinRequest.aggregate([
          { $match: { channel: { $in: channelIds }, status: "pending" } },
          { $group: { _id: "$channel", count: { $sum: 1 } } },
        ]),
      ]);

      const memberMap = new Map();
      userMemberships.forEach((m) => {
        memberMap.set(m.channel.toString(), m.role);
      });

      const requestMap = new Map();
      userRequests.forEach((r) => {
        // Keep latest request per channel
        if (!requestMap.has(r.channel.toString())) {
          requestMap.set(r.channel.toString(), r.status);
        }
      });

      const pendingMap = new Map();
      pendingCounts.forEach((p) => {
        pendingMap.set(p._id.toString(), p.count);
      });

      channels.forEach((c) => {
        c.isMember = memberMap.has(c._id.toString());
        c.membershipRole = memberMap.get(c._id.toString()) || null;
        c.joinRequestStatus = requestMap.get(c._id.toString()) || "none";
        if (c.creatorClerkId === clerkUserId) {
          c.pendingRequestCount = pendingMap.get(c._id.toString()) || 0;
        }
      });
    }

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
 * GET /channels/user
 * Returns owned and joined channels for the authenticated user
 */
export const getUserChannels = async (req, res, next) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json("Not authenticated!");
    }

    // 1. Owned channels (active)
    const owned = await Channel.find({
      creatorClerkId: clerkUserId,
      status: "active",
    })
      .populate("creator", "username img clerkUserId")
      .sort({ lastActivityAt: -1 })
      .lean();

    // Attach pending request counts for owned channels
    if (owned.length > 0) {
      const ownedIds = owned.map((c) => c._id);
      const pendingCounts = await ChannelJoinRequest.aggregate([
        { $match: { channel: { $in: ownedIds }, status: "pending" } },
        { $group: { _id: "$channel", count: { $sum: 1 } } },
      ]);
      const countMap = new Map();
      pendingCounts.forEach((p) => countMap.set(p._id.toString(), p.count));
      owned.forEach((c) => {
        c.pendingRequestCount = countMap.get(c._id.toString()) || 0;
      });
    }

    // 2. Joined channels (active memberships where role is member, or not creator)
    const activeMemberships = await ChannelMember.find({
      clerkUserId,
      status: "active",
      role: "member",
    }).lean();

    const joinedChannelIds = activeMemberships.map((m) => m.channel);

    const joined = await Channel.find({
      _id: { $in: joinedChannelIds },
      status: "active",
    })
      .populate("creator", "username img clerkUserId")
      .sort({ lastActivityAt: -1 })
      .lean();

    res.status(200).json({
      owned,
      joined,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /channels/author/:username
 * Public author profile channels: returns active PUBLIC channels created or joined by the author.
 * Strictly enforces privacy: private channels and confidential memberships are NEVER returned.
 */
export const getAuthorChannels = async (req, res, next) => {
  try {
    const { username } = req.params;
    if (!username || typeof username !== "string") {
      return res.status(400).json({ message: "Username is required" });
    }

    const cleanUsername = username.trim();
    const authorUser = await User.findOne({
      username: { $regex: new RegExp(`^${cleanUsername}$`, "i") },
    }).lean();

    if (!authorUser) {
      return res.status(404).json({ message: "Author not found" });
    }

    // 1. Fetch active PUBLIC channels created by this author
    const creatorQuery = {
      status: "active",
      visibility: "public",
      $or: [{ creator: authorUser._id }],
    };
    if (authorUser.clerkUserId) {
      creatorQuery.$or.push({ creatorClerkId: authorUser.clerkUserId });
    }

    const createdChannels = await Channel.find(creatorQuery)
      .populate("creator", "username img")
      .select("name slug description memberCount visibility lastActivityAt createdAt creator")
      .sort({ lastActivityAt: -1, createdAt: -1 })
      .lean();

    const createdIds = new Set(createdChannels.map((c) => c._id.toString()));

    // 2. Fetch active PUBLIC channels where author is a joined active member
    const memberQuery = {
      status: "active",
      role: "member",
      $or: [{ user: authorUser._id }],
    };
    if (authorUser.clerkUserId) {
      memberQuery.$or.push({ clerkUserId: authorUser.clerkUserId });
    }

    const activeMemberships = await ChannelMember.find(memberQuery).lean();
    const joinedChannelIds = activeMemberships
      .map((m) => m.channel.toString())
      .filter((id) => !createdIds.has(id));

    let joinedChannels = [];
    if (joinedChannelIds.length > 0) {
      joinedChannels = await Channel.find({
        _id: { $in: joinedChannelIds },
        status: "active",
        visibility: "public", // STRICT: only public channels
      })
        .populate("creator", "username img")
        .select("name slug description memberCount visibility lastActivityAt createdAt creator")
        .sort({ lastActivityAt: -1, createdAt: -1 })
        .lean();
    }

    // Map channels with relationship tag: "creator" vs "member"
    const createdWithRelationship = createdChannels.map((c) => ({
      ...c,
      relationship: "creator",
    }));

    const joinedWithRelationship = joinedChannels.map((c) => ({
      ...c,
      relationship: "member",
    }));

    // Combined list, sorted by most recent activity
    const allPublicChannels = [
      ...createdWithRelationship,
      ...joinedWithRelationship,
    ].sort((a, b) => {
      const dateA = new Date(a.lastActivityAt || a.createdAt).getTime();
      const dateB = new Date(b.lastActivityAt || b.createdAt).getTime();
      return dateB - dateA;
    });

    res.status(200).json({
      channels: allPublicChannels,
      created: createdWithRelationship,
      joined: joinedWithRelationship,
      totalCount: allPublicChannels.length,
      createdCount: createdWithRelationship.length,
      joinedCount: joinedWithRelationship.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /channels/:slugOrId
 * Fetch single channel details with membership and request status
 */
export const getChannel = async (req, res, next) => {
  try {
    const { slugOrId } = req.params;
    const clerkUserId = req.auth?.userId;

    const channelDoc = await findActiveChannel(slugOrId);
    if (!channelDoc) {
      return res.status(404).json("Channel not found or inactive");
    }

    const channel = await Channel.findById(channelDoc._id)
      .populate("creator", "username img clerkUserId email")
      .lean();

    let isMember = false;
    let role = null;
    let isAdmin = false;
    let joinRequestStatus = "none";
    let joinRequestId = null;
    let pendingRequestCount = 0;

    if (clerkUserId) {
      const userRole = await getClerkUserRole(req);
      isAdmin = userRole === "admin";

      const membership = await ChannelMember.findOne({
        channel: channel._id,
        clerkUserId,
        status: "active",
      }).lean();

      if (membership) {
        isMember = true;
        role = membership.role;
      } else {
        // Query latest join request for this user and channel
        const request = await ChannelJoinRequest.findOne({
          channel: channel._id,
          clerkUserId,
        })
          .sort({ createdAt: -1 })
          .lean();

        if (request) {
          joinRequestStatus = request.status;
          joinRequestId = request._id;
        }
      }

      // If creator or admin, attach count of pending join requests
      if (channel.creatorClerkId === clerkUserId || isAdmin) {
        pendingRequestCount = await ChannelJoinRequest.countDocuments({
          channel: channel._id,
          status: "pending",
        });
      }
    }

    res.status(200).json({
      ...channel,
      isMember,
      role: role || (channel.creatorClerkId === clerkUserId ? "creator" : null),
      isAdmin,
      joinRequestStatus,
      joinRequestId,
      pendingRequestCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /channels
 * Create a new channel
 */
export const createChannel = async (req, res, next) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json("Not authenticated!");
    }

    const { name, description, visibility } = req.body;

    // Validate channel name
    if (!name || typeof name !== "string") {
      return res.status(400).json("Channel name is required!");
    }

    const cleanName = name.trim();
    if (cleanName.length < 2 || cleanName.length > 60) {
      return res
        .status(400)
        .json("Channel name must be between 2 and 60 characters!");
    }

    // Validate visibility
    const cleanVisibility =
      visibility === "private" ? "private" : "public";

    // Validate description
    const cleanDesc =
      typeof description === "string" ? description.trim().slice(0, 500) : "";

    // Sync or retrieve user
    const user = await getOrSyncUser(clerkUserId);
    if (!user) {
      return res.status(404).json("User profile not found!");
    }

    // Generate unique slug
    const slug = await generateUniqueSlug(cleanName);

    // Create channel
    const newChannel = await Channel.create({
      name: cleanName,
      slug,
      description: cleanDesc,
      creator: user._id,
      creatorClerkId: clerkUserId,
      visibility: cleanVisibility,
      status: "active",
      memberCount: 1,
      lastActivityAt: new Date(),
    });

    // Automatically register creator as first member
    await ChannelMember.create({
      channel: newChannel._id,
      user: user._id,
      clerkUserId,
      role: "creator",
      status: "active",
    });

    const populated = await Channel.findById(newChannel._id)
      .populate("creator", "username img clerkUserId email")
      .lean();

    res.status(201).json({
      ...populated,
      isMember: true,
      role: "creator",
    });
  } catch (error) {
    console.error("Error creating channel:", error);
    next(error);
  }
};

/**
 * PATCH /channels/:slugOrId
 * Update channel details (Creator only)
 */
export const updateChannel = async (req, res, next) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json("Not authenticated!");
    }

    const { slugOrId } = req.params;
    const channel = await findActiveChannel(slugOrId);

    if (!channel) {
      return res.status(404).json("Channel not found!");
    }

    // Role check: Only the channel creator can edit their channel details
    if (channel.creatorClerkId !== clerkUserId) {
      return res.status(403).json("Forbidden: Only the channel creator can edit channel details!");
    }

    const { name, description, visibility } = req.body;

    if (name && typeof name === "string") {
      const cleanName = name.trim();
      if (cleanName.length < 2 || cleanName.length > 60) {
        return res.status(400).json("Channel name must be between 2 and 60 characters!");
      }
      if (cleanName !== channel.name) {
        channel.name = cleanName;
        channel.slug = await generateUniqueSlug(cleanName, channel._id);
      }
    }

    if (description !== undefined) {
      channel.description = typeof description === "string" ? description.trim().slice(0, 500) : "";
    }

    if (visibility === "public" || visibility === "private") {
      channel.visibility = visibility;
    }

    await channel.save();

    const populated = await Channel.findById(channel._id)
      .populate("creator", "username img clerkUserId email")
      .lean();

    // Broadcast update via socket if room is active
    const io = getIO();
    if (io) {
      io.to(channel._id.toString()).emit("channel_updated", populated);
    }

    res.status(200).json({
      ...populated,
      isMember: true,
      role: "creator",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /channels/:slugOrId
 * Soft delete channel (Channel Creator or Platform Admin)
 */
export const deleteChannel = async (req, res, next) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json("Not authenticated!");
    }

    const { slugOrId } = req.params;
    const channel = await findActiveChannel(slugOrId);

    if (!channel) {
      return res.status(404).json("Channel not found!");
    }

    const userRole = await getClerkUserRole(req);
    const isAdmin = userRole === "admin";
    const isCreator = channel.creatorClerkId === clerkUserId;

    if (!isCreator && !isAdmin) {
      return res.status(403).json("Forbidden: Only the channel creator or platform administrator can delete this channel!");
    }

    const user = await getOrSyncUser(clerkUserId);
    const reason = req.body.reason || (isAdmin ? "Deleted by administrator" : "Deleted by creator");

    // Soft deletion
    channel.status = "deleted";
    channel.deletedAt = new Date();
    channel.deletedByClerkId = clerkUserId;
    channel.deletionReason = reason;
    await channel.save();

    // Create moderation record
    await ModerationRecord.create({
      targetId: channel._id.toString(),
      targetType: "channel",
      channel: channel._id,
      moderator: user?._id,
      moderatorClerkId: clerkUserId,
      moderatorRole: isAdmin ? "admin" : "creator",
      action: "DELETE_CHANNEL",
      reason,
      details: `Channel "${channel.name}" (${channel.slug}) soft-deleted`,
    });

    if (isAdmin) {
      await AdminLog.create({
        adminClerkId: clerkUserId,
        adminUsername: user?.username || "Admin",
        action: "DELETE_POST", // maps to existing admin action log
        details: `Platform admin deleted channel: ${channel.name} (${channel.slug})`,
        targetId: channel._id.toString(),
        targetType: "post",
      }).catch(() => {});
    }

    // Broadcast deletion event to connected clients in the room
    const io = getIO();
    if (io) {
      io.to(channel._id.toString()).emit("channel_deleted", {
        channelId: channel._id.toString(),
        name: channel.name,
        reason,
      });
      io.socketsLeave(channel._id.toString());
    }

    res.status(200).json("Channel deleted successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * POST /channels/:slugOrId/join
 * Join a public channel
 */
export const joinChannel = async (req, res, next) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json("Not authenticated!");
    }

    const { slugOrId } = req.params;
    const channel = await findActiveChannel(slugOrId);

    if (!channel) {
      return res.status(404).json("Channel not found!");
    }

    // Private channels cannot be joined directly without an accepted request
    if (channel.visibility === "private" && channel.creatorClerkId !== clerkUserId) {
      return res.status(403).json("Cannot join private channel directly. Please submit a request to join.");
    }

    const user = await getOrSyncUser(clerkUserId);
    if (!user) {
      return res.status(404).json("User not found!");
    }

    let member = await ChannelMember.findOne({
      channel: channel._id,
      clerkUserId,
    });

    if (member) {
      if (member.status === "active") {
        return res.status(200).json({ message: "Already a member", member });
      }
      if (member.status === "removed") {
        return res.status(403).json("You were removed from this channel by the creator.");
      }
      // Re-joining after leaving
      member.status = "active";
      member.joinedAt = new Date();
      await member.save();
    } else {
      // New member
      member = await ChannelMember.create({
        channel: channel._id,
        user: user._id,
        clerkUserId,
        role: channel.creatorClerkId === clerkUserId ? "creator" : "member",
        status: "active",
      });
    }

    // Update channel member count
    const activeCount = await ChannelMember.countDocuments({
      channel: channel._id,
      status: "active",
    });
    channel.memberCount = activeCount;
    await channel.save();

    // Broadcast member joined
    const io = getIO();
    if (io) {
      io.to(channel._id.toString()).emit("member_joined", {
        channelId: channel._id.toString(),
        member: {
          clerkUserId,
          username: user.username,
          img: user.img,
          role: member.role,
        },
        memberCount: activeCount,
      });
    }

    res.status(200).json({
      message: "Joined channel successfully",
      member,
      memberCount: activeCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /channels/:slugOrId/leave
 * Leave a channel (Members only; Creators cannot leave)
 */
export const leaveChannel = async (req, res, next) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json("Not authenticated!");
    }

    const { slugOrId } = req.params;
    const channel = await findActiveChannel(slugOrId);

    if (!channel) {
      return res.status(404).json("Channel not found!");
    }

    // Creators cannot leave their own channel
    if (channel.creatorClerkId === clerkUserId) {
      return res.status(400).json("Channel creators cannot leave their own channel. You can delete the channel if you no longer wish to manage it.");
    }

    const member = await ChannelMember.findOne({
      channel: channel._id,
      clerkUserId,
      status: "active",
    });

    if (!member) {
      return res.status(400).json("You are not an active member of this channel!");
    }

    member.status = "left";
    await member.save();

    // Update member count
    const activeCount = await ChannelMember.countDocuments({
      channel: channel._id,
      status: "active",
    });
    channel.memberCount = activeCount;
    await channel.save();

    // Broadcast member left
    const io = getIO();
    if (io) {
      io.to(channel._id.toString()).emit("member_left", {
        channelId: channel._id.toString(),
        clerkUserId,
        memberCount: activeCount,
      });
      io.in(`user_${clerkUserId}`).socketsLeave(channel._id.toString());
    }

    res.status(200).json({
      message: "Left channel successfully",
      memberCount: activeCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /channels/:slugOrId/members
 * List active channel members
 */
export const getChannelMembers = async (req, res, next) => {
  try {
    const { slugOrId } = req.params;
    const clerkUserId = req.auth?.userId;

    const channel = await findActiveChannel(slugOrId);

    if (!channel) {
      return res.status(404).json("Channel not found!");
    }

    // For private channels, must be member or admin
    if (channel.visibility === "private") {
      const userRole = await getClerkUserRole(req);
      const isMember = await ChannelMember.findOne({
        channel: channel._id,
        clerkUserId,
        status: "active",
      });
      if (!isMember && userRole !== "admin") {
        return res.status(403).json("Access denied to private channel members list");
      }
    }

    const members = await ChannelMember.find({
      channel: channel._id,
      status: "active",
    })
      .populate("user", "username img email clerkUserId createdAt")
      .sort({ role: -1, joinedAt: 1 })
      .lean();

    res.status(200).json(members);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /channels/:slugOrId/members/:memberClerkId
 * Remove a member from channel (Channel Creator sole moderator privilege)
 */
export const removeChannelMember = async (req, res, next) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json("Not authenticated!");
    }

    const { slugOrId, memberClerkId } = req.params;
    const channel = await findActiveChannel(slugOrId);

    if (!channel) {
      return res.status(404).json("Channel not found!");
    }

    const userRole = await getClerkUserRole(req);
    const isCreator = channel.creatorClerkId === clerkUserId;
    const isAdmin = userRole === "admin";

    if (!isCreator && !isAdmin) {
      return res.status(403).json("Forbidden: Only the channel creator can remove members!");
    }

    if (memberClerkId === channel.creatorClerkId) {
      return res.status(400).json("Cannot remove the channel creator!");
    }

    const targetMember = await ChannelMember.findOne({
      channel: channel._id,
      clerkUserId: memberClerkId,
      status: "active",
    });

    if (!targetMember) {
      return res.status(404).json("Active member not found in this channel!");
    }

    targetMember.status = "removed";
    await targetMember.save();

    const activeCount = await ChannelMember.countDocuments({
      channel: channel._id,
      status: "active",
    });
    channel.memberCount = activeCount;
    await channel.save();

    const reason = req.body.reason || "Removed by channel moderator";

    // Record moderation record
    const modUser = await getOrSyncUser(clerkUserId);
    await ModerationRecord.create({
      targetId: targetMember._id.toString(),
      targetType: "member",
      channel: channel._id,
      moderator: modUser?._id,
      moderatorClerkId: clerkUserId,
      moderatorRole: isAdmin ? "admin" : "creator",
      action: "REMOVE_MEMBER",
      reason,
      details: `User ${memberClerkId} removed from channel ${channel.name}`,
    });

    // Broadcast member removed
    const io = getIO();
    if (io) {
      io.to(channel._id.toString()).emit("member_removed", {
        channelId: channel._id.toString(),
        clerkUserId: memberClerkId,
        memberCount: activeCount,
        reason,
      });

      // Also send direct alert to removed user's socket room
      io.to(`user_${memberClerkId}`).emit("removed_from_channel", {
        channelId: channel._id.toString(),
        channelName: channel.name,
        reason,
      });

      // Revoke socket access immediately
      io.in(`user_${memberClerkId}`).socketsLeave(channel._id.toString());
    }

    res.status(200).json({
      message: "Member removed successfully",
      memberCount: activeCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /channels/:slugOrId/messages
 * Retrieve paginated message stream
 */
export const getChannelMessages = async (req, res, next) => {
  try {
    const { slugOrId } = req.params;
    const clerkUserId = req.auth?.userId;
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 50));
    const before = req.query.before; // ISO timestamp or message ID for pagination

    const channel = await findActiveChannel(slugOrId);

    if (!channel) {
      return res.status(404).json("Channel not found!");
    }

    // Access check: User must be member or admin
    let isAuthorized = false;
    let isAdmin = false;

    if (clerkUserId) {
      const userRole = await getClerkUserRole(req);
      isAdmin = userRole === "admin";
      if (isAdmin) {
        isAuthorized = true;
      } else {
        const member = await ChannelMember.findOne({
          channel: channel._id,
          clerkUserId,
          status: "active",
        });
        if (member) isAuthorized = true;
      }
    }

    // Public channels allow read access for authenticated members or discover preview?
    // Requirement 6: "Users must explicitly join a channel before participating in it."
    // "Members can view messages in channels they are authorized to access."
    if (!isAuthorized) {
      return res.status(403).json("You must be an active member to view messages in this channel.");
    }

    const query = { channel: channel._id };
    if (before) {
      const beforeDate = new Date(before);
      if (!isNaN(beforeDate.getTime())) {
        query.createdAt = { $lt: beforeDate };
      }
    }

    // Query messages in reverse order for pagination, then sort ascending for rendering
    const rawMessages = await Message.find(query)
      .populate("sender", "username img clerkUserId email")
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = rawMessages.length > limit;
    const paged = hasMore ? rawMessages.slice(0, limit) : rawMessages;

    // Sanitize deleted messages if needed (content is already "[This message was deleted]")
    const sanitized = paged.reverse().map((msg) => {
      if (msg.isDeleted && !isAdmin) {
        return {
          ...msg,
          content: "[This message was deleted]",
        };
      }
      return msg;
    });

    res.status(200).json({
      messages: sanitized,
      hasMore,
      nextCursor: hasMore ? paged[0]?.createdAt : null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /channels/:slugOrId/messages
 * REST API send message endpoint (persists and broadcasts)
 */
export const sendMessage = async (req, res, next) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json("Not authenticated!");
    }

    const { slugOrId } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== "string") {
      return res.status(400).json("Message content is required!");
    }

    const trimmed = content.trim();
    if (!trimmed) {
      return res.status(400).json("Message content cannot be blank!");
    }

    if (trimmed.length > 2000) {
      return res.status(400).json("Message exceeds 2000 character limit!");
    }

    if (!checkMessageRateLimit(clerkUserId)) {
      return res.status(429).json("You are sending messages too quickly. Please slow down.");
    }

    const channel = await findActiveChannel(slugOrId);

    if (!channel) {
      return res.status(404).json("Channel not found!");
    }

    const member = await ChannelMember.findOne({
      channel: channel._id,
      clerkUserId,
      status: "active",
    });

    if (!member) {
      return res.status(403).json("You must join this channel before sending messages!");
    }

    const user = await getOrSyncUser(clerkUserId);
    if (!user) {
      return res.status(404).json("User profile not found!");
    }

    const message = await Message.create({
      channel: channel._id,
      sender: user._id,
      senderClerkId: clerkUserId,
      content: trimmed,
    });

    channel.lastActivityAt = new Date();
    await channel.save();

    const populated = await Message.findById(message._id)
      .populate("sender", "username img clerkUserId email")
      .lean();

    const io = getIO();
    if (io) {
      io.to(channel._id.toString()).emit("new_message", populated);
    }

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /channels/:slugOrId/messages/:messageId
 * Edit message (Sender only)
 */
export const editMessage = async (req, res, next) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json("Not authenticated!");
    }

    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== "string") {
      return res.status(400).json("Message content is required!");
    }

    const trimmed = content.trim();
    if (!trimmed) {
      return res.status(400).json("Message content cannot be blank!");
    }

    if (trimmed.length > 2000) {
      return res.status(400).json("Message exceeds 2000 character limit!");
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json("Message not found!");
    }

    if (message.isDeleted) {
      return res.status(400).json("Cannot edit a deleted message!");
    }

    if (message.senderClerkId !== clerkUserId) {
      return res.status(403).json("Unauthorized: You can only edit your own messages!");
    }

    message.content = trimmed;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const populated = await Message.findById(message._id)
      .populate("sender", "username img clerkUserId email")
      .lean();

    const io = getIO();
    if (io) {
      io.to(message.channel.toString()).emit("message_edited", populated);
    }

    res.status(200).json(populated);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /channels/:slugOrId/messages/:messageId
 * Delete message (Sender, Channel Creator, or Platform Admin)
 */
export const deleteMessage = async (req, res, next) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json("Not authenticated!");
    }

    const { messageId } = req.params;
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json("Message not found!");
    }

    if (message.isDeleted) {
      return res.status(200).json("Message is already deleted");
    }

    const channel = await Channel.findById(message.channel);
    if (!channel) {
      return res.status(404).json("Channel not found!");
    }

    const userRole = await getClerkUserRole(req);
    const isAdmin = userRole === "admin";
    const isSender = message.senderClerkId === clerkUserId;
    const isCreator = channel.creatorClerkId === clerkUserId;

    if (!isSender && !isCreator && !isAdmin) {
      return res.status(403).json("Forbidden: You do not have permission to delete this message!");
    }

    const user = await getOrSyncUser(clerkUserId);
    const reason = req.body.reason || (isSender ? "Deleted by author" : "Deleted by moderator");

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = user?._id;
    message.deletedByClerkId = clerkUserId;
    message.deletionReason = reason;
    message.content = "[This message was deleted]";
    await message.save();

    if (isCreator || isAdmin) {
      await ModerationRecord.create({
        targetId: message._id.toString(),
        targetType: "message",
        channel: channel._id,
        moderator: user?._id,
        moderatorClerkId: clerkUserId,
        moderatorRole: isAdmin ? "admin" : "creator",
        action: "DELETE_MESSAGE",
        reason,
        details: `Message by ${message.senderClerkId} deleted in #${channel.name}`,
      });

      if (isAdmin) {
        await AdminLog.create({
          adminClerkId: clerkUserId,
          adminUsername: user?.username || "Admin",
          action: "DELETE_COMMENT",
          details: `Admin deleted message in channel ${channel.name}`,
          targetId: message._id.toString(),
          targetType: "comment",
        }).catch(() => {});
      }
    }

    const deletePayload = {
      messageId: message._id.toString(),
      channelId: channel._id.toString(),
      isDeleted: true,
      content: "[This message was deleted]",
      deletedAt: message.deletedAt,
      deletedByClerkId: clerkUserId,
    };

    const io = getIO();
    if (io) {
      io.to(channel._id.toString()).emit("message_deleted", deletePayload);
    }

    res.status(200).json(deletePayload);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /channels/:slugOrId/messages/:messageId/report
 * Report an inappropriate message
 */
export const reportMessage = async (req, res, next) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json("Not authenticated!");
    }

    const { messageId } = req.params;
    const { reason } = req.body;

    if (!reason || typeof reason !== "string") {
      return res.status(400).json("A reason must be provided for reporting this message!");
    }

    const cleanReason = reason.trim();
    if (cleanReason.length < 3 || cleanReason.length > 500) {
      return res.status(400).json("Reason must be between 3 and 500 characters!");
    }

    const message = await Message.findById(messageId);
    if (!message || message.isDeleted) {
      return res.status(404).json("Message not found or already deleted!");
    }

    const channel = await Channel.findById(message.channel);
    if (!channel || channel.status !== "active") {
      return res.status(404).json("Channel not found!");
    }

    // Verify reporter is an active member of the channel
    const member = await ChannelMember.findOne({
      channel: channel._id,
      clerkUserId,
      status: "active",
    });

    if (!member) {
      return res.status(403).json("You must be a member of this channel to report messages!");
    }

    // Prevent duplicate reports from the same user for the same message
    const existingReport = await MessageReport.findOne({
      message: message._id,
      reporterClerkId: clerkUserId,
    });

    if (existingReport) {
      return res.status(409).json("You have already reported this message!");
    }

    const user = await getOrSyncUser(clerkUserId);
    const report = await MessageReport.create({
      message: message._id,
      channel: channel._id,
      reporter: user?._id,
      reporterClerkId: clerkUserId,
      reason: cleanReason,
      status: "pending",
    });

    res.status(201).json({
      message: "Message reported successfully. Our moderation team will review it.",
      reportId: report._id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /channels/:slugOrId/request-join
 * Request to join a private channel
 */
export const requestJoinChannel = async (req, res, next) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json({ message: "Not authenticated!" });
    }

    const { slugOrId } = req.params;
    const channel = await findActiveChannel(slugOrId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found!" });
    }

    if (channel.creatorClerkId === clerkUserId) {
      return res.status(400).json({ message: "Channel creators cannot request to join their own channel." });
    }

    if (channel.visibility !== "private") {
      return res.status(400).json({ message: "Public channels can be joined directly." });
    }

    // Check if user is already an active member
    const existingMember = await ChannelMember.findOne({
      channel: channel._id,
      clerkUserId,
      status: "active",
    });
    if (existingMember) {
      return res.status(400).json({ message: "You are already an active member of this channel." });
    }

    // Check if user already has a pending request
    const existingPending = await ChannelJoinRequest.findOne({
      channel: channel._id,
      clerkUserId,
      status: "pending",
    });
    if (existingPending) {
      return res.status(409).json({ message: "A join request is already pending for this channel." });
    }

    const user = await getOrSyncUser(clerkUserId);
    if (!user) {
      return res.status(404).json({ message: "User profile not found!" });
    }

    // If there was a previous declined or cancelled request, update it to pending
    let request = await ChannelJoinRequest.findOne({
      channel: channel._id,
      clerkUserId,
    }).sort({ createdAt: -1 });

    if (request && ["declined", "cancelled"].includes(request.status)) {
      request.status = "pending";
      request.respondedBy = null;
      request.respondedByClerkId = null;
      request.respondedAt = null;
      request.note = req.body.note || "";
      await request.save();
    } else {
      request = await ChannelJoinRequest.create({
        channel: channel._id,
        user: user._id,
        clerkUserId,
        status: "pending",
        note: req.body.note || "",
      });
    }

    // Real-time notification to channel creator
    const io = getIO();
    if (io) {
      io.to(`user_${channel.creatorClerkId}`).emit("new_join_request", {
        channelId: channel._id.toString(),
        channelName: channel.name,
        requestId: request._id.toString(),
        user: {
          clerkUserId,
          username: user.username,
          img: user.img,
        },
      });
    }

    res.status(201).json({
      message: "Join request submitted successfully. Awaiting approval by the channel creator.",
      request,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /channels/:slugOrId/cancel-request
 * Cancel a pending join request
 */
export const cancelJoinRequest = async (req, res, next) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json({ message: "Not authenticated!" });
    }

    const { slugOrId } = req.params;
    const channel = await findActiveChannel(slugOrId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found!" });
    }

    const request = await ChannelJoinRequest.findOne({
      channel: channel._id,
      clerkUserId,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({ message: "No pending join request found." });
    }

    request.status = "cancelled";
    await request.save();

    const io = getIO();
    if (io) {
      io.to(`user_${channel.creatorClerkId}`).emit("join_request_cancelled", {
        channelId: channel._id.toString(),
        requestId: request._id.toString(),
        clerkUserId,
      });
    }

    res.status(200).json({
      message: "Join request cancelled successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /channels/:slugOrId/requests
 * Get all join requests for a channel (Creator only)
 */
export const getChannelJoinRequests = async (req, res, next) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json({ message: "Not authenticated!" });
    }

    const { slugOrId } = req.params;
    const channel = await findActiveChannel(slugOrId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found!" });
    }

    const userRole = await getClerkUserRole(req);
    const isCreator = channel.creatorClerkId === clerkUserId;
    const isAdmin = userRole === "admin";

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: "Forbidden: Only the channel creator can view join requests!" });
    }

    const statusFilter = req.query.status;
    const query = { channel: channel._id };
    if (statusFilter && statusFilter !== "all") {
      query.status = statusFilter;
    }

    const requests = await ChannelJoinRequest.find(query)
      .populate("user", "username img email clerkUserId createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(requests);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /channels/:slugOrId/requests/:requestId/accept
 * Accept a join request and grant membership (Creator only)
 */
export const acceptJoinRequest = async (req, res, next) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json({ message: "Not authenticated!" });
    }

    const { slugOrId, requestId } = req.params;
    const channel = await findActiveChannel(slugOrId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found!" });
    }

    const userRole = await getClerkUserRole(req);
    const isCreator = channel.creatorClerkId === clerkUserId;
    const isAdmin = userRole === "admin";

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: "Forbidden: Only the channel creator can accept join requests!" });
    }

    const request = await ChannelJoinRequest.findOne({
      _id: requestId,
      channel: channel._id,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({ message: "Pending join request not found!" });
    }

    const creatorUser = await getOrSyncUser(clerkUserId);
    const targetUser = await getOrSyncUser(request.clerkUserId);

    // Update request
    request.status = "accepted";
    request.respondedBy = creatorUser?._id;
    request.respondedByClerkId = clerkUserId;
    request.respondedAt = new Date();
    await request.save();

    // Persist membership in ChannelMember
    let member = await ChannelMember.findOne({
      channel: channel._id,
      clerkUserId: request.clerkUserId,
    });

    if (member) {
      member.status = "active";
      member.joinedAt = new Date();
      await member.save();
    } else {
      member = await ChannelMember.create({
        channel: channel._id,
        user: targetUser._id,
        clerkUserId: request.clerkUserId,
        role: "member",
        status: "active",
      });
    }

    // Update memberCount
    const activeCount = await ChannelMember.countDocuments({
      channel: channel._id,
      status: "active",
    });
    channel.memberCount = activeCount;
    await channel.save();

    // Create moderation record
    await ModerationRecord.create({
      targetId: request._id.toString(),
      targetType: "request",
      channel: channel._id,
      moderator: creatorUser?._id,
      moderatorClerkId: clerkUserId,
      moderatorRole: isAdmin ? "admin" : "creator",
      action: "ACCEPT_JOIN_REQUEST",
      reason: "Creator accepted membership request",
      details: `Accepted join request for @${targetUser.username} in #${channel.name}`,
    });

    // Notify user via Socket.IO
    const io = getIO();
    if (io) {
      io.to(`user_${request.clerkUserId}`).emit("join_request_accepted", {
        channelId: channel._id.toString(),
        channelName: channel.name,
        channelSlug: channel.slug,
      });

      io.to(channel._id.toString()).emit("member_joined", {
        channelId: channel._id.toString(),
        member: {
          clerkUserId: request.clerkUserId,
          username: targetUser.username,
          img: targetUser.img,
          role: "member",
        },
        memberCount: activeCount,
      });
    }

    res.status(200).json({
      message: "Join request accepted successfully",
      request,
      member,
      memberCount: activeCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /channels/:slugOrId/requests/:requestId/decline
 * Decline a join request (Creator only)
 */
export const declineJoinRequest = async (req, res, next) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json({ message: "Not authenticated!" });
    }

    const { slugOrId, requestId } = req.params;
    const channel = await findActiveChannel(slugOrId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found!" });
    }

    const userRole = await getClerkUserRole(req);
    const isCreator = channel.creatorClerkId === clerkUserId;
    const isAdmin = userRole === "admin";

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ message: "Forbidden: Only the channel creator can decline join requests!" });
    }

    const request = await ChannelJoinRequest.findOne({
      _id: requestId,
      channel: channel._id,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({ message: "Pending join request not found!" });
    }

    const creatorUser = await getOrSyncUser(clerkUserId);

    request.status = "declined";
    request.respondedBy = creatorUser?._id;
    request.respondedByClerkId = clerkUserId;
    request.respondedAt = new Date();
    request.note = req.body.note || "Declined by channel creator";
    await request.save();

    // Create moderation record
    await ModerationRecord.create({
      targetId: request._id.toString(),
      targetType: "request",
      channel: channel._id,
      moderator: creatorUser?._id,
      moderatorClerkId: clerkUserId,
      moderatorRole: isAdmin ? "admin" : "creator",
      action: "DECLINE_JOIN_REQUEST",
      reason: req.body.note || "Declined by creator",
      details: `Declined join request ${request._id} in #${channel.name}`,
    });

    // Notify user via Socket.IO
    const io = getIO();
    if (io) {
      io.to(`user_${request.clerkUserId}`).emit("join_request_declined", {
        channelId: channel._id.toString(),
        channelName: channel.name,
        reason: request.note,
      });
    }

    res.status(200).json({
      message: "Join request declined",
      request,
    });
  } catch (error) {
    next(error);
  }
};
