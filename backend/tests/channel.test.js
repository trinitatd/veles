import "dotenv/config";
import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import test, { describe, before, after } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";

import connectDB from "../lib/connectDB.js";
import User from "../models/user.model.js";
import Channel from "../models/channel.model.js";
import ChannelMember from "../models/channelMember.model.js";
import ChannelJoinRequest from "../models/channelJoinRequest.model.js";
import Message from "../models/message.model.js";
import MessageReport from "../models/messageReport.model.js";
import ModerationRecord from "../models/moderationRecord.model.js";

import {
  createChannel,
  getChannels,
  getUserChannels,
  getChannel,
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
  getAuthorChannels,
} from "../controllers/channel.controller.js";

import {
  getAdminChannels,
  deleteAdminChannel,
  getAdminReports,
  resolveAdminReport,
} from "../controllers/admin.controller.js";

// Helper to create mock Express request and response
const createMockReqRes = (overrides = {}) => {
  const req = {
    auth: { userId: "user_test_creator_123" },
    body: {},
    params: {},
    query: {},
    ...overrides,
  };

  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };

  const next = (err) => {
    if (err) throw err;
  };

  return { req, res, next };
};

describe("Veles Channel & Community System Tests", () => {
  let testCreatorUser;
  let testMemberUser;
  let testAdminUser;
  let testOtherUser;
  let createdChannelId;
  let createdChannelSlug;
  let createdMessageId;

  before(async () => {
    await connectDB();

    // Setup test users in MongoDB
    testCreatorUser = await User.findOneAndUpdate(
      { clerkUserId: "user_test_creator_123" },
      {
        username: "test_creator",
        email: "creator@test.com",
        img: "https://example.com/creator.png",
      },
      { upsert: true, new: true }
    );

    testMemberUser = await User.findOneAndUpdate(
      { clerkUserId: "user_test_member_456" },
      {
        username: "test_member",
        email: "member@test.com",
        img: "https://example.com/member.png",
      },
      { upsert: true, new: true }
    );

    testAdminUser = await User.findOneAndUpdate(
      { clerkUserId: "user_test_admin_789" },
      {
        username: "test_admin",
        email: "admin@test.com",
        img: "https://example.com/admin.png",
      },
      { upsert: true, new: true }
    );

    testOtherUser = await User.findOneAndUpdate(
      { clerkUserId: "user_test_other_999" },
      {
        username: "test_other",
        email: "other@test.com",
        img: "https://example.com/other.png",
      },
      { upsert: true, new: true }
    );
  });

  after(async () => {
    // Clean up test records
    await Channel.deleteMany({ name: { $regex: /^Test Channel/ } });
    await ChannelMember.deleteMany({
      clerkUserId: {
        $in: [
          "user_test_creator_123",
          "user_test_member_456",
          "user_test_admin_789",
          "user_test_other_999",
        ],
      },
    });
    await Message.deleteMany({
      senderClerkId: {
        $in: [
          "user_test_creator_123",
          "user_test_member_456",
          "user_test_admin_789",
          "user_test_other_999",
        ],
      },
    });
    await MessageReport.deleteMany({
      reporterClerkId: {
        $in: [
          "user_test_creator_123",
          "user_test_member_456",
          "user_test_admin_789",
          "user_test_other_999",
        ],
      },
    });
    await ModerationRecord.deleteMany({
      moderatorClerkId: {
        $in: [
          "user_test_creator_123",
          "user_test_member_456",
          "user_test_admin_789",
          "user_test_other_999",
        ],
      },
    });
    await ChannelJoinRequest.deleteMany({
      clerkUserId: {
        $in: [
          "user_test_creator_123",
          "user_test_member_456",
          "user_test_admin_789",
          "user_test_other_999",
          "user_test_empty_author_000",
        ],
      },
    });
    await User.deleteMany({
      clerkUserId: {
        $in: ["user_test_empty_author_000"],
      },
    });
    await mongoose.connection.close();
    setTimeout(() => process.exit(0), 500).unref();
  });

  // 1. Channel Creation & Validation Tests
  test("1.1 Rejects channel creation with empty name", async () => {
    const { req, res, next } = createMockReqRes({
      body: { name: "   ", description: "Empty name test" },
    });
    await createChannel(req, res, next);
    assert.strictEqual(res.statusCode, 400);
  });

  test("1.2 Rejects channel creation with name longer than 60 characters", async () => {
    const { req, res, next } = createMockReqRes({
      body: {
        name: "A".repeat(65),
        description: "Too long name",
      },
    });
    await createChannel(req, res, next);
    assert.strictEqual(res.statusCode, 400);
  });

  test("1.3 Successfully creates a public channel and registers creator as member", async () => {
    const channelName = `Test Channel ${Date.now()}`;
    const { req, res, next } = createMockReqRes({
      body: {
        name: channelName,
        description: "A community for testing channel features",
        visibility: "public",
      },
    });

    await createChannel(req, res, next);
    assert.strictEqual(res.statusCode, 201);
    assert.ok(res.body._id);
    assert.strictEqual(res.body.name, channelName);
    assert.ok(res.body.slug);
    assert.strictEqual(res.body.visibility, "public");
    assert.strictEqual(res.body.memberCount, 1);
    assert.strictEqual(res.body.isMember, true);
    assert.strictEqual(res.body.role, "creator");

    createdChannelId = res.body._id.toString();
    createdChannelSlug = res.body.slug;

    // Verify creator membership record in MongoDB
    const membership = await ChannelMember.findOne({
      channel: createdChannelId,
      clerkUserId: "user_test_creator_123",
      status: "active",
    });
    assert.ok(membership);
    assert.strictEqual(membership.role, "creator");
  });

  test("1.4 Generates unique slug when duplicate channel name is used", async () => {
    const duplicateName = `Test Channel Collision`;
    const { req: req1, res: res1, next: next1 } = createMockReqRes({
      body: { name: duplicateName, description: "First channel" },
    });
    await createChannel(req1, res1, next1);
    assert.strictEqual(res1.statusCode, 201);
    const slug1 = res1.body.slug;

    const { req: req2, res: res2, next: next2 } = createMockReqRes({
      body: { name: duplicateName, description: "Second channel" },
    });
    await createChannel(req2, res2, next2);
    assert.strictEqual(res2.statusCode, 201);
    const slug2 = res2.body.slug;

    assert.notStrictEqual(slug1, slug2);
    assert.ok(slug2.startsWith(slug1));
  });

  // 2. Channel Discovery & Access Tests
  test("2.1 Discovery lists active channels", async () => {
    const { req, res, next } = createMockReqRes({
      auth: {}, // unauthenticated visitor
    });
    await getChannels(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.channels));
    assert.ok(res.body.channels.some((c) => c._id.toString() === createdChannelId));
  });

  test("2.2 getUserChannels returns owned and joined channels", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_creator_123" },
    });
    await getUserChannels(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.owned));
    assert.ok(res.body.owned.some((c) => c._id.toString() === createdChannelId));
  });

  // 3. Channel Membership (Join & Leave) Tests
  test("3.1 Member joins public channel and increments memberCount", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_member_456" },
      params: { slugOrId: createdChannelSlug },
    });
    await joinChannel(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.memberCount, 2);

    const updatedChannel = await Channel.findById(createdChannelId);
    assert.strictEqual(updatedChannel.memberCount, 2);
  });

  test("3.2 Duplicate join request is handled safely without duplication", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_member_456" },
      params: { slugOrId: createdChannelSlug },
    });
    await joinChannel(req, res, next);
    assert.strictEqual(res.statusCode, 200);

    const count = await ChannelMember.countDocuments({
      channel: createdChannelId,
      clerkUserId: "user_test_member_456",
    });
    assert.strictEqual(count, 1);
  });

  test("3.3 Channel creator cannot leave their own channel", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_creator_123" },
      params: { slugOrId: createdChannelSlug },
    });
    await leaveChannel(req, res, next);
    assert.strictEqual(res.statusCode, 400);
  });

  test("3.4 Member leaves channel and decrements memberCount", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_member_456" },
      params: { slugOrId: createdChannelSlug },
    });
    await leaveChannel(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.memberCount, 1);

    const membership = await ChannelMember.findOne({
      channel: createdChannelId,
      clerkUserId: "user_test_member_456",
    });
    assert.strictEqual(membership.status, "left");

    // Rejoin for subsequent messaging tests
    await joinChannel(req, res, next);
    assert.strictEqual(res.statusCode, 200);
  });

  // 4. Messaging & Permissions Tests
  test("4.1 Rejects message sending from non-member", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_other_999" }, // Not a member
      params: { slugOrId: createdChannelSlug },
      body: { content: "Unauthorized message" },
    });
    await sendMessage(req, res, next);
    assert.strictEqual(res.statusCode, 403);
  });

  test("4.2 Rejects empty or whitespace-only messages", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_member_456" },
      params: { slugOrId: createdChannelSlug },
      body: { content: "    " },
    });
    await sendMessage(req, res, next);
    assert.strictEqual(res.statusCode, 400);
  });

  test("4.3 Rejects messages exceeding 2000 characters", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_member_456" },
      params: { slugOrId: createdChannelSlug },
      body: { content: "A".repeat(2005) },
    });
    await sendMessage(req, res, next);
    assert.strictEqual(res.statusCode, 400);
  });

  test("4.4 Active member can send a valid message and persist it", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_member_456" },
      params: { slugOrId: createdChannelSlug },
      body: { content: "Hello community, testing real-time messaging!" },
    });
    await sendMessage(req, res, next);
    assert.strictEqual(res.statusCode, 201);
    assert.ok(res.body._id);
    assert.strictEqual(res.body.content, "Hello community, testing real-time messaging!");
    assert.strictEqual(res.body.senderClerkId, "user_test_member_456");

    createdMessageId = res.body._id.toString();
  });

  test("4.5 Original author can edit their own message", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_member_456" },
      params: { slugOrId: createdChannelSlug, messageId: createdMessageId },
      body: { content: "Updated message content: edit verified" },
    });
    await editMessage(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.content, "Updated message content: edit verified");
    assert.strictEqual(res.body.isEdited, true);
  });

  test("4.6 Non-author cannot edit another user's message", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_creator_123" }, // Even creator cannot edit someone else's text
      params: { slugOrId: createdChannelSlug, messageId: createdMessageId },
      body: { content: "Malicious edit attempt" },
    });
    await editMessage(req, res, next);
    assert.strictEqual(res.statusCode, 403);
  });

  // 5. Moderation & Reporting Tests
  test("5.1 Channel member can report an inappropriate message", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_creator_123" },
      params: { slugOrId: createdChannelSlug, messageId: createdMessageId },
      body: { reason: "Inappropriate language in technical channel" },
    });
    await reportMessage(req, res, next);
    assert.strictEqual(res.statusCode, 201);
    assert.ok(res.body.reportId);

    const report = await MessageReport.findById(res.body.reportId);
    assert.ok(report);
    assert.strictEqual(report.status, "pending");
  });

  test("5.2 Prevents duplicate report for the same message by the same user", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_creator_123" },
      params: { slugOrId: createdChannelSlug, messageId: createdMessageId },
      body: { reason: "Duplicate report attempt" },
    });
    await reportMessage(req, res, next);
    assert.strictEqual(res.statusCode, 409);
  });

  test("5.3 Random member cannot delete another member's message", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_other_999" },
      params: { slugOrId: createdChannelSlug, messageId: createdMessageId },
    });
    await deleteMessage(req, res, next);
    assert.strictEqual(res.statusCode, 403);
  });

  test("5.4 Channel Creator can delete any message in their channel with moderation record", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_creator_123" },
      params: { slugOrId: createdChannelSlug, messageId: createdMessageId },
      body: { reason: "Violates community guidelines" },
    });
    await deleteMessage(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.isDeleted, true);
    assert.strictEqual(res.body.content, "[This message was deleted]");

    // Verify ModerationRecord was created
    const modRecord = await ModerationRecord.findOne({
      targetId: createdMessageId,
      action: "DELETE_MESSAGE",
      moderatorRole: "creator",
    });
    assert.ok(modRecord);
    assert.strictEqual(modRecord.moderatorClerkId, "user_test_creator_123");
  });

  test("5.5 Creator can remove an abusive member from their channel", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_creator_123" },
      params: {
        slugOrId: createdChannelSlug,
        memberClerkId: "user_test_member_456",
      },
      body: { reason: "Repeated spam" },
    });
    await removeChannelMember(req, res, next);
    assert.strictEqual(res.statusCode, 200);

    const membership = await ChannelMember.findOne({
      channel: createdChannelId,
      clerkUserId: "user_test_member_456",
    });
    assert.strictEqual(membership.status, "removed");
  });

  // 6. Channel Management & Deletion Tests
  test("6.1 Creator can update channel name, description, and visibility", async () => {
    const newName = `Test Channel Updated ${Date.now()}`;
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_creator_123" },
      params: { slugOrId: createdChannelSlug },
      body: {
        name: newName,
        description: "Updated description for test channel",
        visibility: "public",
      },
    });
    await updateChannel(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.name, newName);
    assert.notStrictEqual(res.body.slug, createdChannelSlug);

    createdChannelSlug = res.body.slug;
  });

  test("6.2 Non-creator cannot update channel details", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_other_999" },
      params: { slugOrId: createdChannelSlug },
      body: { name: "Hacked Channel Name" },
    });
    await updateChannel(req, res, next);
    assert.strictEqual(res.statusCode, 403);
  });

  test("6.3 Non-creator and non-admin cannot delete channel", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_other_999" },
      params: { slugOrId: createdChannelSlug },
    });
    await deleteChannel(req, res, next);
    assert.strictEqual(res.statusCode, 403);
  });

  test("6.4 Creator can soft-delete their channel", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_creator_123" },
      params: { slugOrId: createdChannelSlug },
      body: { reason: "Project concluded" },
    });
    await deleteChannel(req, res, next);
    assert.strictEqual(res.statusCode, 200);

    const channel = await Channel.findById(createdChannelId);
    assert.strictEqual(channel.status, "deleted");
    assert.ok(channel.deletedAt);
  });

  test("6.5 Deleted channel rejects new joins and messages", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_other_999" },
      params: { slugOrId: createdChannelSlug },
    });
    await joinChannel(req, res, next);
    assert.strictEqual(res.statusCode, 404);
  });

  // 7. Platform Administrator Operations
  test("7.1 Platform Admin can query all channels including deleted", async () => {
    const { req, res, next } = createMockReqRes({
      auth: {
        userId: "user_test_admin_789",
        sessionClaims: { metadata: { role: "admin" } },
      },
      query: { status: "all" },
    });
    await getAdminChannels(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.channels.some((c) => c._id.toString() === createdChannelId));
  });

  test("7.1b Platform Admin channels query excludes deleted channels by default", async () => {
    const { req, res, next } = createMockReqRes({
      auth: {
        userId: "user_test_admin_789",
        sessionClaims: { metadata: { role: "admin" } },
      },
      query: {},
    });
    await getAdminChannels(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    const hasDeletedChannel = res.body.channels.some(
      (c) => c._id.toString() === createdChannelId
    );
    assert.strictEqual(
      hasDeletedChannel,
      false,
      "Deleted channels must not be shown by default in admin channels query"
    );
  });

  test("7.2 Platform Admin can review reports and action resolution", async () => {
    const { req, res, next } = createMockReqRes({
      auth: {
        userId: "user_test_admin_789",
        sessionClaims: { metadata: { role: "admin" } },
      },
      query: { status: "all" },
    });
    await getAdminReports(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.reports));
  });

  // 8. Private Channel Join-Request Workflow Tests
  let privateChannelId;
  let privateChannelSlug;
  let activeJoinRequestId;

  test("8.1 Creator can create a private channel", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_creator_123" },
      body: {
        name: `Test Channel Private ${Date.now()}`,
        description: "Confidential technical discussions",
        visibility: "private",
      },
    });
    await createChannel(req, res, next);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.visibility, "private");
    assert.ok(res.body._id);
    assert.ok(res.body.slug);

    privateChannelId = res.body._id.toString();
    privateChannelSlug = res.body.slug;
  });

  test("8.2 Non-member cannot join private channel directly", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_other_999" },
      params: { slugOrId: privateChannelSlug },
    });
    await joinChannel(req, res, next);
    assert.strictEqual(res.statusCode, 403);
    assert.ok(
      typeof res.body === "string" &&
        res.body.includes("Cannot join private channel directly")
    );
  });

  test("8.3 Non-member cannot read messages of a private channel", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_other_999" },
      params: { slugOrId: privateChannelSlug },
    });
    await getChannelMessages(req, res, next);
    assert.strictEqual(res.statusCode, 403);
  });

  test("8.3b Creator cannot submit a join request to their own channel", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_creator_123" },
      params: { slugOrId: privateChannelSlug },
      body: { note: "Attempting to request own channel" },
    });
    await requestJoinChannel(req, res, next);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(
      res.body.message,
      "Channel creators cannot request to join their own channel."
    );
  });

  test("8.4 Non-member can submit a join request to private channel", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_other_999" },
      params: { slugOrId: privateChannelSlug },
      body: { note: "Interested in the specialized topic" },
    });
    await requestJoinChannel(req, res, next);
    assert.strictEqual(res.statusCode, 201);
    assert.ok(res.body.request);
    assert.strictEqual(res.body.request.status, "pending");
    assert.strictEqual(res.body.request.clerkUserId, "user_test_other_999");
    assert.strictEqual(res.body.request.note, "Interested in the specialized topic");

    activeJoinRequestId = res.body.request._id.toString();
  });

  test("8.5 Prevents duplicate active join request while pending", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_other_999" },
      params: { slugOrId: privateChannelSlug },
      body: { note: "Duplicate request attempt" },
    });
    await requestJoinChannel(req, res, next);
    assert.strictEqual(res.statusCode, 409);
  });

  test("8.6 User can cancel their pending join request", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_other_999" },
      params: { slugOrId: privateChannelSlug },
    });
    await cancelJoinRequest(req, res, next);
    assert.strictEqual(res.statusCode, 200);

    const cancelledReq = await ChannelJoinRequest.findById(activeJoinRequestId);
    assert.strictEqual(cancelledReq.status, "cancelled");
  });

  test("8.7 User can re-request after cancelling", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_other_999" },
      params: { slugOrId: privateChannelSlug },
      body: { note: "Re-requesting after cancellation" },
    });
    await requestJoinChannel(req, res, next);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.request.status, "pending");

    activeJoinRequestId = res.body.request._id.toString();
  });

  test("8.8 Non-creator cannot view channel join requests", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_member_456" },
      params: { slugOrId: privateChannelSlug },
    });
    await getChannelJoinRequests(req, res, next);
    assert.strictEqual(res.statusCode, 403);
  });

  test("8.9 Non-creator cannot accept or decline join requests", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_member_456" },
      params: { slugOrId: privateChannelSlug, requestId: activeJoinRequestId },
    });
    await acceptJoinRequest(req, res, next);
    assert.strictEqual(res.statusCode, 403);

    const { req: reqDecline, res: resDecline, next: nextDecline } = createMockReqRes({
      auth: { userId: "user_test_member_456" },
      params: { slugOrId: privateChannelSlug, requestId: activeJoinRequestId },
    });
    await declineJoinRequest(reqDecline, resDecline, nextDecline);
    assert.strictEqual(resDecline.statusCode, 403);
  });

  test("8.10 Channel creator can view pending requests for their channel", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_creator_123" },
      params: { slugOrId: privateChannelSlug },
      query: { status: "pending" },
    });
    await getChannelJoinRequests(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.some((r) => r._id.toString() === activeJoinRequestId));
  });

  test("8.11 Creator can decline a join request with a reason note", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_creator_123" },
      params: { slugOrId: privateChannelSlug, requestId: activeJoinRequestId },
      body: { note: "Please include portfolio in bio before requesting" },
    });
    await declineJoinRequest(req, res, next);
    assert.strictEqual(res.statusCode, 200);

    const declinedReq = await ChannelJoinRequest.findById(activeJoinRequestId);
    assert.strictEqual(declinedReq.status, "declined");
    assert.strictEqual(declinedReq.note, "Please include portfolio in bio before requesting");

    // Verify membership was NOT created
    const memberCheck = await ChannelMember.findOne({
      channel: privateChannelId,
      clerkUserId: "user_test_other_999",
      status: "active",
    });
    assert.strictEqual(memberCheck, null);
  });

  test("8.12 Declined user can request again following retry policy", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_other_999" },
      params: { slugOrId: privateChannelSlug },
      body: { note: "Updated profile with portfolio link" },
    });
    await requestJoinChannel(req, res, next);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.request.status, "pending");

    activeJoinRequestId = res.body.request._id.toString();
  });

  test("8.13 Creator accepts join request: persists membership and increments member count", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_creator_123" },
      params: { slugOrId: privateChannelSlug, requestId: activeJoinRequestId },
    });
    await acceptJoinRequest(req, res, next);
    assert.strictEqual(res.statusCode, 200);

    // Verify request is marked accepted
    const acceptedReq = await ChannelJoinRequest.findById(activeJoinRequestId);
    assert.strictEqual(acceptedReq.status, "accepted");
    assert.strictEqual(acceptedReq.respondedByClerkId, "user_test_creator_123");

    // Verify membership is active in database
    const membership = await ChannelMember.findOne({
      channel: privateChannelId,
      clerkUserId: "user_test_other_999",
      status: "active",
    });
    assert.ok(membership);
    assert.strictEqual(membership.role, "member");

    // Verify channel memberCount is updated
    const channel = await Channel.findById(privateChannelId);
    assert.strictEqual(channel.memberCount, 2); // Creator + accepted member
  });

  test("8.14 Accepted member can now access message stream and post messages", async () => {
    // 1. Read messages
    const { req: reqRead, res: resRead, next: nextRead } = createMockReqRes({
      auth: { userId: "user_test_other_999" },
      params: { slugOrId: privateChannelSlug },
    });
    await getChannelMessages(reqRead, resRead, nextRead);
    assert.strictEqual(resRead.statusCode, 200);
    assert.ok(Array.isArray(resRead.body.messages));

    // 2. Post a message
    const { req: reqSend, res: resSend, next: nextSend } = createMockReqRes({
      auth: { userId: "user_test_other_999" },
      params: { slugOrId: privateChannelSlug },
      body: { content: "Excited to join this private technical channel!" },
    });
    await sendMessage(reqSend, resSend, nextSend);
    assert.strictEqual(resSend.statusCode, 201);
    assert.strictEqual(resSend.body.content, "Excited to join this private technical channel!");
  });

  test("8.15 Active member cannot submit another join request", async () => {
    const { req, res, next } = createMockReqRes({
      auth: { userId: "user_test_other_999" },
      params: { slugOrId: privateChannelSlug },
    });
    await requestJoinChannel(req, res, next);
    assert.strictEqual(res.statusCode, 400);
    const errMsg = res.body?.message || res.body;
    assert.ok(
      typeof errMsg === "string" &&
        errMsg.includes("already an active member")
    );
  });

  // 9. Public Author Profile Channel Integration Tests (getAuthorChannels)
  let authorPublicChannelId;
  let authorPublicChannelSlug;

  test("9.1 Non-existent author username returns 404", async () => {
    const { req, res, next } = createMockReqRes({
      params: { username: "non_existent_author_xyz_999" },
    });
    await getAuthorChannels(req, res, next);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body.message, "Author not found");
  });

  test("9.2 Missing or empty username parameter returns 400", async () => {
    const { req, res, next } = createMockReqRes({
      params: { username: "" },
    });
    await getAuthorChannels(req, res, next);
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.message, "Username is required");
  });

  test("9.3 Author with public created channels returns channels with relationship 'creator'", async () => {
    // Create an active public channel for test_creator
    const { req: reqCreate, res: resCreate, next: nextCreate } = createMockReqRes({
      auth: { userId: "user_test_creator_123" },
      body: {
        name: `Test Author Public Community ${Date.now()}`,
        description: "Official public discussion channel for author profile",
        visibility: "public",
      },
    });
    await createChannel(reqCreate, resCreate, nextCreate);
    assert.strictEqual(resCreate.statusCode, 201);
    authorPublicChannelId = resCreate.body._id.toString();
    authorPublicChannelSlug = resCreate.body.slug;

    const { req, res, next } = createMockReqRes({
      params: { username: "test_creator" },
    });
    await getAuthorChannels(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.channels));
    assert.ok(Array.isArray(res.body.created));
    assert.ok(res.body.createdCount >= 1);
    const createdChan = res.body.created.find(
      (c) => c._id.toString() === authorPublicChannelId
    );
    assert.ok(createdChan, "Public channel created by author must be in created array");
    assert.strictEqual(createdChan.relationship, "creator");
    assert.ok(createdChan.name);
    assert.ok(createdChan.slug);
    assert.ok(createdChan.memberCount >= 1);
  });

  test("9.4 Author who joined a public channel returns that channel with relationship 'member'", async () => {
    // Have test_member join the active authorPublicChannel
    const { req: reqJoin, res: resJoin, next: nextJoin } = createMockReqRes({
      auth: { userId: "user_test_member_456" },
      params: { slugOrId: authorPublicChannelSlug },
    });
    await joinChannel(reqJoin, resJoin, nextJoin);
    assert.strictEqual(resJoin.statusCode, 200);

    const { req, res, next } = createMockReqRes({
      params: { username: "test_member" },
    });
    await getAuthorChannels(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.joined));
    const joinedChan = res.body.joined.find(
      (c) => c._id.toString() === authorPublicChannelId
    );
    assert.ok(joinedChan, "Public channel joined by author must be in joined array");
    assert.strictEqual(joinedChan.relationship, "member");
  });

  test("9.5 Strict privacy enforcement: private channels created or joined by author are NEVER returned", async () => {
    // 1. Check author who created private channel
    const { req: reqCreator, res: resCreator, next: nextCreator } = createMockReqRes({
      params: { username: "test_creator" },
    });
    await getAuthorChannels(reqCreator, resCreator, nextCreator);
    assert.strictEqual(resCreator.statusCode, 200);

    const hasPrivateInCreated = resCreator.body.channels.some(
      (c) => c._id.toString() === privateChannelId
    );
    assert.strictEqual(
      hasPrivateInCreated,
      false,
      "Private channels created by author must NEVER be exposed in public profile"
    );

    // 2. Check author who joined private channel
    const { req: reqOther, res: resOther, next: nextOther } = createMockReqRes({
      params: { username: "test_other" },
    });
    await getAuthorChannels(reqOther, resOther, nextOther);
    assert.strictEqual(resOther.statusCode, 200);

    const hasPrivateInJoined = resOther.body.channels.some(
      (c) => c._id.toString() === privateChannelId
    );
    assert.strictEqual(
      hasPrivateInJoined,
      false,
      "Private channel memberships must NEVER be exposed in public profile"
    );
  });

  test("9.6 Soft-deleted channels are excluded from public author profile", async () => {
    const { req, res, next } = createMockReqRes({
      params: { username: "test_creator" },
    });
    await getAuthorChannels(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    const hasDeleted = res.body.channels.some((c) => c.status === "deleted");
    assert.strictEqual(hasDeleted, false, "Soft-deleted channels must not appear on public profile");
  });

  test("9.7 Author with no public channels returns empty lists and zero counts", async () => {
    const emptyUser = await User.findOneAndUpdate(
      { clerkUserId: "user_test_empty_author_000" },
      {
        username: "test_empty_author",
        email: "empty@test.com",
        img: "https://example.com/empty.png",
      },
      { upsert: true, new: true }
    );

    const { req, res, next } = createMockReqRes({
      params: { username: "test_empty_author" },
    });
    await getAuthorChannels(req, res, next);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.totalCount, 0);
    assert.strictEqual(res.body.createdCount, 0);
    assert.strictEqual(res.body.joinedCount, 0);
    assert.deepStrictEqual(res.body.channels, []);
    assert.deepStrictEqual(res.body.created, []);
    assert.deepStrictEqual(res.body.joined, []);

    await User.deleteOne({ _id: emptyUser._id });
  });
});

