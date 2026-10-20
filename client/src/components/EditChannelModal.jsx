import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { toast } from "react-toastify";

const EditChannelModal = ({ isOpen, channel, onClose, onUpdated }) => {
  const { getToken } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (channel) {
      setName(channel.name || "");
      setDescription(channel.description || "");
      setVisibility(channel.visibility || "public");
      setError("");
    }
  }, [channel, isOpen]);

  if (!isOpen || !channel) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanName = name.trim();
    if (!cleanName) {
      setError("Channel name cannot be empty");
      return;
    }

    if (cleanName.length < 2 || cleanName.length > 60) {
      setError("Channel name must be between 2 and 60 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getToken();
      const res = await axios.patch(
        `${import.meta.env.VITE_API_URL}/channels/${channel._id}`,
        {
          name: cleanName,
          description: description.trim(),
          visibility,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Channel details updated!");
      onUpdated?.(res.data);
      onClose();
    } catch (err) {
      console.error("Error updating channel:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        "Failed to update channel";
      setError(typeof msg === "string" ? msg : "Failed to update channel");
      toast.error(typeof msg === "string" ? msg : "Failed to update channel");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#1B241E] rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 dark:border-[#35443A] flex flex-col gap-5 text-gray-800 dark:text-[#E5E9E4]">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#35443A]">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-[#E5E9E4]">
              Edit #{channel.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-[#A5B0A7] mt-0.5">
              Update channel metadata and visibility settings.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-[#A5B0A7] hover:text-gray-600 dark:hover:text-white p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#222D25] transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 rounded-xl border border-red-100 dark:border-red-800/60">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Channel Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-[#E5E9E4] uppercase tracking-wider">
              Channel Name
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#A5B0A7] font-bold">
                #
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#35443A] bg-white dark:bg-[#111713] text-sm focus:outline-none focus:ring-2 focus:ring-green-800/20 focus:border-green-800 dark:focus:border-[#7BC98C] transition-all text-gray-800 dark:text-[#E5E9E4]"
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-[#E5E9E4] uppercase tracking-wider">
              Topic / Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-[#35443A] bg-white dark:bg-[#111713] text-sm focus:outline-none focus:ring-2 focus:ring-green-800/20 focus:border-green-800 dark:focus:border-[#7BC98C] transition-all text-gray-800 dark:text-[#E5E9E4] dark:placeholder-[#A5B0A7]"
            />
            <span className="text-[10px] text-gray-400 dark:text-[#A5B0A7] self-end">
              {description.length}/500
            </span>
          </div>

          {/* Visibility */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-[#E5E9E4] uppercase tracking-wider">
              Visibility Setting
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setVisibility("public")}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 ${
                  visibility === "public"
                    ? "border-green-800 dark:border-[#7BC98C] bg-green-50/50 dark:bg-[#25382B]/60 shadow-sm"
                    : "border-gray-200 dark:border-[#35443A] hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 dark:text-[#E5E9E4]">
                    Public
                  </span>
                  <span className="text-xs"></span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-[#A5B0A7]">
                  Anyone can discover and join.
                </p>
              </div>

              <div
                onClick={() => setVisibility("private")}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 ${
                  visibility === "private"
                    ? "border-green-800 dark:border-[#7BC98C] bg-green-50/50 dark:bg-[#25382B]/60 shadow-sm"
                    : "border-gray-200 dark:border-[#35443A] hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 dark:text-[#E5E9E4]">
                    Private
                  </span>
                  <span className="text-xs"></span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-[#A5B0A7]">
                  Accessible only to authorized members.
                </p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#35443A] mt-2">
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
              className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] dark:text-[#E5E9E4] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {isSubmitting && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditChannelModal;

