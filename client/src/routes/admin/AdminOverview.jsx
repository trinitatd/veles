import { useAuth, useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Link } from "react-router-dom";
import { format } from "timeago.js";
import Image from "../../components/Image";

const AdminOverview = () => {
  const { user } = useUser();
  const { getToken } = useAuth();

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const token = await getToken();
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/admin/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return res.data;
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  if (isPending) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-10 bg-gray-200 dark:bg-[#222D25] rounded-xl w-64"></div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 dark:bg-[#222D25] rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-72 bg-gray-200 dark:bg-[#222D25] rounded-2xl lg:col-span-2"></div>
          <div className="h-72 bg-gray-200 dark:bg-[#222D25] rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-2xl p-6 text-center">
        <h2 className="text-lg font-bold text-red-700 dark:text-red-400">Failed to load platform statistics</h2>
        <p className="text-sm text-red-600 dark:text-red-300 mt-1">
          {error.response?.data?.message || error.response?.data || error.message}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const {
    totalUsers = 0,
    totalPosts = 0,
    totalComments = 0,
    totalViews = 0,
    totalLikes = 0,
    categoryDistribution = [],
    recentPosts = [],
    recentLogs = [],
  } = data || {};

  return (
    <div className="flex flex-col gap-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-[#35443A]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-[#E5E9E4] tracking-tight">
            Platform Overview
          </h1>
          <p className="text-sm text-gray-500 dark:text-[#A5B0A7] mt-1">
            System metrics, user engagement, and content distribution across Veles.
          </p>
        </div>

       
      </div>

      {/* PLATFORM METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* TOTAL USERS */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1B241E] border border-gray-100 dark:border-[#35443A] shadow-sm flex flex-col gap-1.5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-gray-400 dark:text-[#A5B0A7]">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Users</span>
            <span className="text-lg"></span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-[#E5E9E4]">
            {totalUsers.toLocaleString()}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-[#A5B0A7]">Registered platform accounts</span>
        </div>

        {/* TOTAL ARTICLES */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1B241E] border border-gray-100 dark:border-[#35443A] shadow-sm flex flex-col gap-1.5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-gray-400 dark:text-[#A5B0A7]">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Articles</span>
            <span className="text-lg"></span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-green-800 dark:text-[#7BC98C]">
            {totalPosts.toLocaleString()}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-[#A5B0A7]">Published blog posts</span>
        </div>

        {/* TOTAL VIEWS */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1B241E] border border-gray-100 dark:border-[#35443A] shadow-sm flex flex-col gap-1.5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-gray-400 dark:text-[#A5B0A7]">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Views</span>
            <span className="text-lg"></span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-400">
            {totalViews.toLocaleString()}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-[#A5B0A7]">Cumulative post impressions</span>
        </div>

        {/* TOTAL COMMENTS */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1B241E] border border-gray-100 dark:border-[#35443A] shadow-sm flex flex-col gap-1.5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-gray-400 dark:text-[#A5B0A7]">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Comments</span>
            <span className="text-lg"></span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
            {totalComments.toLocaleString()}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-[#A5B0A7]">Community discussions</span>
        </div>

        {/* TOTAL LIKES */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#1B241E] border border-gray-100 dark:border-[#35443A] shadow-sm flex flex-col gap-1.5 hover:shadow-md transition-shadow col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-gray-400 dark:text-[#A5B0A7]">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Likes</span>
            <span className="text-lg"></span>
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
            {totalLikes.toLocaleString()}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-[#A5B0A7]">Reader endorsements</span>
        </div>
      </div>

      {/* RECENT ARTICLES & CATEGORY DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RECENT ARTICLES TABLE (2 COLS) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1B241E] rounded-2xl border border-gray-100 dark:border-[#35443A] shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-[#E5E9E4]">Recent Articles</h2>
              <p className="text-xs text-gray-400 dark:text-[#A5B0A7]">Latest publications across Veles</p>
            </div>
            <Link
              to="/admin/posts"
              className="text-xs font-semibold text-green-800 dark:text-[#7BC98C] hover:text-green-900 dark:hover:text-[#9fe2ad] transition-colors"
            >
              View all posts  
            </Link>
          </div>

          {recentPosts.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400 dark:text-[#A5B0A7]">
              No articles published yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-[#35443A] text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#A5B0A7]">
                    <th className="pb-3 pr-3">Title</th>
                    <th className="pb-3 px-3">Author</th>
                    <th className="pb-3 px-3">Category</th>
                    <th className="pb-3 px-3">Views</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 pl-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#35443A] text-sm">
                  {recentPosts.map((post) => (
                    <tr key={post._id} className="hover:bg-gray-50/70 dark:hover:bg-[#222D25]/70 transition-colors group">
                      <td className="py-3.5 pr-3 max-w-xs">
                        <Link
                          to={`/${post.slug}`}
                          className="font-medium text-gray-800 dark:text-[#E5E9E4] group-hover:text-green-800 dark:group-hover:text-[#7BC98C] transition-colors line-clamp-1"
                        >
                          {post.title}
                        </Link>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-xs text-gray-600 dark:text-[#A5B0A7]">
                        {post.user?.username ? `@${post.user.username}` : "Unknown"}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-[#222D25] text-gray-700 dark:text-[#A5B0A7] capitalize">
                          {post.category || "General"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-xs font-medium text-gray-700 dark:text-[#E5E9E4]">
                        {post.visit || 0}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {post.isFeatured ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 text-[10px] font-bold uppercase">
                            Featured
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400 dark:text-[#A5B0A7]">Standard</span>
                        )}
                      </td>
                      <td className="py-3.5 pl-3 text-right whitespace-nowrap text-xs text-gray-400 dark:text-[#A5B0A7]">
                        {format(post.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* CATEGORY DISTRIBUTION (1 COL) */}
        <div className="bg-white dark:bg-[#1B241E] rounded-2xl border border-gray-100 dark:border-[#35443A] shadow-sm p-6 flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-[#E5E9E4]">Category Distribution</h2>
            <p className="text-xs text-gray-400 dark:text-[#A5B0A7]">Article breakdown by official category</p>
          </div>

          <div className="flex flex-col gap-4">
            {categoryDistribution.map((cat) => (
              <div key={cat.slug} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-gray-700 dark:text-[#E5E9E4] font-semibold">{cat.label}</span>
                  <span className="text-gray-500 dark:text-[#A5B0A7]">
                    {cat.count} {cat.count === 1 ? "article" : "articles"} ({cat.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-[#222D25] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-800 dark:bg-[#7BC98C] transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(cat.percentage, cat.count > 0 ? 5 : 0)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Category Summary Footer */}
          <div className="pt-4 border-t border-gray-100 dark:border-[#35443A] text-xs text-gray-500 dark:text-[#A5B0A7] flex items-center justify-between">
            <span>Active Categories:</span>
            <span className="font-bold text-gray-800 dark:text-[#E5E9E4]">{categoryDistribution.length}</span>
          </div>
        </div>
      </div>

      {/* ADMIN RECENT ACTIVITY AUDIT LOG */}
      <div className="bg-white dark:bg-[#1B241E] rounded-2xl border border-gray-100 dark:border-[#35443A] shadow-sm p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-lg"></span>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-[#E5E9E4]">Recent Admin Activity</h2>
              <p className="text-xs text-gray-400 dark:text-[#A5B0A7]">Audit trail of administrative actions performed</p>
            </div>
          </div>
        </div>

        {recentLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400 dark:text-[#A5B0A7] italic">
            No administrative actions recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-[#35443A]">
            {recentLogs.map((log) => (
              <div
                key={log._id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-green-900 dark:text-[#7BC98C] bg-green-50 dark:bg-[#25382B] px-2 py-0.5 rounded border border-green-200 dark:border-[#35443A]">
                    @{log.adminUsername}
                  </span>
                  <span className="text-gray-700 dark:text-[#A5B0A7]">{log.details}</span>
                </div>
                <span className="text-gray-400 dark:text-gray-500 whitespace-nowrap">
                  {format(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOverview;
