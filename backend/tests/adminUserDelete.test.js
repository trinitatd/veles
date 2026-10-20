import "dotenv/config";
import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import test, { describe, before, after } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";

import connectDB from "../lib/connectDB.js";
import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import Channel from "../models/channel.model.js";
import Message from "../models/message.model.js";
import AdminLog from "../models/adminLog.model.js";

import { deleteAdminUser } from "../controllers/admin.controller.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";

const createMockReqRes = (overrides = {}) => {
  const req = {
    auth: {
      userId: "user_test_admin_delete_999",
      sessionClaims: { metadata: { role: "admin" } },
    },
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

describe("Admin User Deletion & Activity Preservation Tests", () => {
  let adminUser;
  let regularUser;
  let userWithActivities;
  let testPost;
  let testComment;
  let testChannel;
  let testMessage;

  before(async () => {
    await connectDB();

    // 1. Setup Admin user
    adminUser = await User.findOneAndUpdate(
      { clerkUserId: "user_test_admin_delete_999" },
      {
        username: "admin_tester",
        email: "admin_tester@test.com",
        img: "https://example.com/admin.png",
      },
      { upsert: true, new: true }
    );

    // 2. Setup Regular user to be deleted
    regularUser = await User.findOneAndUpdate(
      { clerkUserId: "user_test_regular_delete_111" },
      {
        username: "regular_to_delete",
        email: "regular_to_delete@test.com",
        img: "https://example.com/regular.png",
      },
      { upsert: true, new: true }
    );

    // 3. Setup User with activities (posts, comments, channels, messages)
    userWithActivities = await User.findOneAndUpdate(
      { clerkUserId: "user_test_active_delete_222" },
      {
        username: "active_to_delete",
        email: "active_to_delete@test.com",
        img: "https://example.com/active.png",
      },
      { upsert: true, new: true }
    );

    // Create post by userWithActivities
    testPost = await Post.create({
      user: userWithActivities._id,
      title: "Preserved Post by Deleted User",
      slug: `preserved-post-${Date.now()}`,
      desc: "This post must not be deleted when user is removed",
      content: "<p>Article content remains accessible</p>",
      category: "general",
    });

    // Create comment by userWithActivities
    testComment = await Comment.create({
      user: userWithActivities._id,
      post: testPost._id,
      desc: "Preserved comment from deleted author",
    });

    // Create channel by userWithActivities
    testChannel = await Channel.create({
      name: `Preserved Channel ${Date.now()}`,
      slug: `preserved-channel-${Date.now()}`,
      creator: userWithActivities._id,
      creatorClerkId: userWithActivities.clerkUserId,
      visibility: "public",
      status: "active",
      memberCount: 1,
    });

    // Create message by userWithActivities
    testMessage = await Message.create({
      channel: testChannel._id,
      sender: userWithActivities._id,
      senderClerkId: userWithActivities.clerkUserId,
      content: "Preserved channel message from deleted user",
    });
  });

  after(async () => {
    // Cleanup created test documents
    if (testPost?._id) await Post.findByIdAndDelete(testPost._id);
    if (testComment?._id) await Comment.findByIdAndDelete(testComment._id);
    if (testChannel?._id) await Channel.findByIdAndDelete(testChannel._id);
    if (testMessage?._id) await Message.findByIdAndDelete(testMessage._id);
    if (adminUser?._id) await User.findByIdAndDelete(adminUser._id);
    if (regularUser?._id) await User.findByIdAndDelete(regularUser._id);
    if (userWithActivities?._id) await User.findByIdAndDelete(userWithActivities._id);
    await AdminLog.deleteMany({ adminClerkId: "user_test_admin_delete_999" });
    await mongoose.connection.close();
    setTimeout(() => process.exit(0), 500).unref();
  });

  test("1.1 requireAdmin middleware blocks unauthenticated requests", async () => {
    let nextCalled = false;
    const { req, res } = createMockReqRes({ auth: {} });
    await requireAdmin(req, res, () => {
      nextCalled = true;
    });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(nextCalled, false);
  });

  test("1.2 requireAdmin middleware blocks non-admin users with 403", async () => {
    let nextCalled = false;
    const { req, res } = createMockReqRes({
      auth: {
        userId: "user_test_regular_delete_111",
        sessionClaims: { metadata: { role: "user" } },
      },
    });
    await requireAdmin(req, res, () => {
      nextCalled = true;
    });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(nextCalled, false);
  });

  test("1.3 requireAdmin allows verified administrators through", async () => {
    let nextCalled = false;
    const { req, res } = createMockReqRes({
      auth: {
        userId: "user_test_admin_delete_999",
        sessionClaims: { metadata: { role: "admin" } },
      },
    });
    await requireAdmin(req, res, () => {
      nextCalled = true;
    });
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.auth.role, "admin");
  });

  test("2.1 Admin cannot delete their own administrator account", async () => {
    const { req, res, next } = createMockReqRes({
      params: { id: adminUser._id.toString() },
    });
    await deleteAdminUser(req, res, next);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(
      typeof res.body === "string" &&
        res.body.includes("cannot delete your own administrator account")
    );
  });

  test("2.2 Deleting a non-existent user returns 404", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const { req, res, next } = createMockReqRes({
      params: { id: fakeId.toString() },
    });
    await deleteAdminUser(req, res, next);
    assert.strictEqual(res.statusCode, 404);
  });

  test("2.3 Admin can successfully remove a user by MongoDB ObjectId", async () => {
    const { req, res, next } = createMockReqRes({
      params: { id: regularUser._id.toString() },
    });
    await deleteAdminUser(req, res, next);

    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body.message.includes("removed across platforms successfully"));

    // Verify user is deleted from MongoDB
    const checkUser = await User.findById(regularUser._id);
    assert.strictEqual(checkUser, null);

    // Verify AdminLog was recorded
    const log = await AdminLog.findOne({
      adminClerkId: "user_test_admin_delete_999",
      action: "DELETE_USER",
      targetId: regularUser._id.toString(),
    });
    assert.ok(log, "Admin audit log for DELETE_USER must exist");
    assert.strictEqual(log.targetType, "user");
  });

  test("3.1 Deleting a user with activities removes user but PRESERVES all their activities", async () => {
    // Target user: userWithActivities
    const targetUserId = userWithActivities._id;

    // Verify user and activities exist before deletion
    const userBefore = await User.findById(targetUserId);
    assert.ok(userBefore, "User must exist before deletion");

    const postBefore = await Post.findById(testPost._id);
    assert.ok(postBefore, "Post must exist before user deletion");

    const commentBefore = await Comment.findById(testComment._id);
    assert.ok(commentBefore, "Comment must exist before user deletion");

    const channelBefore = await Channel.findById(testChannel._id);
    assert.ok(channelBefore, "Channel must exist before user deletion");

    const messageBefore = await Message.findById(testMessage._id);
    assert.ok(messageBefore, "Message must exist before user deletion");

    // Execute deletion by admin
    const { req, res, next } = createMockReqRes({
      params: { id: targetUserId.toString() },
    });
    await deleteAdminUser(req, res, next);

    assert.strictEqual(res.statusCode, 200);

    // 1. Verify user document is deleted
    const userAfter = await User.findById(targetUserId);
    assert.strictEqual(userAfter, null, "User document must be removed from User collection");

    // 2. CRITICAL: Verify Post is NOT removed (activities preserved)
    const postAfter = await Post.findById(testPost._id);
    assert.ok(postAfter, "Post must NOT be removed when user is deleted");
    assert.strictEqual(
      postAfter.user.toString(),
      targetUserId.toString(),
      "Post retains user reference"
    );

    // 3. CRITICAL: Verify Comment is NOT removed (activities preserved)
    const commentAfter = await Comment.findById(testComment._id);
    assert.ok(commentAfter, "Comment must NOT be removed when user is deleted");
    assert.strictEqual(
      commentAfter.user.toString(),
      targetUserId.toString(),
      "Comment retains user reference"
    );

    // 4. CRITICAL: Verify Channel is NOT removed (activities preserved)
    const channelAfter = await Channel.findById(testChannel._id);
    assert.ok(channelAfter, "Channel must NOT be removed when creator is deleted");

    // 5. CRITICAL: Verify Message is NOT removed (activities preserved)
    const messageAfter = await Message.findById(testMessage._id);
    assert.ok(messageAfter, "Message must NOT be removed when sender is deleted");
  });

  test("2.4 Admin can remove a user by Clerk User ID string directly", async () => {
    const clerkUser = await User.create({
      clerkUserId: `user_test_clerk_${Date.now()}`,
      username: `user_clerk_${Date.now()}`,
      email: `clerk_${Date.now()}@test.com`,
    });

    const { req, res, next } = createMockReqRes({
      params: { id: clerkUser.clerkUserId },
    });
    await deleteAdminUser(req, res, next);

    assert.strictEqual(res.statusCode, 200);
    const checkUser = await User.findById(clerkUser._id);
    assert.strictEqual(checkUser, null);
  });

  test("3.2 Webhook user.deleted removes user document without deleting their posts or comments", async () => {
    const webhookUser = await User.create({
      clerkUserId: `user_test_webhook_${Date.now()}`,
      username: `webhook_user_${Date.now()}`,
      email: `webhook_${Date.now()}@test.com`,
    });

    const webhookPost = await Post.create({
      user: webhookUser._id,
      title: "Webhook Preserved Post",
      slug: `webhook-post-${Date.now()}`,
      content: "<p>Content preserved after webhook</p>",
      category: "general",
    });

    const webhookComment = await Comment.create({
      user: webhookUser._id,
      post: webhookPost._id,
      desc: "Webhook Preserved Comment",
    });

    // Execute webhook user.deleted logic
    await User.findOneAndDelete({ clerkUserId: webhookUser.clerkUserId });

    // Verify user is deleted
    const checkUser = await User.findById(webhookUser._id);
    assert.strictEqual(checkUser, null);

    // Verify post and comment activities are preserved
    const checkPost = await Post.findById(webhookPost._id);
    assert.ok(checkPost, "Post must not be removed by user.deleted webhook");

    const checkComment = await Comment.findById(webhookComment._id);
    assert.ok(checkComment, "Comment must not be removed by user.deleted webhook");

    // Cleanup
    await Post.findByIdAndDelete(webhookPost._id);
    await Comment.findByIdAndDelete(webhookComment._id);
  });
});
