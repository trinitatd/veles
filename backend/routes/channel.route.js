import express from "express";
import {
  getChannels,
  getUserChannels,
  getAuthorChannels,
  getChannel,
  createChannel,
  updateChannel,
  deleteChannel,
  joinChannel,
  leaveChannel,
  getChannelMembers,
  removeChannelMember,
  getChannelMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reportMessage,
  requestJoinChannel,
  cancelJoinRequest,
  getChannelJoinRequests,
  acceptJoinRequest,
  declineJoinRequest,
} from "../controllers/channel.controller.js";
import {
  channelCreationRateLimit,
  messageRateLimit,
} from "../middlewares/rateLimiter.js";

const router = express.Router();

// Channel discovery & user channels
router.get("/", getChannels);
router.get("/user", getUserChannels);
router.get("/author/:username", getAuthorChannels);

// Channel creation & management
router.post("/", channelCreationRateLimit, createChannel);
router.get("/:slugOrId", getChannel);
router.patch("/:slugOrId", updateChannel);
router.delete("/:slugOrId", deleteChannel);

// Membership operations
router.post("/:slugOrId/join", joinChannel);
router.post("/:slugOrId/leave", leaveChannel);
router.get("/:slugOrId/members", getChannelMembers);
router.delete("/:slugOrId/members/:memberClerkId", removeChannelMember);

// Private channel join requests
router.post("/:slugOrId/request-join", requestJoinChannel);
router.post("/:slugOrId/requests", requestJoinChannel);
router.post("/:slugOrId/cancel-request", cancelJoinRequest);
router.delete("/:slugOrId/requests", cancelJoinRequest);
router.delete("/:slugOrId/requests/pending", cancelJoinRequest);
router.get("/:slugOrId/requests", getChannelJoinRequests);
router.post("/:slugOrId/requests/:requestId/accept", acceptJoinRequest);
router.post("/:slugOrId/requests/:requestId/decline", declineJoinRequest);

// Messages operations
router.get("/:slugOrId/messages", getChannelMessages);
router.post("/:slugOrId/messages", messageRateLimit, sendMessage);
router.patch("/:slugOrId/messages/:messageId", editMessage);
router.delete("/:slugOrId/messages/:messageId", deleteMessage);
router.post("/:slugOrId/messages/:messageId/report", reportMessage);

export default router;

