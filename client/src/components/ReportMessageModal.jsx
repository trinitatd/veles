import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { toast } from "react-toastify";
import { format } from "timeago.js";
import { buildApiUrl } from "../utils/api";

const REPORT_REASONS = [
  "Spam or unwanted promotion",
  "Harassment or bullying",
  "Hate speech or abusive content",
  "Inappropriate or harmful content",
  "Misinformation",
  "Other",
];

const ReportMessageModal = ({ isOpen, message, channelId, onClose }) => {
  const { getToken } = useAuth();
  const [selectedReason, setSelectedReason] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    setSelectedReason("");
    setDescription("");
    setError("");
    onClose();
  }, [isSubmitting, onClose]);

  // Reset form when modal opens or closes, or when active message changes
  useEffect(() => {
    if (isOpen) {
      setSelectedReason("");
      setDescription("");
      setError("");
      setIsSubmitting(false);
    }
  }, [isOpen, message?._id]);

  // Handle keyboard events (Escape to close)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isSubmitting) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, handleClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      handleClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!selectedReason) {
      setError("Please select a reason for reporting this message.");
      return;
    }

    if (!message || message.isDeleted) {
      setError("This message has been deleted or is no longer available.");
      return;
    }

    const targetChannelId =
      channelId || message.channel?._id || message.channel;
    if (!targetChannelId) {
      setError("Channel information is missing.");
      return;
    }

    const cleanDescription = description.trim();
    // Format reason according to API expectations (string between 3 and 500 chars)
    let formattedReason = selectedReason;
    if (cleanDescription) {
      formattedReason = `${selectedReason}: ${cleanDescription}`;
    }
    if (formattedReason.length > 500) {
      formattedReason = formattedReason.slice(0, 500);
    }
    if (formattedReason.length < 3) {
      setError("Report reason must be at least 3 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (!token) {
        setError("You must be logged in to report a message.");
        setIsSubmitting(false);
        return;
      }

      await axios.post(
        buildApiUrl(`/channels/${targetChannelId}/messages/${message._id}/report`),
        {
          reason: formattedReason,
          category: selectedReason,
          description: cleanDescription,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Report submitted. A moderator will review this message.");
      handleClose();
    } catch (err) {
      console.error("Error reporting message:", err);
      let errorMsg = "Failed to submit report. Please try again.";
      if (err.response?.status === 409) {
        errorMsg = "You have already reported this message!";
      } else if (err.response?.status === 403) {
        errorMsg = "You must be a member of this channel to report messages!";
      } else if (err.response?.status === 404) {
        errorMsg = "Message or channel not found or already deleted.";
      } else if (err.response?.status === 401) {
        errorMsg = "You must be logged in to report messages.";
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (typeof err.response?.data === "string") {
        errorMsg = err.response.data;
      }
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const senderUsername = message.sender?.username || "CommunityMember";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="bg-white dark:bg-[#1B241E] rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 dark:border-[#35443A] flex flex-col gap-4 text-gray-800 dark:text-[#E5E9E4]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#35443A]">
          <div>
            <h3
              id="report-modal-title"
              className="text-lg font-bold text-gray-900 dark:text-[#E5E9E4]"
            >
              Report Message
            </h3>
            <p className="text-xs text-gray-500 dark:text-[#A5B0A7] mt-0.5">
              Help keep our technical discussions productive and respectful.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close report dialog"
            className="text-gray-400 dark:text-[#A5B0A7] hover:text-gray-600 dark:hover:text-white p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#222D25] transition-colors disabled:opacity-50 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Message Snippet Preview */}
        <div className="bg-gray-50 dark:bg-[#111713] p-3 rounded-xl border border-gray-100 dark:border-[#35443A] flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-[#A5B0A7]">
            <span className="font-semibold text-gray-700 dark:text-[#E5E9E4]">
              @{senderUsername}
            </span>
            {message.createdAt && (
              <span>{format(message.createdAt)}</span>
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-[#A5B0A7] italic line-clamp-3 break-words">
            "{message.content}"
          </p>
        </div>

        {/* Inline Error Alert */}
        {error && (
          <div
            role="alert"
            className="p-3 text-xs bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 rounded-xl border border-red-100 dark:border-red-800/60"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Reason Selector */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="report-reason"
              className="text-xs font-semibold text-gray-700 dark:text-[#E5E9E4] uppercase tracking-wider"
            >
              Reason for reporting *
            </label>
            <select
              id="report-reason"
              required
              value={selectedReason}
              disabled={isSubmitting}
              onChange={(e) => {
                setSelectedReason(e.target.value);
                if (error) setError("");
              }}
              className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-[#35443A] bg-white dark:bg-[#111713] text-sm text-gray-800 dark:text-[#E5E9E4] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer disabled:opacity-50"
            >
              <option value="" disabled>
                Select a reason...
              </option>
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Description / Additional Context Field */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="report-description"
              className="text-xs font-semibold text-gray-700 dark:text-[#E5E9E4] uppercase tracking-wider"
            >
              Additional Context (Optional)
            </label>
            <textarea
              id="report-description"
              value={description}
              disabled={isSubmitting}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                selectedReason === "Other"
                  ? "Please describe the issue..."
                  : "Provide additional details for the moderation team..."
              }
              rows={3}
              maxLength={500}
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-[#35443A] bg-white dark:bg-[#111713] text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-gray-800 dark:text-[#E5E9E4] dark:placeholder-[#A5B0A7] resize-none disabled:opacity-50"
            />
            <span className="text-[10px] text-gray-400 dark:text-[#A5B0A7] self-end">
              {description.length}/500
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#35443A]">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-[#E5E9E4] bg-gray-100 dark:bg-[#222D25] hover:bg-gray-200 dark:hover:bg-[#2e3f34] transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedReason}
              className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm cursor-pointer"
            >
              {isSubmitting && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>{isSubmitting ? "Submitting..." : "Submit Report"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportMessageModal;
