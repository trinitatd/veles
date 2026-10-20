import React, { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";
import { format } from "timeago.js";
import { Link } from "react-router-dom";
import ConfirmModal from "../../components/ConfirmModal";

const AdminChannels = () => {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [activeSubTab, setActiveSubTab] = useState("channels"); // "channels" | "reports"
  const [searchTerm, setSearchTerm] = useState("");
  const [channelStatus, setChannelStatus] = useState("all");
  const [reportStatus, setReportStatus] = useState("all");
  const [channelToDelete, setChannelToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [actioningReport, setActioningReport] = useState(null); // { report, action: 'DELETE_MESSAGE' | 'DISMISS' }

  // Query Channels
  const { data: channelsData, isPending: isChannelsLoading } = useQuery({
    queryKey: ["adminChannels", searchTerm, channelStatus],
    queryFn: async () => {
      const token = await getToken();
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/channels?search=${encodeURIComponent(
          searchTerm
        )}&status=${channelStatus}&limit=50`,
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
        `${import.meta.env.VITE_API_URL}/admin/reports?status=${reportStatus}&limit=50`,
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
        `${import.meta.env.VITE_API_URL}/admin/channels/${channelId}`,
        {
          data: { reason },
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    },
    onSuccess: () => {
      toast.success("Channel deleted by administrator");
      setChannelToDelete(null);
      setDeleteReason("");
      queryClient.invalidateQueries({ queryKey: ["adminChannels"] });
    },
    onError: (err) => {
      toast.error(err.response?.data || "Failed to delete channel");
    },
  });

  // Resolve/Dismiss Report Mutation
  const resolveReportMutation = useMutation({
    mutationFn: async ({ reportId, status, action, reason }) => {
      const token = await getToken();
      return axios.patch(
        `${import.meta.env.VITE_API_URL}/admin/reports/${reportId}`,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Channel & Moderation Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Oversee community channels, enforce guidelines, and review reported messages.
          </p>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab("channels")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === "channels"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            All Channels ({channelsData?.totalChannels || 0})
          </button>
          <button
            onClick={() => setActiveSubTab("reports")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === "reports"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span>Message Reports</span>
            {reportsData?.totalReports > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-700 font-bold">
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
              className="w-full sm:w-80 px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-green-800/20 focus:border-green-800"
            />

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs text-gray-400">Status:</span>
              <select
                value={channelStatus}
                onChange={(e) => setChannelStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-white text-gray-700 focus:outline-none"
              >
                <option value="all">All</option>
                <option value="active">Active Only</option>
                <option value="deleted">Deleted Only</option>
              </select>
            </div>
          </div>

          {/* CHANNELS TABLE */}
          {isChannelsLoading ? (
            <div className="py-12 text-center text-xs text-gray-400">
              Loading channels...
            </div>
          ) : channelsData?.channels?.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 bg-white rounded-2xl border border-gray-100">
              No channels match the criteria.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Creator</th>
                    <th className="py-3 px-4">Visibility</th>
                    <th className="py-3 px-4">Members</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {channelsData.channels.map((ch) => (
                    <tr key={ch._id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        <Link
                          to={`/channels/${ch.slug}`}
                          className="hover:text-green-800 transition-colors flex items-center gap-1"
                        >
                          <span>#</span>
                          <span>{ch.name}</span>
                        </Link>
                        <span className="text-[10px] text-gray-400 font-mono">
                          /{ch.slug}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-gray-600">
                        @{ch.creator?.username || "Unknown"}
                      </td>

                      <td className="py-3.5 px-4 capitalize text-gray-600">
                        {ch.visibility}
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-gray-700">
                        {ch.memberCount || 1}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                            ch.status === "active"
                              ? "bg-green-50 text-green-700 border border-green-200/50"
                              : "bg-red-50 text-red-600 border border-red-200/50"
                          }`}
                        >
                          {ch.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-gray-400">
                        {format(ch.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/channels/${ch.slug}`}
                            className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium"
                          >
                            View
                          </Link>
                          {ch.status === "active" && (
                            <button
                              onClick={() => setChannelToDelete(ch)}
                              className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium"
                            >
                              Delete
                            </button>
                          )}
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
              <span className="text-xs text-gray-400">Filter Status:</span>
              <select
                value={reportStatus}
                onChange={(e) => setReportStatus(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs bg-white text-gray-700 focus:outline-none"
              >
                <option value="all">All Reports</option>
                <option value="pending">Pending</option>
                <option value="actioned">Actioned</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
          </div>

          {isReportsLoading ? (
            <div className="py-12 text-center text-xs text-gray-400">
              Loading reports...
            </div>
          ) : reportsData?.reports?.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 bg-white rounded-2xl border border-gray-100">
              No reported messages found.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {reportsData.reports.map((rep) => (
                <div
                  key={rep._id}
                  className="p-5 rounded-2xl bg-white border border-gray-100 shadow-2xs flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-gray-900">
                        Reported in #{rep.channel?.name || "unknown"}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500">
                        by @{rep.reporter?.username || "Anonymous"}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-400">{format(rep.createdAt)}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        rep.status === "pending"
                          ? "bg-amber-50 text-amber-800 border border-amber-200/50"
                          : rep.status === "actioned"
                          ? "bg-red-50 text-red-700 border border-red-200/50"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {rep.status}
                    </span>
                  </div>

                  <div className="p-3 bg-red-50/50 rounded-xl border border-red-100 text-xs text-gray-700">
                    <span className="font-semibold text-red-800">Reason: </span>
                    {rep.reason}
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-800">
                    <div className="text-[10px] text-gray-400 mb-1">
                      Message author: @{rep.message?.sender?.username || "Unknown"}
                    </div>
                    <div className="font-mono text-gray-700 whitespace-pre-wrap">
                      {rep.message?.content || "[Deleted content]"}
                    </div>
                  </div>

                  {rep.status === "pending" && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-50">
                      <button
                        onClick={() =>
                          resolveReportMutation.mutate({
                            reportId: rep._id,
                            status: "dismissed",
                            reason: "Dismissed by admin",
                          })
                        }
                        disabled={resolveReportMutation.isPending}
                        className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-colors disabled:opacity-50"
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

