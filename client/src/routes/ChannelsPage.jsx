import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import axios from "axios";
import { toast } from "react-toastify";
import { format } from "timeago.js";

import { buildApiUrl } from "../utils/api";
import { useChannelSocket } from "../utils/useChannelSocket";
import CreateChannelModal from "../components/CreateChannelModal";
import EditChannelModal from "../components/EditChannelModal";
import ReportMessageModal from "../components/ReportMessageModal";
import ConfirmModal from "../components/ConfirmModal";
import ChannelMembersModal from "../components/ChannelMembersModal";
import ManageRequestsModal from "../components/ManageRequestsModal";

const ChannelsPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";

  // Channel navigation and search state
  const [channels, setChannels] = useState([]);
  const [userChannels, setUserChannels] = useState({ owned: [], joined: [] });
  const [searchTerm, setSearchTerm] = useState("");
  const [activeChannel, setActiveChannel] = useState(null);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Messages state
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editInput, setEditInput] = useState("");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isRequestsOpen, setIsRequestsOpen] = useState(false);
  const [channelMembers, setChannelMembers] = useState([]);
  const [reportingMessage, setReportingMessage] = useState(null);
  const [deletingMessage, setDeletingMessage] = useState(null);
  const [confirmDeleteChannel, setConfirmDeleteChannel] = useState(false);
  const [confirmLeaveChannel, setConfirmLeaveChannel] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [requestActionLoading, setRequestActionLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const chatScrollContainerRef = useRef(null);

  // Auto-scroll to bottom
  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Socket event handlers
  const socketHandlers = {
    onNewMessage: (newMsg) => {
      setMessages((prev) => {
        // Prevent duplicate appending
        if (prev.some((m) => m._id === newMsg._id)) return prev;
        return [...prev, newMsg];
      });
      setTimeout(() => scrollToBottom("smooth"), 50);
    },
    onMessageEdited: (updatedMsg) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === updatedMsg._id ? updatedMsg : m))
      );
    },
    onMessageDeleted: ({ messageId, content, deletedAt }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, isDeleted: true, content, deletedAt }
            : m
        )
      );
    },
    onChannelUpdated: (updatedChannel) => {
      if (activeChannel?._id === updatedChannel._id) {
        setActiveChannel((prev) => ({ ...prev, ...updatedChannel }));
      }
      // Update in channels lists
      setChannels((prev) =>
        prev.map((c) => (c._id === updatedChannel._id ? updatedChannel : c))
      );
    },
    onChannelDeleted: ({ channelId, name, reason }) => {
      toast.warn(`Channel #${name} was deleted: ${reason}`);
      if (activeChannel?._id === channelId) {
        setActiveChannel(null);
        navigate("/channels");
      }
      fetchChannels();
      if (isSignedIn) fetchUserChannels();
    },
    onMemberJoined: ({ channelId, memberCount }) => {
      if (activeChannel?._id === channelId) {
        setActiveChannel((prev) => ({ ...prev, memberCount }));
      }
      setChannels((prev) =>
        prev.map((c) => (c._id === channelId ? { ...c, memberCount } : c))
      );
    },
    onMemberLeft: ({ channelId, memberCount }) => {
      if (activeChannel?._id === channelId) {
        setActiveChannel((prev) => ({ ...prev, memberCount }));
      }
      setChannels((prev) =>
        prev.map((c) => (c._id === channelId ? { ...c, memberCount } : c))
      );
    },
    onMemberRemoved: ({ channelId, clerkUserId, memberCount }) => {
      if (activeChannel?._id === channelId) {
        setActiveChannel((prev) => ({ ...prev, memberCount }));
        if (clerkUserId === user?.id) {
          toast.error("You were removed from this channel by the creator.");
          setActiveChannel((prev) => ({ ...prev, isMember: false }));
        }
      }
    },
    onSelfRemoved: ({ channelName, reason }) => {
      toast.error(`You have been removed from #${channelName}: ${reason}`);
      fetchChannels();
      if (isSignedIn) fetchUserChannels();
    },
    onNewJoinRequest: ({ channelId, channelName, user }) => {
      if (activeChannel?._id === channelId) {
        setActiveChannel((prev) => ({
          ...prev,
          pendingRequestCount: (prev.pendingRequestCount || 0) + 1,
        }));
      }
      toast.info(`New join request from @${user?.username || "user"} for #${channelName}`);
      fetchUserChannels();
    },
    onJoinRequestAccepted: ({ channelId, channelName }) => {
      toast.success(`Your request to join #${channelName} was accepted!`);
      if (activeChannel?._id === channelId) {
        setActiveChannel((prev) => ({
          ...prev,
          isMember: true,
          joinRequestStatus: "accepted",
        }));
      }
      fetchUserChannels();
      fetchChannels();
    },
    onJoinRequestDeclined: ({ channelId, channelName }) => {
      toast.info(`Your request to join #${channelName} was declined.`);
      if (activeChannel?._id === channelId) {
        setActiveChannel((prev) => ({
          ...prev,
          joinRequestStatus: "declined",
        }));
      }
      fetchChannels();
    },
    onJoinRequestCancelled: ({ channelId }) => {
      if (activeChannel?._id === channelId) {
        setActiveChannel((prev) => ({
          ...prev,
          pendingRequestCount: Math.max(0, (prev.pendingRequestCount || 1) - 1),
        }));
      }
      fetchUserChannels();
    },
  };

  // Socket connection hook
  const {
    connectionStatus,
    sendMessage: socketSendMessage,
    editMessage: socketEditMessage,
    deleteMessage: socketDeleteMessage,
  } = useChannelSocket(activeChannel?._id, socketHandlers);

  // Fetch all public channels
  const fetchChannels = async () => {
    try {
      setLoadingChannels(true);
      let headers = {};
      if (isSignedIn) {
        const token = await getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const res = await axios.get(
        buildApiUrl("/channels?limit=50"),
        { headers }
      );
      setChannels(res.data.channels || []);
    } catch (err) {
      console.error("Error fetching channels:", err);
    } finally {
      setLoadingChannels(false);
    }
  };

  // Fetch user's owned and joined channels
  const fetchUserChannels = async () => {
    if (!isSignedIn) return;
    try {
      const token = await getToken();
      const res = await axios.get(
        buildApiUrl("/channels/user"),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setUserChannels(res.data || { owned: [], joined: [] });
    } catch (err) {
      console.error("Error fetching user channels:", err);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, [isSignedIn]);

  useEffect(() => {
    if (isSignedIn) {
      fetchUserChannels();
    }
  }, [isSignedIn]);

  // Load active channel when URL slug changes
  useEffect(() => {
    if (!slug) {
      setActiveChannel(null);
      setMessages([]);
      return;
    }

    const loadChannelBySlug = async () => {
      try {
        setLoadingMessages(true);
        let headers = {};
        if (isSignedIn) {
          const token = await getToken();
          if (token) headers.Authorization = `Bearer ${token}`;
        }
        const res = await axios.get(
          buildApiUrl(`/channels/${slug}`),
          { headers }
        );
        setActiveChannel(res.data);
      } catch (err) {
        console.error("Error loading channel:", err);
        if (err.response?.status === 403) {
          toast.error("This is a private channel. You must be an authorized member.");
        } else if (err.response?.status === 404) {
          toast.error("Channel not found");
        }
        setActiveChannel(null);
        navigate("/channels");
      } finally {
        setLoadingMessages(false);
      }
    };

    loadChannelBySlug();
  }, [slug, isSignedIn]);

  // Load message stream when activeChannel changes
  useEffect(() => {
    if (!activeChannel || !activeChannel.isMember) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        const token = await getToken();
        const res = await axios.get(
          buildApiUrl(`/channels/${activeChannel._id}/messages?limit=50`),
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setMessages(res.data.messages || []);
        setHasMoreMessages(res.data.hasMore || false);
        setTimeout(() => scrollToBottom("auto"), 100);
      } catch (err) {
        console.error("Error fetching channel messages:", err);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [activeChannel?._id, activeChannel?.isMember]);

  // Load older messages (pagination)
  const handleLoadOlder = async () => {
    if (!activeChannel || !hasMoreMessages || loadingMore || messages.length === 0)
      return;

    try {
      setLoadingMore(true);
      const oldestMessageDate = messages[0]?.createdAt;
      const token = await getToken();
      const res = await axios.get(
        buildApiUrl(`/channels/${activeChannel._id}/messages?limit=30&before=${oldestMessageDate}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const olderMessages = res.data.messages || [];
      setMessages((prev) => [...olderMessages, ...prev]);
      setHasMoreMessages(res.data.hasMore || false);
    } catch (err) {
      console.error("Error loading older messages:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Send message handler (via Socket.IO with REST fallback)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || isSending || !activeChannel) return;

    const content = messageInput.trim();
    setIsSending(true);

    try {
      if (connectionStatus === "connected") {
        await socketSendMessage(content);
      } else {
        // Fallback to REST endpoint if socket is reconnecting
        const token = await getToken();
        const res = await axios.post(
          buildApiUrl(`/channels/${activeChannel._id}/messages`),
          { content },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setMessages((prev) => {
          if (prev.some((m) => m._id === res.data._id)) return prev;
          return [...prev, res.data];
        });
      }

      setMessageInput("");
      setTimeout(() => scrollToBottom("smooth"), 50);
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error(err.message || "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  // Join Channel
  const handleJoinChannel = async () => {
    if (!isSignedIn) {
      navigate("/login");
      return;
    }
    if (!activeChannel) return;

    setIsActionLoading(true);
    try {
      const token = await getToken();
      const res = await axios.post(
        buildApiUrl(`/channels/${activeChannel._id}/join`),
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(`Joined #${activeChannel.name}!`);
      setActiveChannel((prev) => ({
        ...prev,
        isMember: true,
        memberCount: res.data.memberCount,
        role: "member",
      }));
      fetchUserChannels();
    } catch (err) {
      console.error("Error joining channel:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        "Failed to join channel";
      toast.error(typeof msg === "string" ? msg : "Failed to join channel");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Request to join private channel
  const handleRequestToJoin = async (note = "") => {
    if (!isSignedIn) {
      navigate("/login");
      return;
    }
    if (!activeChannel) return;

    setRequestActionLoading(true);
    try {
      const token = await getToken();
      const res = await axios.post(
        buildApiUrl(`/channels/${activeChannel._id}/request-join`),
        { note },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(
        res.data?.message || "Join request submitted! Awaiting creator approval."
      );
      setActiveChannel((prev) => ({
        ...prev,
        joinRequestStatus: "pending",
        joinRequestId: res.data?.request?._id,
      }));
      fetchChannels();
    } catch (err) {
      console.error("Error requesting to join channel:", err);
      const rawMsg = err.response?.data?.message || err.response?.data;
      const msg =
        typeof rawMsg === "string" && !rawMsg.trim().startsWith("<")
          ? rawMsg
          : "Failed to submit join request. Please try again.";
      toast.error(msg);
    } finally {
      setRequestActionLoading(false);
    }
  };

  // Cancel pending join request
  const handleCancelRequest = async () => {
    if (!activeChannel) return;

    setRequestActionLoading(true);
    try {
      const token = await getToken();
      await axios.post(
        buildApiUrl(`/channels/${activeChannel._id}/cancel-request`),
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.info("Join request cancelled");
      setActiveChannel((prev) => ({
        ...prev,
        joinRequestStatus: "cancelled",
      }));
      fetchChannels();
    } catch (err) {
      console.error("Error cancelling join request:", err);
      const rawMsg = err.response?.data?.message || err.response?.data;
      const msg =
        typeof rawMsg === "string" && !rawMsg.trim().startsWith("<")
          ? rawMsg
          : "Failed to cancel join request. Please try again.";
      toast.error(msg);
    } finally {
      setRequestActionLoading(false);
    }
  };

  // Leave Channel
  const handleLeaveChannel = async () => {
    if (!activeChannel) return;

    setIsActionLoading(true);
    try {
      const token = await getToken();
      await axios.post(
        buildApiUrl(`/channels/${activeChannel._id}/leave`),
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.info(`Left #${activeChannel.name}`);
      setActiveChannel((prev) => ({ ...prev, isMember: false }));
      setConfirmLeaveChannel(false);
      fetchUserChannels();
      fetchChannels();
    } catch (err) {
      console.error("Error leaving channel:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        "Failed to leave channel";
      toast.error(typeof msg === "string" ? msg : "Failed to leave channel");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Delete Channel (Creator or Admin)
  const handleDeleteChannel = async () => {
    if (!activeChannel) return;

    setIsActionLoading(true);
    try {
      const token = await getToken();
      await axios.delete(
        buildApiUrl(`/channels/${activeChannel._id}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(`Channel #${activeChannel.name} deleted`);
      setConfirmDeleteChannel(false);
      setActiveChannel(null);
      navigate("/channels");
      fetchChannels();
      fetchUserChannels();
    } catch (err) {
      console.error("Error deleting channel:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        "Failed to delete channel";
      toast.error(typeof msg === "string" ? msg : "Failed to delete channel");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Edit message
  const handleSaveEdit = async (messageId) => {
    if (!editInput.trim()) return;

    try {
      if (connectionStatus === "connected") {
        await socketEditMessage(messageId, editInput.trim());
      } else {
        const token = await getToken();
        const res = await axios.patch(
          buildApiUrl(`/channels/${activeChannel._id}/messages/${messageId}`),
          { content: editInput.trim() },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? res.data : m))
        );
      }
      setEditingMessageId(null);
      setEditInput("");
    } catch (err) {
      toast.error(err.message || "Failed to update message");
    }
  };

  // Delete message (sender, creator, admin)
  const handleConfirmDeleteMessage = async () => {
    if (!deletingMessage) return;

    setIsActionLoading(true);
    try {
      if (connectionStatus === "connected") {
        await socketDeleteMessage(deletingMessage._id, "Message deleted by user");
      } else {
        const token = await getToken();
        await axios.delete(
          buildApiUrl(`/channels/${activeChannel._id}/messages/${deletingMessage._id}`),
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setMessages((prev) =>
          prev.map((m) =>
            m._id === deletingMessage._id
              ? { ...m, isDeleted: true, content: "[This message was deleted]" }
              : m
          )
        );
      }
      setDeletingMessage(null);
    } catch (err) {
      toast.error(err.message || "Failed to delete message");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Open channel members
  const handleOpenMembers = async () => {
    if (!activeChannel) return;
    try {
      const token = await getToken();
      const res = await axios.get(
        buildApiUrl(`/channels/${activeChannel._id}/members`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setChannelMembers(res.data || []);
      setIsMembersOpen(true);
    } catch (err) {
      toast.error("Failed to load channel members");
    }
  };

  // Remove member (Creator or Admin)
  const handleRemoveMember = async (memberClerkId) => {
    if (!activeChannel) return;
    try {
      const token = await getToken();
      await axios.delete(
        buildApiUrl(`/channels/${activeChannel._id}/members/${memberClerkId}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success("Member removed from channel");
      setChannelMembers((prev) =>
        prev.filter((m) => m.clerkUserId !== memberClerkId)
      );
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        "Failed to remove member";
      toast.error(typeof msg === "string" ? msg : "Failed to remove member");
    }
  };

  // Filter channels based on search
  const filteredChannels = channels.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isCreatorOfActive =
    activeChannel && user?.id === activeChannel.creatorClerkId;

  return (
    <div className="flex flex-col gap-4 max-w-7xl mx-auto w-full pb-8 text-gray-800 dark:text-[#E5E9E4]">
      {/* HEADER / BREADCRUMB */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200/80 dark:border-[#35443A]">
        <div className="flex items-center gap-2">
          <Link
            to="/channels"
            className="text-xl md:text-2xl font-bold text-gray-800 dark:text-[#E5E9E4] hover:text-green-800 dark:hover:text-[#7BC98C] transition-colors flex items-center gap-2"
          >
            <span className="p-1.5 rounded-lg bg-green-50 dark:bg-[#222D25] text-green-800 dark:text-[#7BC98C] border border-green-200/60 dark:border-[#35443A] text-lg">
              
            </span>
            <span>Veles Channels</span>
          </Link>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-[#222D25] text-emerald-800 dark:text-[#7BC98C] font-semibold border border-emerald-200/60 dark:border-[#35443A] hidden sm:inline-block">
            Communities
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile Sidebar Toggle */}
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="md:hidden px-3 py-1.5 rounded-xl border border-gray-200 dark:border-[#35443A] text-xs font-semibold text-gray-700 dark:text-[#E5E9E4] hover:bg-gray-50 dark:hover:bg-[#222D25] flex items-center gap-1.5 transition-colors"
          >
            <span></span>
            <span>{sidebarOpen ? "Hide Channels" : "Channels"}</span>
          </button>

          {isSignedIn ? (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 rounded-xl bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-white dark:text-[#E5E9E4] text-xs md:text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <span>+</span>
              <span>New Channel</span>
            </button>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-white dark:text-[#E5E9E4] text-xs md:text-sm font-semibold transition-colors"
            >
              Login to Join
            </Link>
          )}
        </div>
      </div>

      {/* WORKSPACE LAYOUT (SIDEBAR + MAIN CHAT) */}
      <div className="flex bg-white dark:bg-[#1B241E] rounded-2xl border border-gray-200/80 dark:border-[#35443A] shadow-sm overflow-hidden min-h-[640px] h-[calc(100vh-14rem)]">
        {/* LEFT CHANNEL SIDEBAR */}
        <div
          className={`${
            sidebarOpen ? "flex" : "hidden"
          } md:flex flex-col w-full md:w-72 lg:w-80 border-r border-gray-200/80 dark:border-[#35443A] bg-slate-50/70 dark:bg-[#111713]/80 flex-shrink-0 transition-all z-20`}
        >
          {/* SEARCH BOX */}
          <div className="p-3.5 border-b border-gray-200/60 dark:border-[#35443A]">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#A5B0A7] text-xs">
                
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search channels..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-[#1B241E] border border-gray-200 dark:border-[#35443A] text-xs focus:outline-none focus:ring-2 focus:ring-green-800/20 focus:border-green-800 dark:focus:border-[#7BC98C] transition-all text-gray-700 dark:text-[#E5E9E4] dark:placeholder-[#A5B0A7]"
              />
            </div>
          </div>

          {/* CHANNEL LISTINGS SCROLLABLE */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
            {/* JOINED CHANNELS SECTION */}
            {isSignedIn && userChannels.joined.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#A5B0A7] px-2 py-1">
                  Joined Channels ({userChannels.joined.length})
                </span>
                {userChannels.joined.map((ch) => {
                  const isActive = activeChannel?._id === ch._id;
                  return (
                    <button
                      key={ch._id}
                      onClick={() => {
                        navigate(`/channels/${ch.slug}`);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-green-800 dark:bg-[#25382B] text-white dark:text-[#E5E9E4] shadow-sm border border-transparent dark:border-[#7BC98C]/30"
                          : "text-gray-700 dark:text-[#E5E9E4] hover:bg-gray-100 dark:hover:bg-[#222D25]"
                      }`}
                    >
                      <span className="truncate"># {ch.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? "bg-green-900/60 dark:bg-[#1B241E] text-green-100 dark:text-[#7BC98C]"
                            : "bg-gray-200/60 dark:bg-[#222D25] text-gray-600 dark:text-[#A5B0A7]"
                        }`}
                      >
                        {ch.memberCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* OWNED CHANNELS SECTION */}
            {isSignedIn && userChannels.owned.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#A5B0A7] px-2 py-1">
                  My Channels ({userChannels.owned.length})
                </span>
                {userChannels.owned.map((ch) => {
                  const isActive = activeChannel?._id === ch._id;
                  return (
                    <button
                      key={ch._id}
                      onClick={() => {
                        navigate(`/channels/${ch.slug}`);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-green-800 dark:bg-[#25382B] text-white dark:text-[#E5E9E4] shadow-sm border border-transparent dark:border-[#7BC98C]/30"
                          : "text-gray-700 dark:text-[#E5E9E4] hover:bg-gray-100 dark:hover:bg-[#222D25]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[10px]">👑</span>
                        <span className="truncate"># {ch.name}</span>
                        {ch.pendingRequestCount > 0 && (
                          <span
                            title={`${ch.pendingRequestCount} pending join request(s)`}
                            className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-bold"
                          >
                            {ch.pendingRequestCount}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? "bg-green-900/60 dark:bg-[#1B241E] text-green-100 dark:text-[#7BC98C]"
                            : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                        }`}
                      >
                        {ch.memberCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* DISCOVER ALL CHANNELS */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#A5B0A7] px-2 py-1">
                Discover Channels ({filteredChannels.length})
              </span>
              {loadingChannels ? (
                <div className="p-4 text-center text-xs text-gray-400 dark:text-[#A5B0A7]">
                  Loading channels...
                </div>
              ) : filteredChannels.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400 dark:text-[#A5B0A7]">
                  No channels found
                </div>
              ) : (
                filteredChannels.map((ch) => {
                  const isActive = activeChannel?._id === ch._id;
                  return (
                    <button
                      key={ch._id}
                      onClick={() => {
                        navigate(`/channels/${ch.slug}`);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-green-800 dark:bg-[#25382B] text-white dark:text-[#E5E9E4] shadow-sm border border-transparent dark:border-[#7BC98C]/30"
                          : "text-gray-700 dark:text-[#E5E9E4] hover:bg-gray-100 dark:hover:bg-[#222D25]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-gray-400 dark:text-[#A5B0A7]">
                          {ch.visibility === "private" ? "🔒" : "#"}
                        </span>
                        <span className="truncate">{ch.name}</span>
                        {ch.joinRequestStatus === "pending" && (
                          <span
                            title="Join request pending approval"
                            className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold"
                          >
                            Pending
                          </span>
                        )}
                        {ch.pendingRequestCount > 0 && (
                          <span
                            title={`${ch.pendingRequestCount} pending join request(s)`}
                            className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-bold"
                          >
                            {ch.pendingRequestCount}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? "bg-green-900/60 dark:bg-[#1B241E] text-green-100 dark:text-[#7BC98C]"
                            : "bg-gray-200/60 dark:bg-[#222D25] text-gray-600 dark:text-[#A5B0A7]"
                        }`}
                      >
                        {ch.memberCount}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* MAIN WORKSPACE AREA */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#1B241E] min-w-0 h-full">
          {activeChannel ? (
            <>
              {/* CHANNEL TOP BAR */}
              <div className="p-4 border-b border-gray-200/80 dark:border-[#35443A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1B241E] flex-shrink-0">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-[#E5E9E4] truncate flex items-center gap-1.5">
                      <span>#</span>
                      <span>{activeChannel.name}</span>
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-[#222D25] text-gray-600 dark:text-[#A5B0A7] border border-gray-200/60 dark:border-[#35443A]">
                      {activeChannel.visibility === "private"
                        ? "Private"
                        : "Public"}
                    </span>
                    <button
                      onClick={handleOpenMembers}
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
                    >
                      {activeChannel.memberCount || 1} members
                    </button>
                  </div>

                  {activeChannel.description && (
                    <p className="text-xs text-gray-500 dark:text-[#A5B0A7] truncate mt-0.5 max-w-xl">
                      {activeChannel.description}
                    </p>
                  )}
                </div>

                {/* CHANNEL ACTIONS */}
                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                  {/* Connection indicator */}
                  {activeChannel.isMember && (
                    <div
                      title={`Socket status: ${connectionStatus}`}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 dark:bg-[#222D25] text-[11px] text-gray-500 dark:text-[#A5B0A7] border border-gray-100 dark:border-[#35443A]"
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          connectionStatus === "connected"
                            ? "bg-green-500"
                            : connectionStatus === "connecting"
                            ? "bg-amber-500 animate-pulse"
                            : "bg-red-400"
                        }`}
                      />
                      <span className="hidden sm:inline capitalize">
                        {connectionStatus}
                      </span>
                    </div>
                  )}

                  {/* Join / Leave / Request / Creator controls */}
                  {!activeChannel.isMember && !isCreatorOfActive ? (
                    activeChannel.visibility === "private" ? (
                      activeChannel.joinRequestStatus === "pending" ? (
                        <div className="flex items-center gap-2">
                          <span className="px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-semibold border border-amber-200/60 dark:border-amber-800/60 flex items-center gap-1.5 select-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            <span>Request Pending</span>
                          </span>
                          <button
                            onClick={handleCancelRequest}
                            disabled={requestActionLoading}
                            className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-[#35443A] hover:bg-gray-50 dark:hover:bg-[#222D25] text-gray-600 dark:text-[#A5B0A7] text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : activeChannel.joinRequestStatus === "declined" ? (
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-xs font-semibold border border-red-200/60 dark:border-red-800/60 select-none">
                            Request Declined
                          </span>
                          <button
                            onClick={() => handleRequestToJoin()}
                            disabled={requestActionLoading}
                            className="px-3.5 py-1.5 rounded-xl bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-white text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            {requestActionLoading ? "Submitting..." : "Request Again"}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRequestToJoin()}
                          disabled={requestActionLoading}
                          className="px-4 py-1.5 rounded-xl bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                        >
                          <span></span>
                          <span>{requestActionLoading ? "Submitting..." : "Request to Join"}</span>
                        </button>
                      )
                    ) : (
                      <button
                        onClick={handleJoinChannel}
                        disabled={isActionLoading}
                        className="px-4 py-1.5 rounded-xl bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-white text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        Join Channel
                      </button>
                    )
                  ) : isCreatorOfActive ? (
                    <div className="flex items-center gap-1.5">
                      {activeChannel.visibility === "private" && (
                        <button
                          onClick={() => setIsRequestsOpen(true)}
                          className="relative px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold border border-emerald-200/60 dark:border-emerald-800/60 transition-colors flex items-center gap-1.5"
                          title="Manage Join Requests"
                        >
                          <span></span>
                          <span>Requests</span>
                          {activeChannel.pendingRequestCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                              {activeChannel.pendingRequestCount}
                            </span>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => setIsEditOpen(true)}
                        className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-[#35443A] hover:border-gray-300 dark:hover:border-gray-600 text-xs font-semibold text-gray-700 dark:text-[#E5E9E4] transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeleteChannel(true)}
                        className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 text-xs font-semibold transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmLeaveChannel(true)}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-[#35443A] hover:bg-gray-50 dark:hover:bg-[#222D25] text-xs font-semibold text-gray-600 dark:text-[#A5B0A7] transition-colors"
                    >
                      Leave
                    </button>
                  )}

                  {/* Platform admin can delete any channel */}
                  {isAdmin && !isCreatorOfActive && (
                    <button
                      onClick={() => setConfirmDeleteChannel(true)}
                      className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-xs font-semibold transition-colors border border-red-200/50 dark:border-red-800/50"
                      title="Platform Admin: Delete channel"
                    >
                      Delete (Admin)
                    </button>
                  )}
                </div>
              </div>

              {/* MESSAGES STREAM */}
              <div
                ref={chatScrollContainerRef}
                className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0 bg-slate-50/30 dark:bg-[#111713]/40"
              >
                {!activeChannel.isMember ? (
                  activeChannel.visibility === "private" ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4 max-w-lg mx-auto">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-[#222D25] border border-emerald-100 dark:border-[#35443A] flex items-center justify-center text-3xl shadow-2xs">
                        
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-[#E5E9E4]">
                            #{activeChannel.name}
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-[#222D25] text-gray-700 dark:text-[#A5B0A7] border border-gray-200 dark:border-[#35443A]">
                            Private Channel
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-[#A5B0A7] leading-relaxed max-w-sm">
                          This is a private community channel. Messages and discussion history are visible only to accepted members.
                        </p>
                      </div>

                      {activeChannel.joinRequestStatus === "pending" ? (
                        <div className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/60 w-full shadow-2xs">
                          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            <span>Join Request Pending Approval</span>
                          </div>
                          <p className="text-[11px] text-amber-700/90 dark:text-amber-400 text-center leading-relaxed">
                            Your request has been submitted to @{activeChannel.creator?.username || "the channel creator"}. You will gain access as soon as they review and accept your request.
                          </p>
                        </div>
                      ) : activeChannel.joinRequestStatus === "declined" ? (
                        <div className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-red-50/80 dark:bg-red-950/40 border border-red-200/70 dark:border-red-800/60 w-full shadow-2xs">
                          <div className="flex items-center gap-2 text-red-800 dark:text-red-300 text-xs font-semibold">
                            <span>Request Declined</span>
                          </div>
                          <p className="text-[11px] text-red-700/90 dark:text-red-400 text-center leading-relaxed">
                            Your previous request to join this private channel was declined. You can submit a new request using the <strong>Request Again</strong> button in the header.
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 w-full p-4 rounded-2xl bg-slate-50 dark:bg-[#111713] border border-slate-200/60 dark:border-[#35443A] text-center">
                          <p className="text-xs text-gray-600 dark:text-[#A5B0A7] leading-relaxed">
                            Click the <strong>Request to Join</strong> button in the channel header above to request membership from the channel creator.
                          </p>
                          <span className="text-[11px] text-gray-400 dark:text-[#A5B0A7]">
                            Created by @{activeChannel.creator?.username || "creator"} • {activeChannel.memberCount || 1} members
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
                      <span className="text-4xl"></span>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-[#E5E9E4]">
                        Join #{activeChannel.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-[#A5B0A7] max-w-md">
                        You are previewing this channel. Join to participate in
                        real-time discussions, ask questions, and share insights
                        with other community members.
                      </p>
                      <button
                        onClick={handleJoinChannel}
                        className="mt-2 px-6 py-2.5 rounded-xl bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-white text-xs font-semibold transition-colors shadow-sm"
                      >
                        Join Channel Now
                      </button>
                    </div>
                  )
                ) : loadingMessages ? (
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-xs text-gray-400 animate-pulse">
                      Loading messages...
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Load Older Messages Button */}
                    {hasMoreMessages && (
                      <div className="flex justify-center pb-2">
                        <button
                          onClick={handleLoadOlder}
                          disabled={loadingMore}
                          className="px-3 py-1 rounded-full bg-white dark:bg-[#1B241E] border border-gray-200 dark:border-[#35443A] text-xs font-semibold text-gray-600 dark:text-[#E5E9E4] hover:bg-gray-50 dark:hover:bg-[#222D25] transition-colors disabled:opacity-50 shadow-2xs"
                        >
                          {loadingMore ? "Loading older..." : "↑ Load older messages"}
                        </button>
                      </div>
                    )}

                    {/* Empty Messages State */}
                    {messages.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-2">
                        <span className="text-3xl"></span>
                        <h4 className="text-sm font-bold text-gray-700 dark:text-[#E5E9E4]">
                          Welcome to #{activeChannel.name}!
                        </h4>
                        <p className="text-xs text-gray-400 dark:text-[#A5B0A7]">
                          This is the beginning of the #{activeChannel.name}{" "}
                          channel. Start the conversation!
                        </p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isOwn =
                          isSignedIn && user?.id === msg.senderClerkId;
                        const canDelete =
                          isOwn || isCreatorOfActive || isAdmin;
                        const canEdit = isOwn && !msg.isDeleted;
                        const canReport =
                          Boolean(isSignedIn) &&
                          !isOwn &&
                          !msg.isDeleted &&
                          Boolean(activeChannel?.isMember) &&
                          (!msg.channel ||
                            msg.channel === activeChannel?._id ||
                            msg.channel?._id === activeChannel?._id);
                        const hasActions = canEdit || canDelete || canReport;
                        const username =
                          msg.sender?.username || "CommunityMember";
                        const avatar =
                          msg.sender?.img || "/userImg.jpeg";

                        return (
                          <div
                            key={msg._id}
                            className={`group relative flex items-start gap-3 p-2 rounded-xl transition-colors hover:bg-white/80 dark:hover:bg-[#222D25]/60 ${
                              msg.isDeleted ? "opacity-75" : ""
                            }`}
                          >
                            <img
                              src={avatar}
                              alt={username}
                              className="w-8 h-8 rounded-full object-cover border border-gray-100 dark:border-[#35443A] flex-shrink-0 mt-0.5"
                            />

                            <div className="flex-1 flex flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                <Link
                                  to={`/author/${username}`}
                                  className="text-xs font-bold text-gray-800 dark:text-[#E5E9E4] hover:text-green-800 dark:hover:text-[#7BC98C] transition-colors"
                                >
                                  @{username}
                                </Link>
                                <span
                                  className="text-[10px] text-gray-400 dark:text-[#A5B0A7]"
                                  title={new Date(msg.createdAt).toLocaleString()}
                                >
                                  {format(msg.createdAt)}
                                </span>
                                {msg.isEdited && !msg.isDeleted && (
                                  <span className="text-[10px] text-gray-400 dark:text-[#A5B0A7] italic">
                                    (edited)
                                  </span>
                                )}
                              </div>

                              {/* Editing Mode */}
                              {editingMessageId === msg._id ? (
                                <div className="mt-1 flex flex-col gap-2">
                                  <textarea
                                    value={editInput}
                                    onChange={(e) =>
                                      setEditInput(e.target.value)
                                    }
                                    rows={2}
                                    maxLength={2000}
                                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-[#35443A] bg-white dark:bg-[#111713] text-gray-800 dark:text-[#E5E9E4] text-xs focus:outline-none focus:ring-2 focus:ring-green-800/20 focus:border-green-800 dark:focus:border-[#7BC98C]"
                                  />
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleSaveEdit(msg._id)}
                                      className="px-3 py-1 rounded-lg bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-white text-xs font-semibold"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingMessageId(null);
                                        setEditInput("");
                                      }}
                                      className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-[#222D25] text-gray-600 dark:text-[#E5E9E4] text-xs font-semibold"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p
                                  className={`text-xs mt-0.5 break-words whitespace-pre-wrap leading-relaxed ${
                                    msg.isDeleted
                                      ? "italic text-gray-400 dark:text-[#A5B0A7]"
                                      : "text-gray-800 dark:text-[#E5E9E4]"
                                  }`}
                                >
                                  {msg.content}
                                </p>
                              )}
                            </div>

                            {/* Message hover actions toolbar */}
                            {!msg.isDeleted && editingMessageId !== msg._id && hasActions && (
                              <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1 bg-white dark:bg-[#222D25] border border-gray-200 dark:border-[#35443A] shadow-2xs rounded-lg p-1 absolute top-1 right-2 z-10">
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMessageId(msg._id);
                                      setEditInput(msg.content);
                                    }}
                                    title="Edit Message"
                                    aria-label="Edit Message"
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-[#1B241E] rounded text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white text-[11px] transition-colors"
                                  >
                                    ✏️
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => setDeletingMessage(msg)}
                                    title="Delete Message"
                                    aria-label="Delete Message"
                                    className="p-1 hover:bg-red-50 dark:hover:bg-red-950/60 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 text-[11px] transition-colors"
                                  >
                                    🗑️
                                  </button>
                                )}
                                {canReport && (
                                  <button
                                    type="button"
                                    onClick={() => setReportingMessage(msg)}
                                    title="Report Message"
                                    aria-label="Report Message"
                                    className="p-1 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 text-[11px] transition-colors flex items-center justify-center cursor-pointer"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="w-3.5 h-3.5"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      aria-hidden="true"
                                    >
                                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                                      <line x1="4" y1="22" x2="4" y2="15" />
                                    </svg>
                                    <span className="sr-only">Report Message</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* MESSAGE INPUT SECTION */}
              {activeChannel.isMember && (
                <div className="p-3 border-t border-gray-200/80 dark:border-[#35443A] bg-white dark:bg-[#1B241E] flex-shrink-0">
                  <form
                    onSubmit={handleSendMessage}
                    className="flex flex-col gap-1.5"
                  >
                    <div className="relative flex items-center">
                      <textarea
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                          }
                        }}
                        placeholder={`Message #${activeChannel.name}... (Press Enter to send, Shift+Enter for new line)`}
                        rows={2}
                        maxLength={2000}
                        className="w-full pl-3.5 pr-20 py-2.5 rounded-xl border border-gray-200 dark:border-[#35443A] bg-white dark:bg-[#111713] text-xs focus:outline-none focus:ring-2 focus:ring-green-800/20 focus:border-green-800 dark:focus:border-[#7BC98C] transition-all text-gray-800 dark:text-[#E5E9E4] dark:placeholder-[#A5B0A7] resize-none"
                      />
                      <button
                        type="submit"
                        disabled={!messageInput.trim() || isSending}
                        className="absolute right-2.5 bottom-2.5 px-3 py-1.5 rounded-lg bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-white text-xs font-semibold transition-colors disabled:opacity-40 flex items-center gap-1"
                      >
                        {isSending ? "..." : "Send"}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-[#A5B0A7] px-1">
                      <span>Shift + Enter for new lines</span>
                      <span>{messageInput.length}/2000</span>
                    </div>
                  </form>
                </div>
              )}
            </>
          ) : (
            /* DISCOVERY VIEW WHEN NO CHANNEL IS SELECTED */
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">
              <div className="flex flex-col gap-1 pb-4 border-b border-gray-100 dark:border-[#35443A]">
                <h3 className="text-xl font-bold text-gray-800 dark:text-[#E5E9E4]">
                  Community Channels
                </h3>
                <p className="text-xs text-gray-500 dark:text-[#A5B0A7]">
                  Select a channel from the left sidebar or browse available
                  topics below to start engaging.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {filteredChannels.length === 0 ? (
                  <div className="col-span-2 p-8 text-center text-gray-400 dark:text-[#A5B0A7] text-xs">
                    No channels available right now. Click "+ New Channel" to
                    create the first one!
                  </div>
                ) : (
                  filteredChannels.map((c) => (
                    <div
                      key={c._id}
                      className="p-5 rounded-2xl border border-gray-100 dark:border-[#35443A] shadow-2xs hover:shadow-md hover:border-green-800/40 dark:hover:border-[#7BC98C]/40 transition-all bg-white dark:bg-[#1B241E] flex flex-col justify-between gap-4"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-base font-bold text-gray-900 dark:text-[#E5E9E4] flex items-center gap-1">
                            <span className="text-gray-400 dark:text-[#A5B0A7]">#</span>
                            <span>{c.name}</span>
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-[#222D25] text-gray-600 dark:text-[#A5B0A7]">
                            {c.visibility === "private" ? "🔒 Private" : "🌐 Public"}
                          </span>
                        </div>

                        <p className="text-xs text-gray-600 dark:text-[#A5B0A7] line-clamp-2">
                          {c.description || "No description provided."}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-[#35443A]">
                        <div className="flex items-center gap-2">
                          <img
                            src={c.creator?.img || "/userImg.jpeg"}
                            alt={c.creator?.username || "Creator"}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <span className="text-[11px] text-gray-500 dark:text-[#A5B0A7]">
                            @{c.creator?.username} • {c.memberCount || 1} members
                          </span>
                        </div>

                        <button
                          onClick={() => navigate(`/channels/${c.slug}`)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                            c.visibility === "private" && !c.isMember
                              ? c.joinRequestStatus === "pending"
                                ? "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200/50 dark:border-amber-800/50"
                                : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
                              : "bg-green-50 hover:bg-green-100 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-green-800 dark:text-[#7BC98C]"
                          }`}
                        >
                          {c.visibility === "private" && !c.isMember
                            ? c.joinRequestStatus === "pending"
                              ? "Request Pending  "
                              : "Request Access  "
                            : "Open Channel  "}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      <CreateChannelModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(newChannel) => {
          fetchChannels();
          fetchUserChannels();
          navigate(`/channels/${newChannel.slug}`);
        }}
      />

      <EditChannelModal
        isOpen={isEditOpen}
        channel={activeChannel}
        onClose={() => setIsEditOpen(false)}
        onUpdated={(updated) => {
          setActiveChannel((prev) => ({ ...prev, ...updated }));
          fetchChannels();
          fetchUserChannels();
        }}
      />

      <ReportMessageModal
        isOpen={!!reportingMessage}
        message={reportingMessage}
        channelId={activeChannel?._id}
        onClose={() => setReportingMessage(null)}
      />

      <ChannelMembersModal
        isOpen={isMembersOpen}
        members={channelMembers}
        isCreator={isCreatorOfActive}
        isAdmin={isAdmin}
        onClose={() => setIsMembersOpen(false)}
        onRemoveMember={handleRemoveMember}
      />

      <ManageRequestsModal
        isOpen={isRequestsOpen}
        channel={activeChannel}
        onClose={() => setIsRequestsOpen(false)}
        onRequestHandled={() => {
          if (activeChannel) {
            setActiveChannel((prev) => ({
              ...prev,
              pendingRequestCount: Math.max(0, (prev.pendingRequestCount || 1) - 1),
            }));
          }
          fetchUserChannels();
          fetchChannels();
        }}
      />

      <ConfirmModal
        isOpen={confirmDeleteChannel}
        title="Delete Channel"
        message={`Are you sure you want to delete #${activeChannel?.name}? All active discussions in this channel will be closed.`}
        confirmText="Delete Channel"
        confirmStyle="danger"
        isLoading={isActionLoading}
        onConfirm={handleDeleteChannel}
        onClose={() => setConfirmDeleteChannel(false)}
      />

      <ConfirmModal
        isOpen={confirmLeaveChannel}
        title="Leave Channel"
        message={`Are you sure you want to leave #${activeChannel?.name}? You can rejoin anytime.`}
        confirmText="Leave Channel"
        confirmStyle="danger"
        isLoading={isActionLoading}
        onConfirm={handleLeaveChannel}
        onClose={() => setConfirmLeaveChannel(false)}
      />

      <ConfirmModal
        isOpen={!!deletingMessage}
        title="Delete Message"
        message="Are you sure you want to delete this message? This action will replace the content with a deletion notice."
        confirmText="Delete"
        confirmStyle="danger"
        isLoading={isActionLoading}
        onConfirm={handleConfirmDeleteMessage}
        onClose={() => setDeletingMessage(null)}
      />
    </div>
  );
};

export default ChannelsPage;

