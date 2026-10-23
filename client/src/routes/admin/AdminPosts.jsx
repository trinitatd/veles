import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";
import { format } from "timeago.js";
import Image from "../../components/Image";
import { buildApiUrl } from "../../utils/api";

const categories = [
  { label: "All Categories", value: "all" },
  { label: "Web Design", value: "web-design" },
  { label: "AI & ML", value: "ai_ml" },
  { label: "Databases", value: "databases" },
  { label: "SEO / Search Engines", value: "seo" },
  { label: "DevOps", value: "devops" },
  { label: "General", value: "general" },
];

const AdminPosts = () => {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [featured, setFeatured] = useState("all");
  const [sort, setSort] = useState("newest");
  const [postToDelete, setPostToDelete] = useState(null);

  // Fetch posts with server-side filtering, sorting & pagination
  const { data, isPending, error } = useQuery({
    queryKey: ["adminPosts", { page, search, category, featured, sort }],
    queryFn: async () => {
      const token = await getToken();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        sort,
      });

      if (search) params.append("search", search);
      if (category !== "all") params.append("category", category);
      if (featured !== "all") params.append("featured", featured);

      const res = await axios.get(
        buildApiUrl(`/admin/posts?${params.toString()}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return res.data;
    },
  });

  // Feature / Unfeature mutation
  const featureMutation = useMutation({
    mutationFn: async ({ postId, isFeatured }) => {
      const token = await getToken();
      return axios.patch(
        buildApiUrl(`/admin/posts/${postId}/feature`),
        { isFeatured },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: (res) => {
      toast.success(
        res.data.isFeatured
          ? "Article featured successfully!"
          : "Article unfeatured successfully!"
      );
      queryClient.invalidateQueries({ queryKey: ["adminPosts"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      queryClient.invalidateQueries({ queryKey: ["adminFeatured"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.response?.data || "Failed to update feature status");
    },
  });

  // Delete post mutation
  const deleteMutation = useMutation({
    mutationFn: async (postId) => {
      const token = await getToken();
      return axios.delete(buildApiUrl(`/admin/posts/${postId}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
    onSuccess: () => {
      toast.success("Post deleted permanently by administrator");
      setPostToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["adminPosts"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      queryClient.invalidateQueries({ queryKey: ["adminFeatured"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.response?.data || "Failed to delete post");
      setPostToDelete(null);
    },
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setPage(1);
  };

  const handleFeaturedChange = (e) => {
    setFeatured(e.target.value);
    setPage(1);
  };

  const handleSortChange = (e) => {
    setSort(e.target.value);
    setPage(1);
  };

  const posts = data?.posts || [];
  const totalPosts = data?.totalPosts || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="flex flex-col gap-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-[#35443A]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-[#E5E9E4] tracking-tight">
            Post Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-[#A5B0A7] mt-1">
            Browse, inspect, feature, and moderate all articles across Veles.
          </p>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white dark:bg-[#1B241E] rounded-2xl border border-gray-100 dark:border-[#35443A] shadow-sm p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search articles by title..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-[#35443A] bg-white dark:bg-[#222D25] text-gray-900 dark:text-[#E5E9E4] placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-green-800/20 focus:border-green-800 transition-all"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 text-gray-400 dark:text-[#A5B0A7] absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 dark:bg-[#222D25] hover:bg-gray-200 dark:hover:bg-[#2b3a2f] text-gray-700 dark:text-[#E5E9E4] text-xs font-semibold rounded-xl transition-colors"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }}
              className="text-xs text-red-600 hover:text-red-700 px-2 py-2"
            >
              Clear
            </button>
          )}
        </form>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Filter */}
          <select
            value={category}
            onChange={handleCategoryChange}
            className="px-3 py-2 bg-gray-50 dark:bg-[#222D25] border border-gray-200 dark:border-[#35443A] text-xs font-medium rounded-xl text-gray-700 dark:text-[#E5E9E4] focus:outline-none focus:ring-2 focus:ring-green-800/20"
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Featured Filter */}
          <select
            value={featured}
            onChange={handleFeaturedChange}
            className="px-3 py-2 bg-gray-50 dark:bg-[#222D25] border border-gray-200 dark:border-[#35443A] text-xs font-medium rounded-xl text-gray-700 dark:text-[#E5E9E4] focus:outline-none focus:ring-2 focus:ring-green-800/20"
          >
            <option value="all">All Posts (Featured & Standard)</option>
            <option value="true">Featured Only</option>
            <option value="false">Standard Only</option>
          </select>

          {/* Sort Filter */}
          <select
            value={sort}
            onChange={handleSortChange}
            className="px-3 py-2 bg-gray-50 dark:bg-[#222D25] border border-gray-200 dark:border-[#35443A] text-xs font-medium rounded-xl text-gray-700 dark:text-[#E5E9E4] focus:outline-none focus:ring-2 focus:ring-green-800/20"
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="popular">Sort: Most Viewed</option>
          </select>
        </div>
      </div>

      {/* POSTS TABLE */}
      <div className="bg-white dark:bg-[#1B241E] rounded-2xl border border-gray-100 dark:border-[#35443A] shadow-sm overflow-hidden flex flex-col">
        {isPending ? (
          <div className="py-20 text-center text-sm text-gray-500 dark:text-[#A5B0A7] flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-green-800 dark:border-[#7BC98C] border-t-transparent rounded-full animate-spin"></div>
            <span>Loading articles...</span>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-500">
            Failed to load articles. Please try again.
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#222D25] text-gray-400 dark:text-[#A5B0A7] flex items-center justify-center text-xl">
              🔍
            </div>
            <h3 className="font-bold text-gray-700 dark:text-[#E5E9E4]">No articles found</h3>
            <p className="text-xs text-gray-400 dark:text-[#A5B0A7] max-w-sm">
              Try adjusting your search query or removing category/featured filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 dark:bg-[#162019] border-b border-gray-200 dark:border-[#35443A] text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#A5B0A7]">
                  <th className="py-3 px-4">Article</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Views</th>
                  <th className="py-3 px-3">Likes</th>
                  <th className="py-3 px-3">Comments</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Featured</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#35443A] text-sm">
                {posts.map((post) => (
                  <tr key={post._id} className="hover:bg-gray-50/60 dark:hover:bg-[#222D25]/60 transition-colors group">
                    {/* Article Title & Cover */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex items-center gap-3">
                        {post.img ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gray-100 dark:bg-[#222D25]">
                            <Image
                              src={post.img}
                              w="48"
                              h="48"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-[#25382B] text-emerald-800 dark:text-[#7BC98C] font-bold flex items-center justify-center shrink-0 text-xs">
                            {post.category?.slice(0, 2).toUpperCase() || "PO"}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <Link
                            to={`/${post.slug}`}
                            className="font-medium text-gray-800 dark:text-[#E5E9E4] group-hover:text-green-800 dark:group-hover:text-[#7BC98C] transition-colors line-clamp-1"
                            title={post.title}
                          >
                            {post.title}
                          </Link>
                          <span className="text-[11px] text-gray-400 dark:text-[#A5B0A7] line-clamp-1">
                            {post.desc || "No excerpt"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Author */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <img
                          src={post.user?.img || "/userImg.jpeg"}
                          alt={post.user?.username || "Author"}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="text-xs font-medium text-gray-700 dark:text-[#E5E9E4]">
                          {post.user?.username ? `@${post.user.username}` : "Unknown"}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-[#222D25] text-gray-700 dark:text-[#A5B0A7] capitalize">
                        {post.category || "General"}
                      </span>
                    </td>

                    {/* Views */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-xs text-gray-600 dark:text-[#A5B0A7] font-medium">
                      {post.visit || 0}
                    </td>

                    {/* Likes */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-xs text-red-600 dark:text-red-400 font-medium">
                      ❤️ {post.likesCount ?? (post.likes?.length || 0)}
                    </td>

                    {/* Comments */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-xs text-amber-600 dark:text-amber-400 font-medium">
                      💬 {post.commentCount || 0}
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-xs text-gray-400 dark:text-[#A5B0A7]">
                      {format(post.createdAt)}
                    </td>

                    {/* Featured Toggle */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <button
                        onClick={() =>
                          featureMutation.mutate({
                            postId: post._id,
                            isFeatured: !post.isFeatured,
                          })
                        }
                        disabled={featureMutation.isPending}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors border ${
                          post.isFeatured
                            ? "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-900/50 hover:bg-amber-200"
                            : "bg-gray-100 dark:bg-[#222D25] text-gray-500 dark:text-[#A5B0A7] border-gray-200 dark:border-[#35443A] hover:bg-gray-200 dark:hover:bg-[#2b3a2f]"
                        }`}
                        title="Click to toggle featured status"
                      >
                        {post.isFeatured ? "Featured ★" : "Standard"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Post */}
                        <Link
                          to={`/${post.slug}`}
                          className="p-1.5 rounded-lg text-gray-400 dark:text-[#A5B0A7] hover:text-gray-700 dark:hover:text-[#E5E9E4] hover:bg-gray-100 dark:hover:bg-[#222D25] transition-colors"
                          title="View Article"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </Link>

                        {/* Delete Post */}
                        <button
                          onClick={() => setPostToDelete(post)}
                          className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-[#222D25] transition-colors"
                          title="Delete Article"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION BAR */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 dark:border-[#35443A] flex items-center justify-between text-xs text-gray-500 dark:text-[#A5B0A7]">
            <span>
              Showing page <strong className="text-gray-800 dark:text-[#E5E9E4]">{page}</strong> of{" "}
              <strong className="text-gray-800 dark:text-[#E5E9E4]">{totalPages}</strong> ({totalPosts} total articles)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#35443A] bg-white dark:bg-[#222D25] hover:bg-gray-50 dark:hover:bg-[#2b3a2f] text-gray-700 dark:text-[#E5E9E4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#35443A] bg-white dark:bg-[#222D25] hover:bg-gray-50 dark:hover:bg-[#2b3a2f] text-gray-700 dark:text-[#E5E9E4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {postToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1B241E] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-[#35443A] flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 flex items-center justify-center text-xl shrink-0">
              ⚠️
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-[#E5E9E4]">Delete Article</h3>
              <p className="text-sm text-gray-600 dark:text-[#A5B0A7] mt-1">
                Are you sure you want to permanently delete{" "}
                <span className="font-semibold text-gray-800 dark:text-[#E5E9E4]">
                  "{postToDelete.title}"
                </span>
                ? All associated comments and likes will be permanently removed. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setPostToDelete(null)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-[#E5E9E4] bg-gray-100 dark:bg-[#222D25] rounded-xl hover:bg-gray-200 dark:hover:bg-[#2b3a2f] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(postToDelete._id)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPosts;
