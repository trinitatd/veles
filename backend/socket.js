import { Server } from "socket.io";
import { verifyToken } from "@clerk/express";
import { getOrSyncUser } from "./lib/userSync.js";
import { getClerkUserRole } from "./middlewares/requireAdmin.js";
import Channel from "./models/channel.model.js";
import ChannelMember from "./models/channelMember.model.js";
import Message from "./models/message.model.js";
import ModerationRecord from "./models/moderationRecord.model.js";
import AdminLog from "./models/adminLog.model.js";
import { checkMessageRateLimit } from "./middlewares/rateLimiter.js";

let ioInstance = null;

export const getIO = () => ioInstance;

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Socket Authentication Middleware via Clerk JWT
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      // Verify token with Clerk
      const decoded = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      if (!decoded || !decoded.sub) {
        return next(new Error("Invalid authentication token"));
      }

      const clerkUserId = decoded.sub;
      const user = await getOrSyncUser(clerkUserId);

      if (!user) {
        return next(new Error("User account not found"));
      }

      // Determine platform role (admin or user)
      const role =
        decoded.metadata?.role ||
        decoded.publicMetadata?.role ||
        decoded.public_metadata?.role ||
        "user";

      socket.clerkUserId = clerkUserId;
      socket.user = user;
      socket.role = role;

      next();
    } catch (err) {
      console.error("Socket authentication error:", err.message);
      next(new Error("Authentication failed: " + err.message));
    }
  });

  io.on("connection", (socket) => {
    console.log(
      `Socket connected: ${socket.id} (User: ${socket.user.username}, Clerk: ${socket.clerkUserId})`
    );

    // Personal room for direct notifications (e.g. member removed)
    socket.join(`user_${socket.clerkUserId}`);

    /**
     * Join channel room
     * Requires server-side verification of channel active status and membership
     */
    socket.on("join_channel", async ({ channelId }, callback) => {
      try {
        if (!channelId) {
          if (callback) callback({ success: false, error: "Channel ID required" });
          return;
        }

        const channel = await Channel.findOne({
          _id: channelId,
          status: "active",
        });

        if (!channel) {
          if (callback) callback({ success: false, error: "Channel not found or inactive" });
          return;
        }

        // Verify membership or platform admin privilege
        let isAuthorized = false;
        if (socket.role === "admin") {
          isAuthorized = true;
        } else {
          const member = await ChannelMember.findOne({
            channel: channel._id,
            clerkUserId: socket.clerkUserId,
            status: "active",
          });
          if (member) isAuthorized = true;
        }

        if (!isAuthorized) {
          if (callback) {
            callback({
              success: false,
              error: "Not authorized. You must join this channel first.",
            });
          }
          return;
        }

        socket.join(channel._id.toString());
        if (callback) callback({ success: true, channelId: channel._id.toString() });
      } catch (err) {
        console.error("Error joining channel room:", err);
        if (callback) callback({ success: false, error: "Server error joining room" });
      }
    });

    /**
     * Leave channel room
     */
    socket.on("leave_channel", ({ channelId }, callback) => {
      if (channelId) {
        socket.leave(channelId.toString());
        if (callback) callback({ success: true });
      }
    });

    /**
     * Real-time send message
     */
    socket.on("send_message", async ({ channelId, content }, callback) => {
      try {
        if (!channelId || typeof content !== "string") {
          if (callback) callback({ success: false, error: "Invalid payload" });
          return;
        }

        const trimmedContent = content.trim();
        if (!trimmedContent) {
          if (callback) callback({ success: false, error: "Message cannot be empty" });
          return;
        }

        if (trimmedContent.length > 2000) {
          if (callback)
            callback({
              success: false,
              error: "Message exceeds maximum length of 2000 characters",
            });
          return;
        }

        // Rate limit check
        if (!checkMessageRateLimit(socket.clerkUserId)) {
          if (callback)
            callback({
              success: false,
              error: "You are sending messages too quickly. Please slow down.",
            });
          return;
        }

        // Verify channel is active
        const channel = await Channel.findOne({
          _id: channelId,
          status: "active",
        });

        if (!channel) {
          if (callback) callback({ success: false, error: "Channel is no longer active" });
          return;
        }

        // Verify sender is an active member of this channel
        const member = await ChannelMember.findOne({
          channel: channel._id,
          clerkUserId: socket.clerkUserId,
          status: "active",
        });

        if (!member) {
          if (callback)
            callback({
              success: false,
              error: "You must be an active member of this channel to send messages",
            });
          return;
        }

        // Persist message to MongoDB before broadcasting
        const newMessage = await Message.create({
          channel: channel._id,
          sender: socket.user._id,
          senderClerkId: socket.clerkUserId,
          content: trimmedContent,
        });

        // Update channel last activity
        channel.lastActivityAt = new Date();
        await channel.save();

        // Populate sender info for the broadcast payload
        const populated = await Message.findById(newMessage._id)
          .populate("sender", "username img email clerkUserId")
          .lean();

        // Broadcast to channel room participants
        io.to(channel._id.toString()).emit("new_message", populated);

        if (callback) callback({ success: true, message: populated });
      } catch (err) {
        console.error("Error handling send_message:", err);
        if (callback) callback({ success: false, error: "Failed to send message" });
      }
    });

    /**
     * Real-time edit message
     * Only the original sender can edit their own message
     */
    socket.on("edit_message", async ({ messageId, channelId, content }, callback) => {
      try {
        if (!messageId || !channelId || typeof content !== "string") {
          if (callback) callback({ success: false, error: "Invalid payload" });
          return;
        }

        const trimmed = content.trim();
        if (!trimmed) {
          if (callback) callback({ success: false, error: "Message cannot be empty" });
          return;
        }

        if (trimmed.length > 2000) {
          if (callback) callback({ success: false, error: "Message exceeds 2000 characters" });
          return;
        }

        const message = await Message.findById(messageId);
        if (!message || message.channel.toString() !== channelId.toString()) {
          if (callback) callback({ success: false, error: "Message not found" });
          return;
        }

        if (message.isDeleted) {
          if (callback) callback({ success: false, error: "Cannot edit a deleted message" });
          return;
        }

        // Authorization check: Only original sender can edit
        if (message.senderClerkId !== socket.clerkUserId) {
          if (callback)
            callback({
              success: false,
              error: "Unauthorized: You can only edit your own messages",
            });
          return;
        }

        message.content = trimmed;
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();

        const populated = await Message.findById(message._id)
          .populate("sender", "username img email clerkUserId")
          .lean();

        io.to(channelId.toString()).emit("message_edited", populated);

        if (callback) callback({ success: true, message: populated });
      } catch (err) {
        console.error("Error editing message:", err);
        if (callback) callback({ success: false, error: "Failed to edit message" });
      }
    });

    /**
     * Real-time delete message
     * Authorized for: Original Sender, Channel Creator, or Platform Admin
     */
    socket.on("delete_message", async ({ messageId, channelId, reason }, callback) => {
      try {
        if (!messageId || !channelId) {
          if (callback) callback({ success: false, error: "Message and channel ID required" });
          return;
        }

        const message = await Message.findById(messageId);
        if (!message || message.channel.toString() !== channelId.toString()) {
          if (callback) callback({ success: false, error: "Message not found" });
          return;
        }

        if (message.isDeleted) {
          if (callback) callback({ success: true, message: "Already deleted" });
          return;
        }

        const channel = await Channel.findById(channelId);
        if (!channel) {
          if (callback) callback({ success: false, error: "Channel not found" });
          return;
        }

        const isSender = message.senderClerkId === socket.clerkUserId;
        const isChannelCreator = channel.creatorClerkId === socket.clerkUserId;
        const isAdmin = socket.role === "admin";

        if (!isSender && !isChannelCreator && !isAdmin) {
          if (callback)
            callback({
              success: false,
              error: "Unauthorized: You do not have permission to delete this message",
            });
          return;
        }

        // Soft deletion
        message.isDeleted = true;
        message.deletedAt = new Date();
        message.deletedBy = socket.user._id;
        message.deletedByClerkId = socket.clerkUserId;
        message.deletionReason = reason || (isSender ? "Deleted by author" : "Deleted by moderator");
        message.content = "[This message was deleted]";
        await message.save();

        // If deleted by Channel Creator or Platform Admin, record moderation log
        if (isChannelCreator || isAdmin) {
          await ModerationRecord.create({
            targetId: message._id.toString(),
            targetType: "message",
            channel: channel._id,
            moderator: socket.user._id,
            moderatorClerkId: socket.clerkUserId,
            moderatorRole: isAdmin ? "admin" : "creator",
            action: "DELETE_MESSAGE",
            reason: reason || "Inappropriate message removed by moderator",
            details: `Message by user ${message.senderClerkId} deleted in channel ${channel.name}`,
          });

          if (isAdmin) {
            await AdminLog.create({
              adminClerkId: socket.clerkUserId,
              adminUsername: socket.user.username || "Admin",
              action: "DELETE_COMMENT", // fits enum
              details: `Admin deleted message ${message._id} in channel ${channel.name}`,
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
          deletedByClerkId: socket.clerkUserId,
        };

        io.to(channel._id.toString()).emit("message_deleted", deletePayload);

        if (callback) callback({ success: true, payload: deletePayload });
      } catch (err) {
        console.error("Error deleting message:", err);
        if (callback) callback({ success: false, error: "Failed to delete message" });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  ioInstance = io;
  return io;
};

