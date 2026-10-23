import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";
import { format } from "timeago.js";
import { buildApiUrl } from "../../utils/api";

const AdminComments = () => {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [commentToDelete, setCommentToDelete] = useState(null);

  // Fetch comments with pagination and search
  const { data, isPending, error } = useQuery({
    queryKey: ["adminComments", { page, search }],
    queryFn: async () => {
      const token = await getToken();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });

      if (search) params.append("search", search);

      const res = await axios.get(
        buildApiUrl(`/admin/comments?${params.toString()}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return res.data;
    },
  });

  // Delete comment mutation
  const deleteMutation = useMutation({
    mutationFn: async (commentId) => {
      const token = await getToken();
      return axios.delete(
        buildApiUrl(`/admin/comments/${commentId}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: () => {
      toast.success("Comment deleted permanently");
      setCommentToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["adminComments"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.response?.data || "Failed to delete comment");
      setCommentToDelete(null);
    },
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const comments = data?.comments || [];
  const totalComments = data?.totalComments || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="flex flex-col gap-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-[#35443A]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-[#E5E9E4] tracking-tight">
            Comment Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-[#A5B0A7] mt-1">
            Review community comments, moderate discussions, and remove inappropriate remarks.
          </p>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white dark:bg-[#1B241E] rounded-2xl border border-gray-100 dark:border-[#35443A] shadow-sm p-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search comments by keyword or content..."
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
      </div>

      {/* COMMENTS TABLE */}
      <div className="bg-white dark:bg-[#1B241E] rounded-2xl border border-gray-100 dark:border-[#35443A] shadow-sm overflow-hidden flex flex-col">
        {isPending ? (
          <div className="py-20 text-center text-sm text-gray-500 dark:text-[#A5B0A7] flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-green-800 dark:border-[#7BC98C] border-t-transparent rounded-full animate-spin"></div>
            <span>Loading comments...</span>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-500">
            Failed to load comments. Please try again.
          </div>
        ) : comments.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#222D25] text-gray-400 dark:text-[#A5B0A7] flex items-center justify-center text-xl">
              💬
            </div>
            <h3 className="font-bold text-gray-700 dark:text-[#E5E9E4]">No comments found</h3>
            <p className="text-xs text-gray-400 dark:text-[#A5B0A7] max-w-sm">
              {search
                ? "No comments matched your search criteria."
                : "No comments have been posted yet across the platform."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 dark:bg-[#162019] border-b border-gray-200 dark:border-[#35443A] text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#A5B0A7]">
                  <th className="py-3 px-4">Comment Content</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4">Associated Article</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#35443A] text-sm">
                {comments.map((comment) => (
                  <tr key={comment._id} className="hover:bg-gray-50/60 dark:hover:bg-[#222D25]/60 transition-colors group">
                    {/* Content */}
                    <td className="py-3.5 px-4 max-w-md">
                      <p className="text-gray-800 dark:text-[#E5E9E4] line-clamp-2 text-sm leading-relaxed">
                        {comment.desc}
                      </p>
                    </td>

                    {/* Author */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <img
                          src={comment.user?.img || "/userImg.jpeg"}
                          alt={comment.user?.username || "User"}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-gray-800 dark:text-[#E5E9E4]">
                            {comment.user?.username ? `@${comment.user.username}` : "Anonymous"}
                          </span>
                          {comment.user?.email && (
                            <span className="text-[10px] text-gray-400 dark:text-[#A5B0A7]">
                              {comment.user.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Associated Article */}
                    <td className="py-3.5 px-4 max-w-xs">
                      {comment.post ? (
                        <Link
                          to={`/${comment.post.slug}`}
                          className="text-xs font-medium text-green-800 dark:text-[#7BC98C] hover:text-green-900 dark:hover:text-[#9fe2ad] hover:underline line-clamp-1"
                          title={comment.post.title}
                        >
                          {comment.post.title}
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-[#A5B0A7] italic">Article removed</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-xs text-gray-400 dark:text-[#A5B0A7]">
                      {format(comment.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Article */}
                        {comment.post && (
                          <Link
                            to={`/${comment.post.slug}`}
                            className="p-1.5 rounded-lg text-gray-400 dark:text-[#A5B0A7] hover:text-gray-700 dark:hover:text-[#E5E9E4] hover:bg-gray-100 dark:hover:bg-[#222D25] transition-colors"
                            title="View Associated Article"
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
                        )}

                        {/* Delete Comment */}
                        <button
                          onClick={() => setCommentToDelete(comment)}
                          className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-[#222D25] transition-colors"
                          title="Delete Comment"
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
              <strong className="text-gray-800 dark:text-[#E5E9E4]">{totalPages}</strong> ({totalComments} total comments)
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
      {commentToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1B241E] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-[#35443A] flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 flex items-center justify-center text-xl shrink-0">
              ⚠️
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-[#E5E9E4]">Delete Comment</h3>
              <p className="text-sm text-gray-600 dark:text-[#A5B0A7] mt-1">
                Are you sure you want to delete this comment by{" "}
                <span className="font-semibold text-gray-800 dark:text-[#E5E9E4]">
                  @{commentToDelete.user?.username || "Anonymous"}
                </span>
                ?
              </p>
              <div className="mt-3 p-3 bg-gray-50 dark:bg-[#222D25] rounded-xl text-xs text-gray-700 dark:text-[#A5B0A7] italic border border-gray-200 dark:border-[#35443A] line-clamp-3">
                "{commentToDelete.desc}"
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setCommentToDelete(null)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-[#E5E9E4] bg-gray-100 dark:bg-[#222D25] rounded-xl hover:bg-gray-200 dark:hover:bg-[#2b3a2f] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(commentToDelete._id)}
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

export default AdminComments;
