import React, { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { toast } from "react-toastify";

const CreateChannelModal = ({ isOpen, onClose, onCreated }) => {
  const { getToken } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  // Derive preview slug
  const previewSlug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanName = name.trim();
    if (!cleanName) {
      setError("Channel name is required");
      return;
    }

    if (cleanName.length < 2 || cleanName.length > 60) {
      setError("Channel name must be between 2 and 60 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getToken();
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/channels`,
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

      toast.success(`Channel #${res.data.name} created!`);
      setName("");
      setDescription("");
      setVisibility("public");
      onCreated?.(res.data);
      onClose();
    } catch (err) {
      console.error("Error creating channel:", err);
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        "Failed to create channel";
      setError(typeof msg === "string" ? msg : "Failed to create channel");
      toast.error(typeof msg === "string" ? msg : "Failed to create channel");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Create a Channel</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Channels are where your community communicates and shares knowledge.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs bg-red-50 text-red-700 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Channel Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Channel Name *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                #
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. system-design, cloud-architecture"
                maxLength={60}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-800/20 focus:border-green-800 transition-all text-gray-800"
              />
            </div>
            {previewSlug && (
              <p className="text-[11px] text-gray-400 font-mono">
                URL slug: /channels/{previewSlug}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Topic / Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this channel about? Outline the purpose and expectations..."
              rows={3}
              maxLength={500}
              className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-800/20 focus:border-green-800 transition-all text-gray-800"
            />
            <span className="text-[10px] text-gray-400 self-end">
              {description.length}/500
            </span>
          </div>

          {/* Visibility */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Visibility Setting
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setVisibility("public")}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 ${
                  visibility === "public"
                    ? "border-green-800 bg-green-50/50 shadow-sm"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">
                    Public
                  </span>
                  <span className="text-xs"></span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Anyone can discover and join this channel.
                </p>
              </div>

              <div
                onClick={() => setVisibility("private")}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 ${
                  visibility === "private"
                    ? "border-green-800 bg-green-50/50 shadow-sm"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">
                    Private
                  </span>
                  <span className="text-xs"></span>
                </div>
                <p className="text-[11px] text-gray-500">
                  Visible only to invited or authorized members.
                </p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 mt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-green-800 hover:bg-green-900 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>Create Channel</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChannelModal;

