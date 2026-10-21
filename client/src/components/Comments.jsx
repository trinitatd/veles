import axios from "axios";
import Comment from "./Comment";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import { buildApiUrl } from "../utils/api";

const fetchComments = async (postId) => {
  const res = await axios.get(
    buildApiUrl(`/comments/${postId}`)
  );
  return res.data;
};

const Comments = ({ postId, post }) => {
  const { user } = useUser();
  const { getToken } = useAuth();

  const { isPending, error, data } = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => fetchComments(postId),
  });

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newComment) => {
      const token = await getToken();
      return axios.post(
        buildApiUrl(`/comments/${postId}`),
        newComment,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    },
    onError: (error) => {
      toast.error(error?.response?.data || "Failed to add comment");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const descValue = formData.get("desc");
    if (!descValue || !descValue.trim()) return;

    const data = {
      desc: descValue.trim(),
    };

    mutation.mutate(data);
    e.target.reset();
  };

  return (
    <div className="flex flex-col gap-8 lg:w-3/5 mb-12">
      <h1 className="text-xl font-bold text-gray-700 dark:text-[#E5E9E4] border-b border-gray-200 dark:border-[#35443A] pb-2">
        Comments ({data?.length || 0})
      </h1>
      <form
        onSubmit={handleSubmit}
        className="flex items-center justify-between gap-4 w-full"
      >
        <textarea
          name="desc"
          placeholder="Write a thoughtful comment..."
          className="w-full p-4 rounded-xl shadow-sm border border-gray-100 dark:border-[#35443A] bg-white dark:bg-[#1B241E] text-gray-800 dark:text-[#E5E9E4] placeholder-gray-400 dark:placeholder-[#A5B0A7]/60 focus:outline-none focus:ring-1 focus:ring-green-800 dark:focus:ring-[#7BC98C] transition-colors"
          rows={2}
        />
        <button
          disabled={mutation.isPending}
          className="bg-green-800 dark:bg-[#25382B] dark:border dark:border-[#35443A] hover:bg-green-900 dark:hover:bg-[#2e4736] px-5 py-3 text-white font-medium rounded-xl transition-colors disabled:opacity-50 shrink-0 shadow-sm"
        >
          {mutation.isPending ? "Sending..." : "Send"}
        </button>
      </form>
      {isPending ? (
        <div className="py-6 text-sm text-gray-500 dark:text-[#A5B0A7]">Loading comments...</div>
      ) : error ? (
        <div className="py-6 text-sm text-red-500">Error loading comments!</div>
      ) : (
        <>
          {mutation.isPending && (
            <Comment
              comment={{
                desc: `${mutation.variables.desc} (Sending...)`,
                createdAt: new Date(),
                user: {
                  img: user?.imageUrl,
                  username: user?.username || user?.firstName,
                  clerkUserId: user?.id,
                },
              }}
              post={post}
            />
          )}

          {data.map((comment) => (
            <Comment
              key={comment._id}
              comment={comment}
              postId={postId}
              post={post}
            />
          ))}
        </>
      )}
    </div>
  );
};

export default Comments;
