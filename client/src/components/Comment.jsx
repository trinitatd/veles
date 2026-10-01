import { format } from "timeago.js";
import { useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import axios from "axios";

const Comment = ({ comment, postId, post }) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editDesc, setEditDesc] = useState(comment.desc);

  // 1. Comment Owner: Current user wrote this comment
  const isCommentOwner = Boolean(
    user &&
      ((comment.user?.clerkUserId && comment.user.clerkUserId === user.id) ||
        (comment.user?.username &&
          user.username &&
          comment.user.username.toLowerCase() === user.username.toLowerCase()))
  );

  // 2. Post Author: Current user is the author of this post
  const isPostAuthor = Boolean(
    user &&
      ((post?.user?.clerkUserId && post.user.clerkUserId === user.id) ||
        (post?.user?.username &&
          user.username &&
          post.user.username.toLowerCase() === user.username.toLowerCase()))
  );

  const isAdmin = user?.publicMetadata?.role === "admin";

  // EDIT: ONLY the comment owner (or admin)
  // - A user can ALWAYS edit their own comment (whether they are the post author or not)
  // - The post author CANNOT edit other users' comments
  const canEdit = isCommentOwner || isAdmin;

  // DELETE: Comment owner OR post author (or admin)
  // - A user can ALWAYS delete their own comment
  // - The post author can delete other users' comments made on their post
  const canDelete = isCommentOwner || isPostAuthor || isAdmin;

  // Delete comment mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return axios.delete(
        `${import.meta.env.VITE_API_URL}/comments/${comment._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      toast.success("Comment deleted successfully");
    },
    onError: (error) => {
      toast.error(error?.response?.data || "Failed to delete comment");
    },
  });

  // Edit comment mutation
  const editMutation = useMutation({
    mutationFn: async (updatedDesc) => {
      const token = await getToken();
      return axios.patch(
        `${import.meta.env.VITE_API_URL}/comments/${comment._id}`,
        { desc: updatedDesc },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      toast.success("Comment updated successfully");
    },
    onError: (error) => {
      toast.error(error?.response?.data || "Failed to update comment");
    },
  });

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      deleteMutation.mutate();
    }
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editDesc || !editDesc.trim()) return;
    editMutation.mutate(editDesc.trim());
  };

  // Avatar source resolution
  const avatarSrc = comment.user?.img
    ? comment.user.img.startsWith("http") || comment.user.img.startsWith("/")
      ? comment.user.img
      : `${import.meta.env.VITE_IK_URL_ENDPOINT}/${comment.user.img}`
    : "/userImg.jpeg";

  return (
    <div className="p-4 bg-slate-50 border border-slate-100/80 rounded-xl mb-6 shadow-sm hover:border-slate-200 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* USER INFO */}
        <div className="flex items-center gap-3">
          <img
            src={avatarSrc}
            alt={comment.user?.username || "User"}
            className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-sm shrink-0"
            onError={(e) => {
              e.currentTarget.src = "/userImg.jpeg";
            }}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800 text-sm">
              {comment.user?.username || "User"}
            </span>
            {((post?.user?.clerkUserId &&
              comment.user?.clerkUserId &&
              post.user.clerkUserId === comment.user.clerkUserId) ||
              (post?.user?.username &&
                comment.user?.username &&
                post.user.username.toLowerCase() ===
                  comment.user.username.toLowerCase())) && (
              <span className="text-[11px] font-medium bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                Author
              </span>
            )}
            <span className="text-xs text-gray-400">
              {comment.createdAt ? format(comment.createdAt) : "Just now"}
            </span>
          </div>
        </div>

        {/* ACTIONS FOR COMMENTER OR POST AUTHOR OR ADMIN */}
        {(canEdit || canDelete) && !isEditing && comment._id && (
          <div className="flex items-center gap-3 shrink-0">
            {/* EDIT BUTTON (Only for commenter or admin) */}
            {canEdit && (
              <button
                onClick={() => {
                  setEditDesc(comment.desc);
                  setIsEditing(true);
                }}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-green-800 transition-colors"
                title="Edit comment"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3.5 h-3.5"
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
                <span>Edit</span>
              </button>
            )}

            {/* DELETE BUTTON (For commenter, post author, or admin) */}
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                title="Delete comment"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3.5 h-3.5"
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
                <span>
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* COMMENT CONTENT OR EDIT FORM */}
      <div className="mt-3 text-sm">
        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="flex flex-col gap-2 mt-1">
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-800"
              rows={2}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={editMutation.isPending || !editDesc.trim()}
                className="px-3 py-1.5 rounded-lg bg-green-800 hover:bg-green-900 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                {editMutation.isPending ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditDesc(comment.desc);
                  setIsEditing(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {comment.desc}
          </p>
        )}
      </div>
    </div>
  );
};

export default Comment;
