import React, { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";
import { format } from "timeago.js";
import { Link } from "react-router-dom";
import ConfirmModal from "../../components/ConfirmModal";
import { buildApiUrl } from "../../utils/api";

const AdminChannels = () => {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [activeSubTab, setActiveSubTab] = useState("channels"); // "channels" | "reports"
  const [searchTerm, setSearchTerm] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("all"); // "all" | "public" | "private"
  const [reportStatus, setReportStatus] = useState("all");
  const [channelToDelete, setChannelToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [actioningReport, setActioningReport] = useState(null); // { report, action: 'DELETE_MESSAGE' | 'DISMISS' }

  // Query Channels: by default, only active channels are retrieved
  const { data: channelsData, isPending: isChannelsLoading } = useQuery({
    queryKey: ["adminChannels", searchTerm, visibilityFilter],
    queryFn: async () => {
      const token = await getToken();
      const params = new URLSearchParams({
        status: "active",
        limit: "50",
      });
      if (searchTerm) params.append("search", searchTerm);
      if (visibilityFilter !== "all") params.append("visibility", visibilityFilter);

      const res = await axios.get(
        buildApiUrl(`/admin/channels?${params.toString()}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return res.data;
    },
  });

  // Query Reports
  const { data: reportsData, isPending: isReportsLoading } = useQuery({
    queryKey: ["adminReports", reportStatus],
    queryFn: async () => {
      const token = await getToken();
      const res = await axios.get(
        buildApiUrl(`/admin/reports?status=${reportStatus}&limit=50`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return res.data;
    },
  });

  // Delete Channel Mutation
  const deleteChannelMutation = useMutation({
    mutationFn: async ({ channelId, reason }) => {
      const token = await getToken();
      return axios.delete(
        buildApiUrl(`/admin/channels/${channelId}`),
        {
          data: { reason },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    },
    onSuccess: (data, variables) => {
      toast.success("Channel deleted by administrator");
      setChannelToDelete(null);
      setDeleteReason("");
      // Optimistically remove the deleted channel immediately from cache
      queryClient.setQueriesData(
        { queryKey: ["adminChannels"] },
        (old) => {
          if (!old || !old.channels) return old;
          return {
            ...old,
            channels: old.channels.filter((c) => c._id !== variables.channelId),
            totalChannels: Math.max(0, (old.totalChannels || 1) - 1),
          };
        }
      );
      queryClient.invalidateQueries({ queryKey: ["adminChannels"] });
    },
    onError: (err) => {
      toast.error(err.response?.data || "Failed to delete channel");
    },
  });

  // Never show deleted channels in the admin channels list
  const displayedChannels = (channelsData?.channels || []).filter(
    (ch) => ch.status !== "deleted"
  );

  // Resolve/Dismiss Report Mutation
  const resolveReportMutation = useMutation({
    mutationFn: async ({ reportId, status, action, reason }) => {
      const token = await getToken();
      return axios.patch(
        buildApiUrl(`/admin/reports/${reportId}`),
        { status, action, reason },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    },
    onSuccess: () => {
      toast.success("Report updated successfully");
      setActioningReport(null);
      queryClient.invalidateQueries({ queryKey: ["adminReports"] });
    },
    onError: (err) => {
      toast.error(err.response?.data || "Failed to process report");
    },
  });

  return (
    <div className="flex flex-col gap-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-[#35443A]">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-[#E5E9E4]">
            Channel & Moderation Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-[#A5B0A7] mt-1">
            Oversee community channels, enforce guidelines, and review reported messages.
          </p>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#1B241E] p-1 rounded-xl border border-transparent dark:border-[#35443A]">
          <button
            onClick={() => setActiveSubTab("channels")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === "channels"
                ? "bg-white dark:bg-[#222D25] text-gray-900 dark:text-[#E5E9E4] shadow-xs"
                : "text-gray-600 dark:text-[#A5B0A7] hover:text-gray-900 dark:hover:text-[#E5E9E4]"
            }`}
          >
            Channels ({channelsData?.totalChannels ?? displayedChannels.length})
          </button>
          <button
            onClick={() => setActiveSubTab("reports")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === "reports"
                ? "bg-white dark:bg-[#222D25] text-gray-900 dark:text-[#E5E9E4] shadow-xs"
                : "text-gray-600 dark:text-[#A5B0A7] hover:text-gray-900 dark:hover:text-[#E5E9E4]"
            }`}
          >
            <span>Message Reports</span>
            {reportsData?.totalReports > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 font-bold">
                {reportsData.totalReports}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* CHANNELS TAB */}
      {activeSubTab === "channels" && (
        <div className="flex flex-col gap-4">
          {/* FILTERS */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by channel name or slug..."
              className="w-full sm:w-80 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-[#35443A] bg-white dark:bg-[#1B241E] text-gray-900 dark:text-[#E5E9E4] placeholder-gray-400 dark:placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-green-800/20 focus:border-green-800"
            />

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-gray-400 dark:text-[#A5B0A7]">Visibility:</span>
              <select
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-[#35443A] text-xs bg-white dark:bg-[#1B241E] text-gray-700 dark:text-[#E5E9E4] focus:outline-none"
              >
                <option value="all">All Channels</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          {/* CHANNELS TABLE */}
          {isChannelsLoading ? (
            <div className="py-12 text-center text-xs text-gray-400 dark:text-[#A5B0A7]">
              Loading channels...
            </div>
          ) : displayedChannels.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 dark:text-[#A5B0A7] bg-white dark:bg-[#1B241E] rounded-2xl border border-gray-100 dark:border-[#35443A]">
              No channels match the criteria.
            </div>
          ) : (
            <div className="bg-white dark:bg-[#1B241E] rounded-2xl border border-gray-100 dark:border-[#35443A] shadow-xs overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-[#35443A] text-gray-400 dark:text-[#A5B0A7] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Creator</th>
                    <th className="py-3 px-4">Visibility</th>
                    <th className="py-3 px-4">Members</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#35443A]">
                  {displayedChannels.map((ch) => (
                    <tr key={ch._id} className="hover:bg-gray-50/60 dark:hover:bg-[#222D25]/60 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-[#E5E9E4]">
                        <Link
                          to={`/channels/${ch.slug}`}
                          className="hover:text-green-800 dark:hover:text-[#7BC98C] transition-colors flex items-center gap-1"
                        >
                          <span className="text-green-800 dark:text-[#7BC98C]">#</span>
                          <span>{ch.name}</span>
                        </Link>
                        <span className="text-[10px] text-gray-400 dark:text-[#A5B0A7] font-mono">
                          /{ch.slug}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-gray-600 dark:text-[#A5B0A7]">
                        @{ch.creator?.username || "Unknown"}
                      </td>

                      <td className="py-3.5 px-4 capitalize text-gray-600">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            ch.visibility === "public"
                              ? "bg-emerald-50 dark:bg-[#25382B] text-emerald-700 dark:text-[#7BC98C] border border-emerald-200/50 dark:border-[#35443A]"
                              : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/50"
                          }`}
                        >
                          {ch.visibility}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-gray-700 dark:text-[#E5E9E4]">
                        {ch.memberCount || 1}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize bg-green-50 dark:bg-[#25382B] text-green-700 dark:text-[#7BC98C] border border-green-200/50 dark:border-[#35443A]">
                          {ch.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-gray-400 dark:text-[#A5B0A7]">
                        {format(ch.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/channels/${ch.slug}`}
                            className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-[#222D25] hover:bg-gray-200 dark:hover:bg-[#2b3a2f] text-gray-700 dark:text-[#E5E9E4] text-xs font-medium transition-colors"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => setChannelToDelete(ch)}
                            className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium transition-colors"
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
      )}

      {/* REPORTS TAB */}
      {activeSubTab === "reports" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 dark:text-[#A5B0A7]">Filter Status:</span>
              <select
                value={reportStatus}
                onChange={(e) => setReportStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-[#35443A] text-xs bg-white dark:bg-[#1B241E] text-gray-700 dark:text-[#E5E9E4] focus:outline-none"
              >
                <option value="all">All Reports</option>
                <option value="pending">Pending</option>
                <option value="actioned">Actioned</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
          </div>

          {isReportsLoading ? (
            <div className="py-12 text-center text-xs text-gray-400 dark:text-[#A5B0A7]">
              Loading reports...
            </div>
          ) : reportsData?.reports?.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 dark:text-[#A5B0A7] bg-white dark:bg-[#1B241E] rounded-2xl border border-gray-100 dark:border-[#35443A]">
              No reported messages found.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {reportsData.reports.map((rep) => (
                <div
                  key={rep._id}
                  className="p-5 rounded-2xl bg-white dark:bg-[#1B241E] border border-gray-100 dark:border-[#35443A] shadow-2xs flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-gray-900 dark:text-[#E5E9E4]">
                        Reported in #{rep.channel?.name || "unknown"}
                      </span>
                      <span className="text-gray-400 dark:text-[#A5B0A7]">•</span>
                      <span className="text-gray-500 dark:text-[#A5B0A7]">
                        by @{rep.reporter?.username || "Anonymous"}
                      </span>
                      <span className="text-gray-400 dark:text-[#A5B0A7]">•</span>
                      <span className="text-gray-400 dark:text-[#A5B0A7]">{format(rep.createdAt)}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        rep.status === "pending"
                          ? "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40"
                          : rep.status === "actioned"
                          ? "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200/50 dark:border-red-800/40"
                          : "bg-gray-100 dark:bg-[#222D25] text-gray-600 dark:text-[#A5B0A7]"
                      }`}
                    >
                      {rep.status}
                    </span>
                  </div>

                  <div className="p-3 bg-red-50/50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/40 text-xs text-gray-700 dark:text-[#E5E9E4]">
                    <span className="font-semibold text-red-800 dark:text-red-400">Reason: </span>
                    {rep.reason}
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-[#222D25] rounded-xl border border-gray-100 dark:border-[#35443A] text-xs text-gray-800 dark:text-[#E5E9E4]">
                    <div className="text-[10px] text-gray-400 dark:text-[#A5B0A7] mb-1">
                      Message author: @{rep.message?.sender?.username || "Unknown"}
                    </div>
                    <div className="font-mono text-gray-700 dark:text-[#E5E9E4] whitespace-pre-wrap">
                      {rep.message?.content || "[Deleted content]"}
                    </div>
                  </div>

                  {rep.status === "pending" && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-50 dark:border-[#35443A]">
                      <button
                        onClick={() =>
                          resolveReportMutation.mutate({
                            reportId: rep._id,
                            status: "dismissed",
                            reason: "Dismissed by admin",
                          })
                        }
                        disabled={resolveReportMutation.isPending}
                        className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-[#35443A] hover:bg-gray-100 dark:hover:bg-[#222D25] text-xs font-semibold text-gray-700 dark:text-[#E5E9E4] transition-colors disabled:opacity-50"
                      >
                        Dismiss Report
                      </button>
                      <button
                        onClick={() =>
                          resolveReportMutation.mutate({
                            reportId: rep._id,
                            status: "actioned",
                            action: "DELETE_MESSAGE",
                            reason: "Inappropriate message removed by administrator",
                          })
                        }
                        disabled={resolveReportMutation.isPending}
                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        Delete Message & Resolve
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONFIRM DELETE CHANNEL MODAL */}
      <ConfirmModal
        isOpen={!!channelToDelete}
        title="Admin: Delete Channel"
        message={`Are you sure you want to soft-delete channel #${channelToDelete?.name}? It will be deactivated across the platform.`}
        confirmText="Delete Channel"
        confirmStyle="danger"
        isLoading={deleteChannelMutation.isPending}
        onConfirm={() => {
          if (channelToDelete) {
            deleteChannelMutation.mutate({
              channelId: channelToDelete._id,
              reason: "Platform administrator action",
            });
          }
        }}
        onClose={() => setChannelToDelete(null)}
      />
    </div>
  );
};

export default AdminChannels;

