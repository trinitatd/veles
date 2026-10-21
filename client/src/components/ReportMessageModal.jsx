import React, { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { toast } from "react-toastify";
import { buildApiUrl } from "../utils/api";

const ReportMessageModal = ({ isOpen, message, channelId, onClose }) => {
  const { getToken } = useAuth();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !message) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanReason = reason.trim();
    if (!cleanReason || cleanReason.length < 3) {
      setError("Please provide a valid reason (at least 3 characters)");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getToken();
      await axios.post(
        buildApiUrl(`/channels/${channelId}/messages/${message._id}/report`),
        { reason: cleanReason },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Report submitted. A moderator will review this message.");
      setReason("");
      onClose();
    } catch (err) {
      console.error("Error reporting message:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        "Failed to submit report";
      setError(typeof msg === "string" ? msg : "Failed to submit report");
      toast.error(typeof msg === "string" ? msg : "Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#1B241E] rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 dark:border-[#35443A] flex flex-col gap-4 text-gray-800 dark:text-[#E5E9E4]">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#35443A]">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-[#E5E9E4]">Report Message</h3>
            <p className="text-xs text-gray-500 dark:text-[#A5B0A7] mt-0.5">
              Help keep our technical discussions productive and respectful.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-[#A5B0A7] hover:text-gray-600 dark:hover:text-white p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#222D25] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Message Snippet Preview */}
        <div className="bg-gray-50 dark:bg-[#111713] p-3 rounded-xl border border-gray-100 dark:border-[#35443A] text-xs text-gray-600 dark:text-[#A5B0A7] italic line-clamp-2">
          "{message.content}"
        </div>

        {error && (
          <div className="p-3 text-xs bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 rounded-xl border border-red-100 dark:border-red-800/60">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-[#E5E9E4] uppercase tracking-wider">
              Reason for reporting *
            </label>
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Harassment, spam, off-topic abusive content, or confidential information..."
              rows={3}
              maxLength={500}
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-[#35443A] bg-white dark:bg-[#111713] text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-gray-800 dark:text-[#E5E9E4] dark:placeholder-[#A5B0A7]"
            />
            <span className="text-[10px] text-gray-400 dark:text-[#A5B0A7] self-end">
              {reason.length}/500
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#35443A]">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-[#E5E9E4] bg-gray-100 dark:bg-[#222D25] hover:bg-gray-200 dark:hover:bg-[#2e3f34] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>Submit Report</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportMessageModal;

