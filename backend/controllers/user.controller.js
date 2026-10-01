import User from "../models/user.model.js";
import { getOrSyncUser } from "../lib/userSync.js";

export const getUserSavedPosts = async (req, res) => {
  const clerkUserId = req.auth.userId;

  if (!clerkUserId) {
    return res.status(401).json("Not authenticated!");
  }

  const user = await getOrSyncUser(clerkUserId);

  if (!user) {
    return res.status(404).json("User not found!");
  }

  res.status(200).json(user.savedPosts || []);
};

export const savePost = async (req, res) => {
  const clerkUserId = req.auth.userId;
  const postId = req.body.postId;

  if (!clerkUserId) {
    return res.status(401).json("Not authenticated!");
  }

  const user = await getOrSyncUser(clerkUserId);

  if (!user) {
    return res.status(404).json("User not found!");
  }

  const savedPosts = user.savedPosts || [];
  const isSaved = savedPosts.some((p) => p === postId);

  if (!isSaved) {
    await User.findByIdAndUpdate(user._id, {
      $push: { savedPosts: postId },
    });
  } else {
    await User.findByIdAndUpdate(user._id, {
      $pull: { savedPosts: postId },
    });
  }

  res.status(200).json(isSaved ? "Post unsaved" : "Post saved");
};

export const getUserProfile = async (req, res) => {
  const clerkUserId = req.auth.userId;

  if (!clerkUserId) {
    return res.status(401).json("Not authenticated!");
  }

  const user = await getOrSyncUser(clerkUserId);

  if (!user) {
    return res.status(404).json("User not found!");
  }

  res.status(200).json({
    _id: user._id,
    clerkUserId: user.clerkUserId,
    username: user.username,
    email: user.email,
    img: user.img,
    about: user.about || "",
    savedPosts: user.savedPosts || [],
    readlist: user.readlist || [],
  });
};

export const updateUserProfile = async (req, res) => {
  try {
    const clerkUserId = req.auth.userId;

    if (!clerkUserId) {
      return res.status(401).json("Not authenticated!");
    }

    const user = await getOrSyncUser(clerkUserId);

    if (!user) {
      return res.status(404).json("User not found!");
    }

    const { about, username } = req.body;

    // Handle username update
    if (username !== undefined) {
      if (typeof username !== "string") {
        return res.status(400).json("Username must be a valid text string!");
      }

      const cleanUsername = username.trim();

      if (!cleanUsername) {
        return res.status(400).json("Username cannot be empty!");
      }

      if (cleanUsername.length < 3 || cleanUsername.length > 25) {
        return res
          .status(400)
          .json("Username must be between 3 and 25 characters long!");
      }

      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(cleanUsername)) {
        return res
          .status(400)
          .json("Username can only contain letters, numbers, and underscores!");
      }

      // Case-insensitive uniqueness check across other users
      const existingUser = await User.findOne({
        username: { $regex: new RegExp(`^${cleanUsername}$`, "i") },
        _id: { $ne: user._id },
      });

      if (existingUser) {
        return res
          .status(409)
          .json("Username is already taken. Please choose another one.");
      }

      user.username = cleanUsername;
    }

    if (about !== undefined) {
      user.about = typeof about === "string" ? about.trim() : "";
    }

    await user.save();

    res.status(200).json({
      _id: user._id,
      clerkUserId: user.clerkUserId,
      username: user.username,
      email: user.email,
      img: user.img,
      about: user.about || "",
      savedPosts: user.savedPosts || [],
      readlist: user.readlist || [],
    });
  } catch (err) {
    console.error("Error updating user profile:", err);
    if (err.code === 11000) {
      return res
        .status(409)
        .json("Username is already taken. Please choose another one.");
    }
    res.status(500).json("An error occurred while updating profile.");
  }
};

export const getUserReadlist = async (req, res) => {
  const clerkUserId = req.auth.userId;

  if (!clerkUserId) {
    return res.status(401).json("Not authenticated!");
  }

  const user = await getOrSyncUser(clerkUserId);

  if (!user) {
    return res.status(404).json("User not found!");
  }

  res.status(200).json(user.readlist || []);
};

export const toggleReadlist = async (req, res) => {
  const clerkUserId = req.auth.userId;
  const postId = req.body.postId;

  if (!clerkUserId) {
    return res.status(401).json("Not authenticated!");
  }

  const user = await getOrSyncUser(clerkUserId);

  if (!user) {
    return res.status(404).json("User not found!");
  }

  const readlist = user.readlist || [];
  const isInReadlist = readlist.some((p) => p === postId);

  if (!isInReadlist) {
    await User.findByIdAndUpdate(user._id, {
      $push: { readlist: postId },
    });
  } else {
    await User.findByIdAndUpdate(user._id, {
      $pull: { readlist: postId },
    });
  }

  res.status(200).json(isInReadlist ? "Removed from Readlist" : "Added to Readlist");
};
