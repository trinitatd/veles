import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import { io } from "socket.io-client";
import { API_BASE_URL } from "./api.js";

const SOCKET_URL = API_BASE_URL;

export const useChannelSocket = (channelId, handlers = {}) => {
  const { getToken, isSignedIn } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState("disconnected"); // "connecting" | "connected" | "disconnected" | "error"
  const socketRef = useRef(null);
  const handlersRef = useRef(handlers);

  // Keep handlers up to date without triggering re-connection
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!isSignedIn) {
      setConnectionStatus("disconnected");
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    let isMounted = true;
    setConnectionStatus("connecting");

    const connectSocket = async () => {
      try {
        const token = await getToken();
        if (!token || !isMounted) return;

        // Disconnect existing socket if any
        if (socketRef.current) {
          socketRef.current.disconnect();
        }

        const socket = io(SOCKET_URL, {
          auth: { token },
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          if (!isMounted) return;
          setConnectionStatus("connected");

          // Join current channel room if channelId is available
          if (channelId) {
            socket.emit("join_channel", { channelId }, (res) => {
              if (res?.error && handlersRef.current?.onAuthError) {
                handlersRef.current.onAuthError(res.error);
              }
            });
          }
        });

        socket.on("disconnect", (reason) => {
          if (!isMounted) return;
          console.warn("Socket disconnected:", reason);
          setConnectionStatus("disconnected");
        });

        socket.on("connect_error", (err) => {
          if (!isMounted) return;
          console.error("Socket connection error:", err.message);
          setConnectionStatus("error");
          if (handlersRef.current?.onConnectionError) {
            handlersRef.current.onConnectionError(err);
          }
        });

        // Event Listeners
        socket.on("new_message", (msg) => {
          handlersRef.current?.onNewMessage?.(msg);
        });

        socket.on("message_edited", (msg) => {
          handlersRef.current?.onMessageEdited?.(msg);
        });

        socket.on("message_deleted", (data) => {
          handlersRef.current?.onMessageDeleted?.(data);
        });

        socket.on("channel_updated", (data) => {
          handlersRef.current?.onChannelUpdated?.(data);
        });

        socket.on("channel_deleted", (data) => {
          handlersRef.current?.onChannelDeleted?.(data);
        });

        socket.on("member_joined", (data) => {
          handlersRef.current?.onMemberJoined?.(data);
        });

        socket.on("member_left", (data) => {
          handlersRef.current?.onMemberLeft?.(data);
        });

        socket.on("member_removed", (data) => {
          handlersRef.current?.onMemberRemoved?.(data);
        });

        socket.on("removed_from_channel", (data) => {
          handlersRef.current?.onSelfRemoved?.(data);
        });

        socket.on("new_join_request", (data) => {
          handlersRef.current?.onNewJoinRequest?.(data);
        });

        socket.on("join_request_accepted", (data) => {
          handlersRef.current?.onJoinRequestAccepted?.(data);
        });

        socket.on("join_request_declined", (data) => {
          handlersRef.current?.onJoinRequestDeclined?.(data);
        });

        socket.on("join_request_cancelled", (data) => {
          handlersRef.current?.onJoinRequestCancelled?.(data);
        });
      } catch (err) {
        if (!isMounted) return;
        console.error("Error initializing socket:", err);
        setConnectionStatus("error");
      }
    };

    connectSocket();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isSignedIn, getToken]);

  // Handle switching channels on an existing connected socket
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected || !channelId) return;

    socket.emit("join_channel", { channelId }, (res) => {
      if (res?.error && handlersRef.current?.onAuthError) {
        handlersRef.current.onAuthError(res.error);
      }
    });

    return () => {
      if (socket && socket.connected) {
        socket.emit("leave_channel", { channelId });
      }
    };
  }, [channelId]);

  // Action emitters with Promise callbacks
  const sendMessage = useCallback((content) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !socketRef.current.connected) {
        return reject(new Error("Chat socket is not connected"));
      }
      socketRef.current.emit(
        "send_message",
        { channelId, content },
        (res) => {
          if (res?.success) resolve(res.message);
          else reject(new Error(res?.error || "Failed to send message"));
        }
      );
    });
  }, [channelId]);

  const editMessage = useCallback((messageId, content) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !socketRef.current.connected) {
        return reject(new Error("Chat socket is not connected"));
      }
      socketRef.current.emit(
        "edit_message",
        { messageId, channelId, content },
        (res) => {
          if (res?.success) resolve(res.message);
          else reject(new Error(res?.error || "Failed to edit message"));
        }
      );
    });
  }, [channelId]);

  const deleteMessage = useCallback((messageId, reason = "") => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current || !socketRef.current.connected) {
        return reject(new Error("Chat socket is not connected"));
      }
      socketRef.current.emit(
        "delete_message",
        { messageId, channelId, reason },
        (res) => {
          if (res?.success) resolve(res.payload);
          else reject(new Error(res?.error || "Failed to delete message"));
        }
      );
    });
  }, [channelId]);

  return {
    connectionStatus,
    sendMessage,
    editMessage,
    deleteMessage,
    socket: socketRef.current,
  };
};

