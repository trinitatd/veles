import User from "../models/user.model.js";
import { clerkClient } from "@clerk/express";

export const getOrSyncUser = async (clerkUserId) => {
  if (!clerkUserId) return null;

  try {
    let user = await User.findOne({ clerkUserId });
    if (user) {
      return user;
    }

    // If user not in MongoDB, fetch from Clerk API and sync
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    if (!clerkUser) return null;

    const email =
      clerkUser.emailAddresses?.[0]?.emailAddress || `${clerkUserId}@clerk.dev`;

    const baseUsername =
      clerkUser.username ||
      clerkUser.firstName ||
      email.split("@")[0] ||
      `user_${clerkUserId.slice(-6)}`;

    // Ensure username is unique in MongoDB
    let username = baseUsername.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!username) {
      username = `user_${clerkUserId.slice(-6)}`;
    }

    let existingUser = await User.findOne({ username });
    let counter = 1;
    while (existingUser && existingUser.clerkUserId !== clerkUserId) {
      username = `${baseUsername}_${counter}`;
      existingUser = await User.findOne({ username });
      counter++;
    }

    user = new User({
      clerkUserId,
      username,
      email,
      img: clerkUser.imageUrl,
    });

    await user.save();
    console.log(`Auto-synced user ${clerkUserId} (${username}) to MongoDB`);
    return user;
  } catch (err) {
    console.error("Error in getOrSyncUser:", err);
    return null;
  }
};

