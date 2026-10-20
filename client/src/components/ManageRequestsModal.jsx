import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { toast } from "react-toastify";
import { format } from "timeago.js";
import { Link } from "react-router-dom";

const ManageRequestsModal = ({
  isOpen,
  channel,
  onClose,
  onRequestHandled,
}) => {
  const { getToken } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [filter, setFilter] = useState("pending"); // "pending" | "all"

  const fetchRequests = async () => {
    if (!channel) return;
    try {
      setLoading(true);
      const token = await getToken();
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/channels/${channel._id}/requests?status=${filter}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRequests(res.data || []);
    } catch (err) {
      console.error("Error fetching requests:", err);
      toast.error("Failed to load join requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen, channel?._id, filter]);

  if (!isOpen || !channel) return null;

  const handleAccept = async (requestId) => {
    setActioningId(requestId);
    try {
      const token = await getToken();
      await axios.post(
        `${import.meta.env.VITE_API_URL}/channels/${channel._id}/requests/${requestId}/accept`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success("Join request accepted!");
      setRequests((prev) => prev.filter((r) => r._id !== requestId));
      onRequestHandled?.();
    } catch (err) {
      console.error("Error accepting request:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        "Failed to accept request";
      toast.error(typeof msg === "string" ? msg : "Failed to accept request");
    } finally {
      setActioningId(null);
    }
  };

  const handleDecline = async (requestId) => {
    setActioningId(requestId);
    try {
      const token = await getToken();
      await axios.post(
        `${import.meta.env.VITE_API_URL}/channels/${channel._id}/requests/${requestId}/decline`,
        { note: "Declined by creator" },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.info("Join request declined");
      setRequests((prev) => prev.filter((r) => r._id !== requestId));
      onRequestHandled?.();
    } catch (err) {
      console.error("Error declining request:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        "Failed to decline request";
      toast.error(typeof msg === "string" ? msg : "Failed to decline request");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 flex flex-col gap-4 max-h-[85vh]">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>Manage Join Requests</span>
              <span className="text-xs font-normal text-gray-500">
                (#{channel.name})
              </span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Review and approve member requests to access this private channel.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* FILTER TOGGLE */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === "pending"
                ? "bg-green-800 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Pending Requests
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === "all"
                ? "bg-green-800 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All Requests History
          </button>
        </div>

        {/* REQUESTS LIST */}
        <div className="flex flex-col gap-3 overflow-y-auto max-h-96 pr-1 divide-y divide-gray-50">
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400">
              Loading requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
              <span className="text-3xl">✨</span>
              <p className="text-xs font-semibold text-gray-700">
                {filter === "pending"
                  ? "No pending join requests"
                  : "No join requests recorded"}
              </p>
              <p className="text-[11px] text-gray-400 max-w-xs">
                When users request to join #{channel.name}, they will appear
                here for your review.
              </p>
            </div>
          ) : (
            requests.map((req) => {
              const username = req.user?.username || "Anonymous";
              const avatar = req.user?.img || "/userImg.jpeg";
              const isActioning = actioningId === req._id;

              return (
                <div
                  key={req._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={avatar}
                      alt={username}
                      className="w-10 h-10 rounded-full object-cover border border-gray-100 flex-shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/author/${username}`}
                          onClick={onClose}
                          className="text-xs font-bold text-gray-900 hover:text-green-800 transition-colors truncate"
                        >
                          @{username}
                        </Link>
                        <span
                          className={`px-2 py-0.2 rounded-full text-[10px] font-semibold capitalize ${
                            req.status === "pending"
                              ? "bg-amber-50 text-amber-700 border border-amber-200/50"
                              : req.status === "accepted"
                              ? "bg-green-50 text-green-700 border border-green-200/50"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400">
                        Requested {format(req.createdAt)}
                      </span>
                      {req.note && (
                        <p className="text-[11px] text-gray-600 italic mt-0.5">
                          "{req.note}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ACTION BUTTONS (For pending requests) */}
                  {req.status === "pending" && (
                    <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                      <button
                        onClick={() => handleDecline(req._id)}
                        disabled={isActioning}
                        className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => handleAccept(req._id)}
                        disabled={isActioning}
                        className="px-3.5 py-1.5 rounded-xl bg-green-800 hover:bg-green-900 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isActioning && (
                          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        )}
                        <span>Accept</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="pt-3 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageRequestsModal;

