import { useAuth, useUser } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { format } from "timeago.js";
import Image from "../components/Image";
import CreateChannelModal from "../components/CreateChannelModal";
import EditChannelModal from "../components/EditChannelModal";
import ConfirmModal from "../components/ConfirmModal";
import ManageRequestsModal from "../components/ManageRequestsModal";
import ThemeToggle from "../components/ThemeToggle";

const Dashboard = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("myPosts"); // "myPosts" | "saved" | "channels" | "readlist" | "liked"
  const [postToDelete, setPostToDelete] = useState(null);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [channelToEdit, setChannelToEdit] = useState(null);
  const [channelToDelete, setChannelToDelete] = useState(null);
  const [channelToLeave, setChannelToLeave] = useState(null);
  const [channelForRequests, setChannelForRequests] = useState(null);
  const [aboutText, setAboutText] = useState("");
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [usernameText, setUsernameText] = useState("");
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  // Fetch user profile to get and edit 'about' bio and username
  const { data: profile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const token = await getToken();
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/users/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return res.data;
    },
    enabled: !!isSignedIn,
  });

  useEffect(() => {
    if (profile?.about !== undefined) {
      setAboutText(profile.about);
    }
    if (profile?.username !== undefined) {
      setUsernameText(profile.username);
    }
  }, [profile]);

  const updateUsernameMutation = useMutation({
    mutationFn: async (newUsername) => {
      const token = await getToken();
      return axios.patch(
        `${import.meta.env.VITE_API_URL}/users/profile`,
        { username: newUsername },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: (res) => {
      toast.success("Username updated successfully!");
      setIsEditingUsername(false);
      setUsernameError("");
      if (res?.data) {
        queryClient.setQueryData(["userProfile"], res.data);
        if (res.data.username) {
          setUsernameText(res.data.username);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      queryClient.invalidateQueries({ queryKey: ["myPosts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (err) => {
      const message =
        err.response?.data?.message ||
        err.response?.data ||
        "Failed to update username";
      const errMsg =
        typeof message === "string" ? message : "Failed to update username";
      setUsernameError(errMsg);
      toast.error(errMsg);
    },
  });

  const handleSaveUsername = (e) => {
    e.preventDefault();
    setUsernameError("");
    const trimmed = usernameText.trim();
    if (!trimmed) {
      setUsernameError("Username cannot be empty");
      return;
    }
    if (trimmed.length < 3 || trimmed.length > 25) {
      setUsernameError("Username must be between 3 and 25 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setUsernameError(
        "Username can only contain letters, numbers, and underscores"
      );
      return;
    }
    updateUsernameMutation.mutate(trimmed);
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (newAbout) => {
      const token = await getToken();
      return axios.patch(
        `${import.meta.env.VITE_API_URL}/users/profile`,
        { about: newAbout },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: () => {
      toast.success("About / Bio updated successfully!");
      setIsEditingAbout(false);
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
    onError: (err) => {
      const message =
        err.response?.data?.message ||
        err.response?.data ||
        "Failed to update bio";
      toast.error(typeof message === "string" ? message : "Failed to update bio");
    },
  });

  const handleSaveAbout = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(aboutText);
  };

  // 1. My Authored Posts
  const {
    data: posts,
    isPending: isPostsPending,
    error: postsError,
  } = useQuery({
    queryKey: ["myPosts"],
    queryFn: async () => {
      const token = await getToken();
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/posts/user/my-posts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return res.data;
    },
    enabled: !!isSignedIn,
  });

  // 2. Saved Posts (Detailed)
  const {
    data: savedPosts,
    isPending: isSavedPending,
    error: savedError,
  } = useQuery({
    queryKey: ["savedPostsDetailed"],
    queryFn: async () => {
      const token = await getToken();
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/posts/user/saved-posts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return res.data;
    },
    enabled: !!isSignedIn,
  });

  // 3. Readlist Posts (Detailed)
  const {
    data: readlistPosts,
    isPending: isReadlistPending,
    error: readlistError,
  } = useQuery({
    queryKey: ["readlistPostsDetailed"],
    queryFn: async () => {
      const token = await getToken();
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/posts/user/readlist-posts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return res.data;
    },
    enabled: !!isSignedIn,
  });

  // 4. Liked Posts (Detailed)
  const {
    data: likedPosts,
    isPending: isLikedPending,
    error: likedError,
  } = useQuery({
    queryKey: ["likedPostsDetailed"],
    queryFn: async () => {
      const token = await getToken();
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/posts/user/liked-posts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return res.data;
    },
    enabled: !!isSignedIn,
  });

  // Delete My Post Mutation
  const deleteMutation = useMutation({
    mutationFn: async (postId) => {
      const token = await getToken();
      return axios.delete(`${import.meta.env.VITE_API_URL}/posts/${postId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
    onSuccess: () => {
      toast.success("Post deleted successfully!");
      setPostToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["myPosts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (err) => {
      const message =
        err.response?.data?.message ||
        err.response?.data ||
        "Failed to delete post";
      toast.error(typeof message === "string" ? message : "Failed to delete post");
      setPostToDelete(null);
    },
  });

  // Unsave Post Mutation
  const unsaveMutation = useMutation({
    mutationFn: async (postId) => {
      const token = await getToken();
      return axios.patch(
        `${import.meta.env.VITE_API_URL}/users/save`,
        { postId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: () => {
      toast.success("Post removed from saved");
      queryClient.invalidateQueries({ queryKey: ["savedPostsDetailed"] });
      queryClient.invalidateQueries({ queryKey: ["savedPosts"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data || "Failed to remove post from saved");
    },
  });

  // Remove From Readlist Mutation
  const removeReadlistMutation = useMutation({
    mutationFn: async (postId) => {
      const token = await getToken();
      return axios.patch(
        `${import.meta.env.VITE_API_URL}/users/readlist`,
        { postId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: () => {
      toast.success("Post removed from readlist");
      queryClient.invalidateQueries({ queryKey: ["readlistPostsDetailed"] });
      queryClient.invalidateQueries({ queryKey: ["readlist"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data || "Failed to remove post from readlist");
    },
  });

  // Unlike Post Mutation
  const unlikeMutation = useMutation({
    mutationFn: async (postId) => {
      const token = await getToken();
      return axios.patch(
        `${import.meta.env.VITE_API_URL}/posts/${postId}/like`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: () => {
      toast.success("Post unliked");
      queryClient.invalidateQueries({ queryKey: ["likedPostsDetailed"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data || "Failed to unlike post");
    },
  });

  // User Channels Query (Owned & Joined)
  const {
    data: userChannels,
    isPending: isChannelsPending,
    error: channelsError,
  } = useQuery({
    queryKey: ["userChannels"],
    queryFn: async () => {
      const token = await getToken();
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/channels/user`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return res.data;
    },
    enabled: !!isSignedIn,
  });

  // Delete Channel Mutation
  const deleteChannelMutation = useMutation({
    mutationFn: async (channelId) => {
      const token = await getToken();
      return axios.delete(
        `${import.meta.env.VITE_API_URL}/channels/${channelId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: () => {
      toast.success("Channel deleted successfully!");
      setChannelToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["userChannels"] });
    },
    onError: (err) => {
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        "Failed to delete channel";
      toast.error(typeof msg === "string" ? msg : "Failed to delete channel");
    },
  });

  // Leave Channel Mutation
  const leaveChannelMutation = useMutation({
    mutationFn: async (channelId) => {
      const token = await getToken();
      return axios.post(
        `${import.meta.env.VITE_API_URL}/channels/${channelId}/leave`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: () => {
      toast.info("Left channel successfully");
      setChannelToLeave(null);
      queryClient.invalidateQueries({ queryKey: ["userChannels"] });
    },
    onError: (err) => {
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        "Failed to leave channel";
      toast.error(typeof msg === "string" ? msg : "Failed to leave channel");
    },
  });

  const handleDeleteConfirm = () => {
    if (postToDelete) {
      deleteMutation.mutate(postToDelete._id);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500 dark:text-[#A5B0A7] text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (isLoaded && !isSignedIn) {
    return (
      <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pt-4">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-[#E5E9E4]">
            Access Restricted
          </h2>
          <p className="text-gray-600 dark:text-[#A5B0A7]">
            Please log in to view and manage your dashboard.
          </p>
          <Link
            to="/login"
            className="py-2.5 px-6 rounded-3xl bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-white font-medium transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  const postCount = posts?.length || 0;
  const totalViews =
    posts?.reduce((sum, post) => sum + (post.visit || 0), 0) || 0;
  const totalLikes =
    posts?.reduce((sum, post) => sum + (post.likes?.length || 0), 0) || 0;
  const totalComments =
    posts?.reduce((sum, post) => sum + (post.commentCount || 0), 0) || 0;

  return (
    <div className="flex flex-col gap-8 pb-12 max-w-7xl mx-auto w-full">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-200 dark:border-[#35443A]">
        <div className="flex items-center gap-4">
          <img
            src={user?.imageUrl || "/userImg.jpeg"}
            alt={user?.fullName || "User"}
            className="w-16 h-16 rounded-full object-cover border-2 border-green-800 shadow-sm"
          />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-[#E5E9E4]">
              Welcome, {user?.firstName || user?.fullName || "Author"}!
            </h1>
            <p className="text-sm text-gray-500 dark:text-[#A5B0A7]">
              {profile?.username ? `@${profile.username} • ` : ""}{user?.primaryEmailAddress?.emailAddress} • Dashboard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          {user?.publicMetadata?.role === "admin" && (
            <Link
              to="/admin"
              className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-emerald-900 text-white font-medium hover:bg-emerald-800 transition-colors shadow-sm text-sm"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Admin Panel</span>
            </Link>
          )}
          <ThemeToggle />
          <Link
            to="/write"
            className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] dark:border dark:border-[#35443A] text-white font-medium transition-colors shadow-sm"
          >
            <span>Create New Post</span>
           
          </Link>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* 1. MY ARTICLES */}
        <div
          onClick={() => setActiveTab("myPosts")}
          className="p-5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1 bg-white dark:bg-[#1B241E] border-gray-100 dark:border-[#35443A] shadow-sm hover:border-green-800 dark:hover:border-[#7BC98C] hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[#A5B0A7]">
              My Articles
            </span>
            <span className="text-base"></span>
          </div>
          <span className="text-3xl font-bold text-gray-800 dark:text-[#E5E9E4]">{postCount}</span>
          <span className="text-[11px] text-gray-400 dark:text-[#A5B0A7]">Published posts</span>
        </div>

        {/* 2. TOTAL VIEWS */}
        <div
          onClick={() => setActiveTab("myPosts")}
          className="p-5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1 bg-white dark:bg-[#1B241E] border-gray-100 dark:border-[#35443A] shadow-sm hover:border-blue-400 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[#A5B0A7]">
              Total Views
            </span>
            <span className="text-base"></span>
          </div>
          <span className="text-3xl font-bold text-blue-800 dark:text-blue-400">
            {totalViews.toLocaleString()}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-[#A5B0A7]">Across all posts</span>
        </div>

        {/* 3. TOTAL LIKES */}
        <div
          onClick={() => setActiveTab("myPosts")}
          className="p-5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1 bg-white dark:bg-[#1B241E] border-gray-100 dark:border-[#35443A] shadow-sm hover:border-red-400 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[#A5B0A7]">
              Total Likes
            </span>
            <span className="text-base"></span>
          </div>
          <span className="text-3xl font-bold text-red-600 dark:text-red-400">
            {totalLikes.toLocaleString()}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-[#A5B0A7]">Across all posts</span>
        </div>

        {/* 4. TOTAL COMMENTS */}
        <div
          onClick={() => setActiveTab("myPosts")}
          className="p-5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1 bg-white dark:bg-[#1B241E] border-gray-100 dark:border-[#35443A] shadow-sm hover:border-amber-400 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[#A5B0A7]">
              Total Comments
            </span>
            <span className="text-base"></span>
          </div>
          <span className="text-3xl font-bold text-amber-700 dark:text-amber-400">
            {totalComments.toLocaleString()}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-[#A5B0A7]">Across all posts</span>
        </div>
      </div>

      {/* AUTHOR PROFILE SETTINGS (USERNAME & BIO) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AUTHOR USERNAME CARD */}
        <div className="bg-white dark:bg-[#1B241E] rounded-2xl border border-gray-100 dark:border-[#35443A] shadow-sm p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl"></span>
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-[#E5E9E4]">
                  Author Username
                </h2>
                <p className="text-xs text-gray-400 dark:text-[#A5B0A7]">
                  Your unique handle across the platform.
                </p>
              </div>
            </div>
            {!isEditingUsername && (
              <button
                onClick={() => {
                  setUsernameText(profile?.username || "");
                  setUsernameError("");
                  setIsEditingUsername(true);
                }}
                className="px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-[#35443A] hover:border-green-800 dark:hover:border-[#7BC98C] text-xs font-semibold text-gray-700 dark:text-[#E5E9E4] hover:text-green-800 dark:hover:text-[#7BC98C] transition-colors"
              >
                Change Username
              </button>
            )}
          </div>

          {isEditingUsername ? (
            <form onSubmit={handleSaveUsername} className="flex flex-col gap-3 mt-1">
              <div className="flex flex-col gap-1.5">
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-gray-400 dark:text-gray-500 font-semibold text-sm select-none">
                    @
                  </span>
                  <input
                    type="text"
                    value={usernameText}
                    onChange={(e) => {
                      setUsernameText(e.target.value);
                      if (usernameError) setUsernameError("");
                    }}
                    placeholder="username"
                    maxLength={25}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-[#35443A] bg-white dark:bg-[#111713] text-sm focus:outline-none focus:ring-2 focus:ring-green-800/20 focus:border-green-800 dark:focus:border-[#7BC98C] transition-all text-gray-700 dark:text-[#E5E9E4] dark:placeholder-gray-500"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 dark:text-[#A5B0A7] px-1">
                  <span>3-25 characters. Letters, numbers, underscores only.</span>
                  <span>{usernameText.length}/25</span>
                </div>
                {usernameError && (
                  <p className="text-xs text-red-500 dark:text-red-400 font-medium px-1">
                    {usernameError}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={updateUsernameMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {updateUsernameMutation.isPending ? "Saving..." : "Save Username"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsernameText(profile?.username || "");
                    setUsernameError("");
                    setIsEditingUsername(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-[#222D25] dark:hover:bg-[#2e3f34] text-gray-700 dark:text-[#E5E9E4] text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-gray-50/80 dark:bg-[#111713] p-4 rounded-xl border border-gray-100 dark:border-[#35443A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-h-[58px]">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-500 dark:text-[#A5B0A7]">Handle:</span>
                <span className="text-sm font-bold text-green-800 dark:text-[#7BC98C] bg-green-50 dark:bg-[#222D25] px-3 py-1 rounded-lg border border-green-200/50 dark:border-[#35443A]">
                  @{profile?.username || "Not set"}
                </span>
              </div>
             
            </div>
          )}
        </div>

        {/* AUTHOR BIO / ABOUT SECTION */}
        <div className="bg-white dark:bg-[#1B241E] rounded-2xl border border-gray-100 dark:border-[#35443A] shadow-sm p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl"></span>
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-[#E5E9E4]">
                  Author Bio
                </h2>
                <p className="text-xs text-gray-400 dark:text-[#A5B0A7]">
                  Displayed beside your articles in the author sidebar.
                </p>
              </div>
            </div>
            {!isEditingAbout && (
              <button
                onClick={() => setIsEditingAbout(true)}
                className="px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-[#35443A] hover:border-green-800 dark:hover:border-[#7BC98C] text-xs font-semibold text-gray-700 dark:text-[#E5E9E4] hover:text-green-800 dark:hover:text-[#7BC98C] transition-colors"
              >
                {profile?.about?.trim() ? "Edit About" : "Add About"}
              </button>
            )}
          </div>

          {isEditingAbout ? (
            <form onSubmit={handleSaveAbout} className="flex flex-col gap-3 mt-1">
              <textarea
                value={aboutText}
                onChange={(e) => setAboutText(e.target.value)}
                placeholder="Tell readers a bit about yourself, your background, or what you write about..."
                rows={3}
                className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-[#35443A] bg-white dark:bg-[#111713] text-sm focus:outline-none focus:ring-2 focus:ring-green-800/20 focus:border-green-800 dark:focus:border-[#7BC98C] transition-all text-gray-700 dark:text-[#E5E9E4] dark:placeholder-gray-500 leading-relaxed"
              />
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="px-4 py-2 rounded-xl bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save Bio"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAboutText(profile?.about || "");
                    setIsEditingAbout(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-[#222D25] dark:hover:bg-[#2e3f34] text-gray-700 dark:text-[#E5E9E4] text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-gray-50/80 dark:bg-[#111713] p-4 rounded-xl border border-gray-100 dark:border-[#35443A] min-h-[58px] flex items-center">
              {profile?.about?.trim() ? (
                <p className="text-sm text-slate-700 dark:text-[#E5E9E4] leading-relaxed line-clamp-3">
                  {profile.about}
                </p>
              ) : (
                <p className="text-sm text-gray-400 dark:text-[#A5B0A7] italic">
                  No bio added yet. Click 'Add About' to share a brief description about yourself.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* POSTS TABS & LIST SECTION */}
      <div className="bg-white dark:bg-[#1B241E] rounded-2xl border border-gray-100 dark:border-[#35443A] shadow-sm p-6 flex flex-col gap-6">
        {/* TABS HEADER */}
        <div className="flex items-center gap-2 md:gap-4 border-b border-gray-100 dark:border-[#35443A] pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab("myPosts")}
            className={`flex items-center gap-2 pb-2 px-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "myPosts"
                ? "border-green-800 text-green-800 dark:border-[#7BC98C] dark:text-[#7BC98C]"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:text-[#A5B0A7] dark:hover:text-[#E5E9E4]"
            }`}
          >
            <span>My Articles</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-[#222D25] dark:text-[#A5B0A7]">
              {posts?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("saved")}
            className={`flex items-center gap-2 pb-2 px-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "saved"
                ? "border-blue-800 text-blue-800 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:text-[#A5B0A7] dark:hover:text-[#E5E9E4]"
            }`}
          >
            <span>Saved Posts</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              {savedPosts?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("channels")}
            className={`flex items-center gap-2 pb-2 px-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "channels"
                ? "border-emerald-800 text-emerald-800 dark:border-[#7BC98C] dark:text-[#7BC98C]"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:text-[#A5B0A7] dark:hover:text-[#E5E9E4]"
            }`}
          >
            <span>My Channels</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              {(userChannels?.owned?.length || 0) + (userChannels?.joined?.length || 0)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("readlist")}
            className={`flex items-center gap-2 pb-2 px-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "readlist"
                ? "border-teal-800 text-teal-800 dark:border-teal-400 dark:text-teal-400"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:text-[#A5B0A7] dark:hover:text-[#E5E9E4]"
            }`}
          >
            <span>Readlist</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
              {readlistPosts?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("liked")}
            className={`flex items-center gap-2 pb-2 px-3 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "liked"
                ? "border-red-600 text-red-600 dark:border-red-400 dark:text-red-400"
                : "border-transparent text-gray-500 hover:text-gray-800 dark:text-[#A5B0A7] dark:hover:text-[#E5E9E4]"
            }`}
          >
            <span>Liked Posts</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-300">
              {likedPosts?.length || 0}
            </span>
          </button>
        </div>

        {/* TAB 1: MY ARTICLES */}
        {activeTab === "myPosts" && (
          <div>
            {isPostsPending ? (
              <div className="py-12 text-center text-gray-500">
                Loading your posts...
              </div>
            ) : postsError ? (
              <div className="py-12 text-center text-red-500">
                Failed to load posts. Please try again.
              </div>
            ) : posts?.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-[#222D25] flex items-center justify-center text-2xl">
                  📝
                </div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-[#E5E9E4]">
                  You haven't written any posts yet
                </h3>
                <p className="text-sm text-gray-500 dark:text-[#A5B0A7] max-w-md">
                  Share your insights, tutorials, or stories with the community.
                </p>
                <Link
                  to="/write"
                  className="mt-2 py-2 px-5 rounded-xl bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-white text-sm font-medium transition-colors"
                >
                  Write your first post
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-[#35443A] text-xs font-semibold uppercase text-gray-400 dark:text-[#A5B0A7] tracking-wider">
                      <th className="pb-3 pr-4">Post</th>
                      <th className="pb-3 px-4">Category</th>
                      <th className="pb-3 px-4">Published</th>
                      <th className="pb-3 px-4">Views</th>
                      <th className="pb-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#35443A] text-sm">
                    {posts.map((post) => (
                      <tr
                        key={post._id}
                        className="hover:bg-gray-50/60 dark:hover:bg-[#222D25]/60 transition-colors group"
                      >
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            {post.img ? (
                              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-100 dark:bg-[#222D25]">
                                <Image
                                  src={post.img}
                                  w="64"
                                  h="64"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-[#7BC98C] font-bold flex items-center justify-center shrink-0 text-sm">
                                {post.category?.slice(0, 2).toUpperCase() || "PO"}
                              </div>
                            )}
                            <div className="flex flex-col">
                              <Link
                                to={`/${post.slug}`}
                                className="font-semibold text-gray-800 dark:text-[#E5E9E4] group-hover:text-green-800 dark:group-hover:text-[#7BC98C] transition-colors line-clamp-1"
                              >
                                {post.title}
                              </Link>
                              <span className="text-xs text-gray-400 dark:text-[#A5B0A7] line-clamp-1">
                                {post.desc || "No description"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-[#222D25] text-gray-700 dark:text-[#A5B0A7] capitalize">
                            {post.category || "General"}
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-gray-500 dark:text-[#A5B0A7] text-xs">
                          {format(post.createdAt)}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-gray-700 dark:text-[#E5E9E4] font-medium">
                          {post.visit || 0}
                        </td>
                        <td className="py-4 pl-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/${post.slug}`}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-[#E5E9E4] hover:bg-gray-100 dark:hover:bg-[#222D25] transition-colors"
                              title="View Article"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </Link>

                            <Link
                              to={`/edit/${post._id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-medium transition-colors"
                              title="Edit Post"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                              <span>Edit</span>
                            </Link>

                            <button
                              onClick={() => setPostToDelete(post)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 text-xs font-medium transition-colors"
                              title="Delete Post"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-3.5 h-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SAVED POSTS */}
        {activeTab === "saved" && (
          <div>
            {isSavedPending ? (
              <div className="py-12 text-center text-gray-500 dark:text-[#A5B0A7]">
                Loading saved posts...
              </div>
            ) : savedError ? (
              <div className="py-12 text-center text-red-500 dark:text-red-400">
                Failed to load saved posts. Please try again.
              </div>
            ) : savedPosts?.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl">
                  🔖
                </div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-[#E5E9E4]">
                  No saved posts yet
                </h3>
                <p className="text-sm text-gray-500 dark:text-[#A5B0A7] max-w-md">
                  Click "Save this Post" on any article to bookmark it and find it here anytime.
                </p>
                <Link
                  to="/posts"
                  className="mt-2 py-2 px-5 rounded-xl bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-white text-sm font-medium transition-colors"
                >
                  Explore Articles
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-[#35443A] text-xs font-semibold uppercase text-gray-400 dark:text-[#A5B0A7] tracking-wider">
                      <th className="pb-3 pr-4">Article</th>
                      <th className="pb-3 px-4">Author</th>
                      <th className="pb-3 px-4">Category</th>
                      <th className="pb-3 px-4">Published</th>
                      <th className="pb-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#35443A] text-sm">
                    {savedPosts.map((post) => (
                      <tr
                        key={post._id}
                        className="hover:bg-gray-50/60 dark:hover:bg-[#222D25]/60 transition-colors group"
                      >
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            {post.img ? (
                              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-100 dark:bg-[#222D25]">
                                <Image
                                  src={post.img}
                                  w="64"
                                  h="64"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center shrink-0 text-sm">
                                {post.category?.slice(0, 2).toUpperCase() || "PO"}
                              </div>
                            )}
                            <div className="flex flex-col">
                              <Link
                                to={`/${post.slug}`}
                                className="font-semibold text-gray-800 dark:text-[#E5E9E4] group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors line-clamp-1"
                              >
                                {post.title}
                              </Link>
                              <span className="text-xs text-gray-400 dark:text-[#A5B0A7] line-clamp-1">
                                {post.desc || "No description"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-gray-600 dark:text-[#A5B0A7] text-xs font-medium">
                          {post.user?.username || "Unknown"}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-[#222D25] text-gray-700 dark:text-[#A5B0A7] capitalize">
                            {post.category || "General"}
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-gray-500 dark:text-[#A5B0A7] text-xs">
                          {format(post.createdAt)}
                        </td>
                        <td className="py-4 pl-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/${post.slug}`}
                              className="px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-green-800 dark:text-[#7BC98C] text-xs font-medium transition-colors"
                            >
                              Read
                            </Link>

                            <button
                              onClick={() => unsaveMutation.mutate(post._id)}
                              disabled={unsaveMutation.isPending}
                              className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-red-50 dark:bg-[#222D25] dark:hover:bg-red-950/60 text-gray-600 dark:text-[#A5B0A7] hover:text-red-600 dark:hover:text-red-300 text-xs font-medium transition-colors disabled:opacity-50"
                              title="Remove from saved"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: MY CHANNELS */}
        {activeTab === "channels" && (
          <div className="flex flex-col gap-8">
            {/* TOP BAR / ACTION HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100 dark:border-[#35443A]">
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-[#E5E9E4]">
                  Channel & Community Management
                </h3>
                <p className="text-xs text-gray-500 dark:text-[#A5B0A7]">
                  Manage channels you created and participate in real-time discussions.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to="/channels"
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-[#35443A] hover:border-gray-300 dark:hover:border-gray-600 text-xs font-semibold text-gray-700 dark:text-[#E5E9E4] transition-colors"
                >
                  Browse Channels  
                </Link>
                <button
                  onClick={() => setIsCreateChannelOpen(true)}
                  className="px-4 py-2 rounded-xl bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span>+</span>
                  <span>Create Channel</span>
                </button>
              </div>
            </div>

            {isChannelsPending ? (
              <div className="py-12 text-center text-gray-400 dark:text-[#A5B0A7] text-xs">
                Loading your channels...
              </div>
            ) : channelsError ? (
              <div className="py-12 text-center text-red-500 dark:text-red-400 text-xs">
                Failed to load channels. Please refresh.
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {/* 1. OWNED CHANNELS GROUP */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-[#E5E9E4] flex items-center gap-2">
                      <span>👑</span>
                      <span>Owned Channels</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50">
                        {userChannels?.owned?.length || 0}
                      </span>
                    </h4>
                  </div>

                  {userChannels?.owned?.length === 0 ? (
                    <div className="p-8 rounded-2xl border border-dashed border-gray-200 dark:border-[#35443A] text-center flex flex-col items-center justify-center gap-2 bg-gray-50/50 dark:bg-[#111713]/50">
                      <span className="text-2xl">🌱</span>
                      <p className="text-xs font-semibold text-gray-700 dark:text-[#E5E9E4]">
                        You haven't created any channels yet
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-[#A5B0A7] max-w-sm">
                        Create topic-based community channels where readers and fellow engineers can discuss articles and technology.
                      </p>
                      <button
                        onClick={() => setIsCreateChannelOpen(true)}
                        className="mt-2 px-4 py-1.5 rounded-xl bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-white text-xs font-medium transition-colors"
                      >
                        Create your first channel
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-[#35443A] text-xs font-semibold uppercase text-gray-400 dark:text-[#A5B0A7] tracking-wider">
                            <th className="pb-3 pr-4">Channel</th>
                            <th className="pb-3 px-4">Visibility</th>
                            <th className="pb-3 px-4">Members</th>
                            <th className="pb-3 px-4">Last Active</th>
                            <th className="pb-3 pl-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-[#35443A] text-sm">
                          {userChannels.owned.map((ch) => (
                            <tr
                              key={ch._id}
                              className="hover:bg-gray-50/60 dark:hover:bg-[#222D25]/60 transition-colors group"
                            >
                              <td className="py-4 pr-4">
                                <div className="flex flex-col">
                                  <Link
                                    to={`/channels/${ch.slug}`}
                                    className="font-bold text-gray-900 dark:text-[#E5E9E4] group-hover:text-green-800 dark:group-hover:text-[#7BC98C] transition-colors flex items-center gap-1.5"
                                  >
                                    <span>#</span>
                                    <span>{ch.name}</span>
                                  </Link>
                                  <span className="text-xs text-gray-500 dark:text-[#A5B0A7] line-clamp-1">
                                    {ch.description || "No description"}
                                  </span>
                                </div>
                              </td>

                              <td className="py-4 px-4 whitespace-nowrap">
                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-[#222D25] text-gray-700 dark:text-[#A5B0A7] capitalize">
                                  {ch.visibility === "private" ? "🔒 Private" : "🌐 Public"}
                                </span>
                              </td>

                              <td className="py-4 px-4 whitespace-nowrap text-xs text-gray-700 dark:text-[#E5E9E4] font-semibold">
                                {ch.memberCount || 1} members
                              </td>

                              <td className="py-4 px-4 whitespace-nowrap text-xs text-gray-500 dark:text-[#A5B0A7]">
                                {format(ch.lastActivityAt || ch.createdAt)}
                              </td>

                              <td className="py-4 pl-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                  {ch.visibility === "private" && (
                                    <button
                                      onClick={() => setChannelForRequests(ch)}
                                      className="relative px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 text-xs font-semibold transition-colors flex items-center gap-1.5 border border-emerald-200/60 dark:border-emerald-800/60"
                                      title="Manage Join Requests"
                                    >
                                      <span>📬 Requests</span>
                                      {ch.pendingRequestCount > 0 && (
                                        <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                                          {ch.pendingRequestCount}
                                        </span>
                                      )}
                                    </button>
                                  )}
                                  <Link
                                    to={`/channels/${ch.slug}`}
                                    className="px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-green-800 dark:text-[#7BC98C] text-xs font-semibold transition-colors"
                                  >
                                    Open
                                  </Link>
                                  <button
                                    onClick={() => setChannelToEdit(ch)}
                                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#35443A] hover:bg-gray-100 dark:hover:bg-[#222D25] text-gray-700 dark:text-[#E5E9E4] text-xs font-semibold transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => setChannelToDelete(ch)}
                                    className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 text-xs font-semibold transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 2. JOINED CHANNELS GROUP */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-[#E5E9E4] flex items-center gap-2">
                      <span>💬</span>
                      <span>Joined Channels</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                        {userChannels?.joined?.length || 0}
                      </span>
                    </h4>
                  </div>

                  {userChannels?.joined?.length === 0 ? (
                    <div className="p-8 rounded-2xl border border-dashed border-gray-200 dark:border-[#35443A] text-center flex flex-col items-center justify-center gap-2 bg-gray-50/50 dark:bg-[#111713]/50">
                      <span className="text-2xl">🔍</span>
                      <p className="text-xs font-semibold text-gray-700 dark:text-[#E5E9E4]">
                        You haven't joined any other channels yet
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-[#A5B0A7] max-w-sm">
                        Explore channels hosted by other authors and engineers to join relevant technical communities.
                      </p>
                      <Link
                        to="/channels"
                        className="mt-2 px-4 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-[#222D25] dark:hover:bg-[#2e3f34] text-gray-800 dark:text-[#E5E9E4] text-xs font-medium transition-colors"
                      >
                        Explore Public Channels
                      </Link>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-[#35443A] text-xs font-semibold uppercase text-gray-400 dark:text-[#A5B0A7] tracking-wider">
                            <th className="pb-3 pr-4">Channel</th>
                            <th className="pb-3 px-4">Creator</th>
                            <th className="pb-3 px-4">Members</th>
                            <th className="pb-3 px-4">Last Active</th>
                            <th className="pb-3 pl-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-[#35443A] text-sm">
                          {userChannels.joined.map((ch) => (
                            <tr
                              key={ch._id}
                              className="hover:bg-gray-50/60 dark:hover:bg-[#222D25]/60 transition-colors group"
                            >
                              <td className="py-4 pr-4">
                                <div className="flex flex-col">
                                  <Link
                                    to={`/channels/${ch.slug}`}
                                    className="font-bold text-gray-900 dark:text-[#E5E9E4] group-hover:text-green-800 dark:group-hover:text-[#7BC98C] transition-colors flex items-center gap-1.5"
                                  >
                                    <span>#</span>
                                    <span>{ch.name}</span>
                                  </Link>
                                  <span className="text-xs text-gray-500 dark:text-[#A5B0A7] line-clamp-1">
                                    {ch.description || "No description"}
                                  </span>
                                </div>
                              </td>

                              <td className="py-4 px-4 whitespace-nowrap text-xs text-gray-600 dark:text-[#A5B0A7] font-medium">
                                @{ch.creator?.username || "Author"}
                              </td>

                              <td className="py-4 px-4 whitespace-nowrap text-xs text-gray-700 dark:text-[#E5E9E4] font-semibold">
                                {ch.memberCount || 1} members
                              </td>

                              <td className="py-4 px-4 whitespace-nowrap text-xs text-gray-500 dark:text-[#A5B0A7]">
                                {format(ch.lastActivityAt || ch.createdAt)}
                              </td>

                              <td className="py-4 pl-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                  <Link
                                    to={`/channels/${ch.slug}`}
                                    className="px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-green-800 dark:text-[#7BC98C] text-xs font-semibold transition-colors"
                                  >
                                    Open
                                  </Link>
                                  <button
                                    onClick={() => setChannelToLeave(ch)}
                                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#35443A] hover:bg-red-50 dark:hover:bg-red-950/60 text-gray-600 dark:text-[#A5B0A7] hover:text-red-600 dark:hover:text-red-300 text-xs font-semibold transition-colors"
                                  >
                                    Leave
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: READLIST */}
        {activeTab === "readlist" && (
          <div>
            {isReadlistPending ? (
              <div className="py-12 text-center text-gray-500 dark:text-[#A5B0A7]">
                Loading reading list...
              </div>
            ) : readlistError ? (
              <div className="py-12 text-center text-red-500 dark:text-red-400">
                Failed to load readlist. Please try again.
              </div>
            ) : readlistPosts?.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center text-2xl">
                  📚
                </div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-[#E5E9E4]">
                  Your reading list is empty
                </h3>
                <p className="text-sm text-gray-500 dark:text-[#A5B0A7] max-w-md">
                  Add articles you'd like to read later by clicking "Add to Readlist" on any article page.
                </p>
                <Link
                  to="/posts"
                  className="mt-2 py-2 px-5 rounded-xl bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-white text-sm font-medium transition-colors"
                >
                  Discover Posts
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-[#35443A] text-xs font-semibold uppercase text-gray-400 dark:text-[#A5B0A7] tracking-wider">
                      <th className="pb-3 pr-4">Article</th>
                      <th className="pb-3 px-4">Author</th>
                      <th className="pb-3 px-4">Category</th>
                      <th className="pb-3 px-4">Published</th>
                      <th className="pb-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#35443A] text-sm">
                    {readlistPosts.map((post) => (
                      <tr
                        key={post._id}
                        className="hover:bg-gray-50/60 dark:hover:bg-[#222D25]/60 transition-colors group"
                      >
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            {post.img ? (
                              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-100 dark:bg-[#222D25]">
                                <Image
                                  src={post.img}
                                  w="64"
                                  h="64"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center shrink-0 text-sm">
                                {post.category?.slice(0, 2).toUpperCase() || "PO"}
                              </div>
                            )}
                            <div className="flex flex-col">
                              <Link
                                to={`/${post.slug}`}
                                className="font-semibold text-gray-800 dark:text-[#E5E9E4] group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors line-clamp-1"
                              >
                                {post.title}
                              </Link>
                              <span className="text-xs text-gray-400 dark:text-[#A5B0A7] line-clamp-1">
                                {post.desc || "No description"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-gray-600 dark:text-[#A5B0A7] text-xs font-medium">
                          {post.user?.username || "Unknown"}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-[#222D25] text-gray-700 dark:text-[#A5B0A7] capitalize">
                            {post.category || "General"}
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-gray-500 dark:text-[#A5B0A7] text-xs">
                          {format(post.createdAt)}
                        </td>
                        <td className="py-4 pl-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/${post.slug}`}
                              className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 text-xs font-medium transition-colors"
                            >
                              Read
                            </Link>

                            <button
                              onClick={() => removeReadlistMutation.mutate(post._id)}
                              disabled={removeReadlistMutation.isPending}
                              className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-red-50 dark:bg-[#222D25] dark:hover:bg-red-950/60 text-gray-600 dark:text-[#A5B0A7] hover:text-red-600 dark:hover:text-red-300 text-xs font-medium transition-colors disabled:opacity-50"
                              title="Remove from readlist"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: LIKED POSTS */}
        {activeTab === "liked" && (
          <div>
            {isLikedPending ? (
              <div className="py-12 text-center text-gray-500 dark:text-[#A5B0A7]">
                Loading liked posts...
              </div>
            ) : likedError ? (
              <div className="py-12 text-center text-red-500 dark:text-red-400">
                Failed to load liked posts. Please try again.
              </div>
            ) : likedPosts?.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center text-2xl">
                  ❤️
                </div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-[#E5E9E4]">
                  No liked posts yet
                </h3>
                <p className="text-sm text-gray-500 dark:text-[#A5B0A7] max-w-md">
                  When you like articles by clicking the heart icon, they will be organized right here for you.
                </p>
                <Link
                  to="/posts"
                  className="mt-2 py-2 px-5 rounded-xl bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-white text-sm font-medium transition-colors"
                >
                  Explore Articles
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-[#35443A] text-xs font-semibold uppercase text-gray-400 dark:text-[#A5B0A7] tracking-wider">
                      <th className="pb-3 pr-4">Article</th>
                      <th className="pb-3 px-4">Author</th>
                      <th className="pb-3 px-4">Category</th>
                      <th className="pb-3 px-4">Likes</th>
                      <th className="pb-3 pl-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#35443A] text-sm">
                    {likedPosts.map((post) => (
                      <tr
                        key={post._id}
                        className="hover:bg-gray-50/60 dark:hover:bg-[#222D25]/60 transition-colors group"
                      >
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            {post.img ? (
                              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-gray-100 dark:bg-[#222D25]">
                                <Image
                                  src={post.img}
                                  w="64"
                                  h="64"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-bold flex items-center justify-center shrink-0 text-sm">
                                {post.category?.slice(0, 2).toUpperCase() || "PO"}
                              </div>
                            )}
                            <div className="flex flex-col">
                              <Link
                                to={`/${post.slug}`}
                                className="font-semibold text-gray-800 dark:text-[#E5E9E4] group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors line-clamp-1"
                              >
                                {post.title}
                              </Link>
                              <span className="text-xs text-gray-400 dark:text-[#A5B0A7] line-clamp-1">
                                {post.desc || "No description"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-gray-600 dark:text-[#A5B0A7] text-xs font-medium">
                          {post.user?.username || "Unknown"}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-[#222D25] text-gray-700 dark:text-[#A5B0A7] capitalize">
                            {post.category || "General"}
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 text-xs font-semibold">
                            <span>❤️</span>
                            <span>{post.likes?.length || 0}</span>
                          </span>
                        </td>
                        <td className="py-4 pl-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/${post.slug}`}
                              className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-xs font-medium transition-colors"
                            >
                              Read
                            </Link>

                            <button
                              onClick={() => unlikeMutation.mutate(post._id)}
                              disabled={unlikeMutation.isPending}
                              className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-red-50 dark:bg-[#222D25] dark:hover:bg-red-950/60 text-gray-600 dark:text-[#A5B0A7] hover:text-red-600 dark:hover:text-red-300 text-xs font-medium transition-colors disabled:opacity-50"
                              title="Unlike post"
                            >
                              Unlike
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {postToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1B241E] border border-transparent dark:border-[#35443A] rounded-2xl max-w-md w-full p-6 shadow-xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center text-xl shrink-0">
              ⚠️
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-[#E5E9E4]">
                Delete Post
              </h3>
              <p className="text-sm text-gray-500 dark:text-[#A5B0A7] mt-1">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-gray-700 dark:text-[#E5E9E4]">
                  "{postToDelete.title}"
                </span>
                ? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setPostToDelete(null)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-[#E5E9E4] bg-gray-100 dark:bg-[#222D25] rounded-xl hover:bg-gray-200 dark:hover:bg-[#2e3f34] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* CHANNEL MODALS */}
      <CreateChannelModal
        isOpen={isCreateChannelOpen}
        onClose={() => setIsCreateChannelOpen(false)}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["userChannels"] });
        }}
      />

      <EditChannelModal
        isOpen={!!channelToEdit}
        channel={channelToEdit}
        onClose={() => setChannelToEdit(null)}
        onUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ["userChannels"] });
        }}
      />

      <ConfirmModal
        isOpen={!!channelToDelete}
        title="Delete Channel"
        message={`Are you sure you want to delete #${channelToDelete?.name}? This channel will be removed and members will no longer be able to message.`}
        confirmText="Delete Channel"
        confirmStyle="danger"
        isLoading={deleteChannelMutation.isPending}
        onConfirm={() => {
          if (channelToDelete) deleteChannelMutation.mutate(channelToDelete._id);
        }}
        onClose={() => setChannelToDelete(null)}
      />

      <ConfirmModal
        isOpen={!!channelToLeave}
        title="Leave Channel"
        message={`Are you sure you want to leave #${channelToLeave?.name}? You can rejoin anytime.`}
        confirmText="Leave Channel"
        confirmStyle="danger"
        isLoading={leaveChannelMutation.isPending}
        onConfirm={() => {
          if (channelToLeave) leaveChannelMutation.mutate(channelToLeave._id);
        }}
        onClose={() => setChannelToLeave(null)}
      />

      <ManageRequestsModal
        isOpen={!!channelForRequests}
        channel={channelForRequests}
        onClose={() => setChannelForRequests(null)}
        onRequestHandled={() => {
          queryClient.invalidateQueries({ queryKey: ["userChannels"] });
        }}
      />
    </div>
  );
};

export default Dashboard;
