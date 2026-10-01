import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";
import { format } from "timeago.js";

const AdminComments = () => {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [commentToEdit, setCommentToEdit] = useState(null);
  const [editDesc, setEditDesc] = useState("");

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
        `${import.meta.env.VITE_API_URL}/admin/comments?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return res.data;
    },
  });

  // Edit comment mutation
  const editMutation = useMutation({
    mutationFn: async ({ commentId, desc }) => {
      const token = await getToken();
      return axios.patch(
        `${import.meta.env.VITE_API_URL}/admin/comments/${commentId}`,
        { desc },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: () => {
      toast.success("Comment updated successfully!");
      setCommentToEdit(null);
      setEditDesc("");
      queryClient.invalidateQueries({ queryKey: ["adminComments"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.response?.data || "Failed to update comment");
    },
  });

  // Delete comment mutation
  const deleteMutation = useMutation({
    mutationFn: async (commentId) => {
      const token = await getToken();
      return axios.delete(
        `${import.meta.env.VITE_API_URL}/admin/comments/${commentId}`,
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

  const handleStartEdit = (comment) => {
    setCommentToEdit(comment);
    setEditDesc(comment.desc || "");
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editDesc.trim()) {
      toast.error("Comment cannot be empty!");
      return;
    }
    editMutation.mutate({
      commentId: commentToEdit._id,
      desc: editDesc.trim(),
    });
  };

  const comments = data?.comments || [];
  const totalComments = data?.totalComments || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="flex flex-col gap-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Comment Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review community comments, moderate discussions, and edit or remove inappropriate remarks.
          </p>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search comments by keyword or content..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-800/20 focus:border-green-800 transition-all"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
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
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        {isPending ? (
          <div className="py-20 text-center text-sm text-gray-500 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-green-800 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading comments...</span>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-500">
            Failed to load comments. Please try again.
          </div>
        ) : comments.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xl">
              💬
            </div>
            <h3 className="font-bold text-gray-700">No comments found</h3>
            <p className="text-xs text-gray-400 max-w-sm">
              {search
                ? "No comments matched your search criteria."
                : "No comments have been posted yet across the platform."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  <th className="py-3 px-4">Comment Content</th>
                  <th className="py-3 px-4">Author</th>
                  <th className="py-3 px-4">Associated Article</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {comments.map((comment) => (
                  <tr key={comment._id} className="hover:bg-gray-50/60 transition-colors group">
                    {/* Content */}
                    <td className="py-3.5 px-4 max-w-md">
                      <p className="text-gray-800 line-clamp-2 text-sm leading-relaxed">
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
                          <span className="text-xs font-semibold text-gray-800">
                            {comment.user?.username ? `@${comment.user.username}` : "Anonymous"}
                          </span>
                          {comment.user?.email && (
                            <span className="text-[10px] text-gray-400">
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
                          className="text-xs font-medium text-green-800 hover:text-green-900 hover:underline line-clamp-1"
                          title={comment.post.title}
                        >
                          {comment.post.title}
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Article removed</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-xs text-gray-400">
                      {format(comment.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Article */}
                        {comment.post && (
                          <Link
                            to={`/${comment.post.slug}`}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
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

                        {/* Edit Comment */}
                        <button
                          onClick={() => handleStartEdit(comment)}
                          className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
                          title="Edit Comment"
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
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>

                        {/* Delete Comment */}
                        <button
                          onClick={() => setCommentToDelete(comment)}
                          className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
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
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing page <strong className="text-gray-800">{page}</strong> of{" "}
              <strong className="text-gray-800">{totalPages}</strong> ({totalComments} total comments)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* EDIT COMMENT MODAL */}
      {commentToEdit && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Edit Comment</h3>
              <button
                type="button"
                onClick={() => setCommentToEdit(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2.5 rounded-xl">
              <span>Author:</span>
              <strong className="text-gray-800">@{commentToEdit.user?.username || "Anonymous"}</strong>
              {commentToEdit.post && (
                <>
                  <span className="mx-1">•</span>
                  <span>On:</span>
                  <strong className="text-gray-800 truncate max-w-xs">{commentToEdit.post.title}</strong>
                </>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-700">Comment Text</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={4}
                required
                className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-800/20 focus:border-green-800"
              />
            </div>

            <div className="flex items-center justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setCommentToEdit(null)}
                disabled={editMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-white bg-green-800 rounded-xl hover:bg-green-900 transition-colors disabled:opacity-50"
              >
                {editMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {commentToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xl shrink-0">
              ⚠️
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Delete Comment</h3>
              <p className="text-sm text-gray-600 mt-1">
                Are you sure you want to delete this comment by{" "}
                <span className="font-semibold text-gray-800">
                  @{commentToDelete.user?.username || "Anonymous"}
                </span>
                ?
              </p>
              <div className="mt-3 p-3 bg-gray-50 rounded-xl text-xs text-gray-700 italic border border-gray-200 line-clamp-3">
                "{commentToDelete.desc}"
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setCommentToDelete(null)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
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
