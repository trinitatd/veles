import { useUser, useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { buildApiUrl } from "../utils/api";

const PostMenuActions = ({ post }) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const {
    data: savedPosts,
  } = useQuery({
    queryKey: ["savedPosts"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return [];
      const res = await axios.get(buildApiUrl("/users/saved"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return res.data;
    },
    enabled: !!user,
    retry: 1,
  });

  const {
    data: readlistPosts,
  } = useQuery({
    queryKey: ["readlist"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return [];
      const res = await axios.get(buildApiUrl("/users/readlist"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return res.data;
    },
    enabled: !!user,
    retry: 1,
  });

  const isAdmin = user?.publicMetadata?.role === "admin" || false;
  const isAuthor = Boolean(
    user &&
      ((post.user?.clerkUserId && post.user.clerkUserId === user.id) ||
        (post.user?.username && post.user.username === user.username))
  );
  const canDelete = isAuthor || isAdmin;

  const savedList = Array.isArray(savedPosts)
    ? savedPosts
    : Array.isArray(savedPosts?.data)
    ? savedPosts.data
    : [];
  const isSaved = savedList.includes(post._id);

  const readlist = Array.isArray(readlistPosts)
    ? readlistPosts
    : Array.isArray(readlistPosts?.data)
    ? readlistPosts.data
    : [];
  const isInReadlist = readlist.includes(post._id);

  const likes = post.likes || [];
  const isLiked = user ? likes.includes(user.id) : false;
  const likesCount = likes.length;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return axios.delete(buildApiUrl(`/posts/${post._id}`), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
    onSuccess: () => {
      toast.success("Post deleted successfully!");
      navigate("/");
    },
    onError: (error) => {
      toast.error(error?.response?.data || "Failed to delete post");
    },
  });

  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return axios.patch(
        buildApiUrl(`/posts/${post._id}/like`),
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post", post.slug] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error) => {
      toast.error(error?.response?.data || "Failed to update like");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return axios.patch(
        buildApiUrl("/users/save"),
        {
          postId: post._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedPosts"] });
    },
    onError: (error) => {
      toast.error(error?.response?.data || "Failed to update saved post");
    },
  });

  const readlistMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return axios.patch(
        buildApiUrl("/users/readlist"),
        {
          postId: post._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["readlist"] });
      toast.success(res?.data || (isInReadlist ? "Removed from Readlist" : "Added to Readlist"));
    },
    onError: (error) => {
      toast.error(error?.response?.data || "Failed to update Readlist");
    },
  });

  const featureMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return axios.patch(
        buildApiUrl("/posts/feature"),
        {
          postId: post._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post", post.slug] });
    },
    onError: (error) => {
      toast.error(error?.response?.data || "Failed to feature post");
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const handleFeature = () => {
    featureMutation.mutate();
  };

  const handleLike = () => {
    if (!user) {
      return navigate("/login");
    }
    likeMutation.mutate();
  };

  const handleSave = () => {
    if (!user) {
      return navigate("/login");
    }
    saveMutation.mutate();
  };

  const handleReadlist = () => {
    if (!user) {
      return navigate("/login");
    }
    readlistMutation.mutate();
  };

  return (
    <div className="text-gray-800 dark:text-[#E5E9E4]">
      <h1 className="mt-8 mb-4 text-sm font-medium text-gray-900 dark:text-[#E5E9E4]">Actions</h1>

      {/* LIKE ACTION */}
      <div
        className="flex items-center gap-2 py-2 text-sm cursor-pointer hover:opacity-80 transition-opacity"
        onClick={handleLike}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="20px"
          height="20px"
          fill={
            likeMutation.isPending
              ? isLiked
                ? "none"
                : "#ef4444"
              : isLiked
              ? "#ef4444"
              : "none"
          }
          stroke={isLiked ? "#ef4444" : "currentColor"}
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
          />
        </svg>
        <span className={isLiked ? "text-red-600 dark:text-red-400 font-medium" : ""}>
          {isLiked ? "Liked" : "Like"} ({likesCount})
        </span>
        {likeMutation.isPending && (
          <span className="text-xs text-gray-400 dark:text-gray-500">(...)</span>
        )}
      </div>

      {/* SAVE ACTION */}
      <div
        className="flex items-center gap-2 py-2 text-sm cursor-pointer hover:opacity-80 transition-opacity"
        onClick={handleSave}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 48 48"
          width="20px"
          height="20px"
          className="text-gray-700 dark:text-[#E5E9E4]"
        >
          <path
            d="M12 4C10.3 4 9 5.3 9 7v34l15-9 15 9V7c0-1.7-1.3-3-3-3H12z"
            stroke="currentColor"
            strokeWidth="2"
            fill={
              saveMutation.isPending
                ? isSaved
                  ? "none"
                  : "currentColor"
                : isSaved
                ? "currentColor"
                : "none"
            }
          />
        </svg>
        <span>{isSaved ? "Saved" : "Save this Post"}</span>
        {saveMutation.isPending && (
          <span className="text-xs text-gray-500 dark:text-gray-400">(in progress)</span>
        )}
      </div>

      {/* READLIST ACTION */}
      <div
        className="flex items-center gap-2 py-2 text-sm cursor-pointer hover:opacity-80 transition-opacity"
        onClick={handleReadlist}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="20px"
          height="20px"
          fill={isInReadlist ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          className={isInReadlist ? "text-teal-700 dark:text-[#7BC98C]" : "text-gray-700 dark:text-[#E5E9E4]"}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
          />
        </svg>
        <span className={isInReadlist ? "text-teal-700 dark:text-[#7BC98C] font-medium" : ""}>
          {isInReadlist ? "In Readlist" : "Add to Readlist"}
        </span>
        {readlistMutation.isPending && (
          <span className="text-xs text-gray-400 dark:text-gray-500">(...)</span>
        )}
      </div>
      {isAdmin && (
        <div
          className="flex items-center gap-2 py-2 text-sm cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleFeature}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            width="20px"
            height="20px"
            className="text-gray-700 dark:text-[#E5E9E4]"
          >
            <path
              d="M24 2L29.39 16.26L44 18.18L33 29.24L35.82 44L24 37L12.18 44L15 29.24L4 18.18L18.61 16.26L24 2Z"
              stroke="currentColor"
              strokeWidth="2"
              fill={
                featureMutation.isPending
                  ? post.isFeatured
                    ? "none"
                    : "currentColor"
                  : post.isFeatured
                  ? "currentColor"
                  : "none"
              }
            />
          </svg>
          <span>Feature</span>
          {featureMutation.isPending && (
            <span className="text-xs text-gray-500 dark:text-gray-400">(in progress)</span>
          )}
        </div>
      )}
      {(isAuthor || canDelete) && (
        <div className="flex flex-col gap-2">
          {isAuthor && (
            <Link
              to={`/edit/${post._id}`}
              className="flex items-center gap-2 py-2 text-sm text-blue-700 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
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
              <span>Edit this Post</span>
            </Link>
          )}

          {canDelete && (
            <div
              className="flex items-center gap-2 py-2 text-sm cursor-pointer text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              onClick={handleDelete}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 50 50"
                fill="currentColor"
                width="20px"
                height="20px"
              >
                <path d="M 21 2 C 19.354545 2 18 3.3545455 18 5 L 18 7 L 10.154297 7 A 1.0001 1.0001 0 0 0 9.984375 6.9863281 A 1.0001 1.0001 0 0 0 9.8398438 7 L 8 7 A 1.0001 1.0001 0 1 0 8 9 L 9 9 L 9 45 C 9 46.645455 10.354545 48 12 48 L 38 48 C 39.645455 48 41 46.645455 41 45 L 41 9 L 42 9 A 1.0001 1.0001 0 1 0 42 7 L 40.167969 7 A 1.0001 1.0001 0 0 0 39.841797 7 L 32 7 L 32 5 C 32 3.3545455 30.645455 2 29 2 L 21 2 z M 21 4 L 29 4 C 29.554545 4 30 4.4454545 30 5 L 30 7 L 20 7 L 20 5 C 20 4.4454545 20.445455 4 21 4 z M 11 9 L 18.832031 9 A 1.0001 1.0001 0 0 0 19.158203 9 L 30.832031 9 A 1.0001 1.0001 0 0 0 31.158203 9 L 39 9 L 39 45 C 39 45.554545 38.554545 46 38 46 L 12 46 C 11.445455 46 11 45.554545 11 45 L 11 9 z M 18.984375 13.986328 A 1.0001 1.0001 0 0 0 18 15 L 18 40 A 1.0001 1.0001 0 1 0 20 40 L 20 15 A 1.0001 1.0001 0 0 0 18.984375 13.986328 z M 24.984375 13.986328 A 1.0001 1.0001 0 0 0 24 15 L 24 40 A 1.0001 1.0001 0 1 0 26 40 L 26 15 A 1.0001 1.0001 0 0 0 24.984375 13.986328 z M 30.984375 13.986328 A 1.0001 1.0001 0 0 0 30 15 L 30 40 A 1.0001 1.0001 0 1 0 32 40 L 32 15 A 1.0001 1.0001 0 0 0 30.984375 13.986328 z" />
              </svg>
              <span>Delete this Post</span>
              {deleteMutation.isPending && (
                <span className="text-xs text-gray-500 dark:text-gray-400">(in progress)</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PostMenuActions;
