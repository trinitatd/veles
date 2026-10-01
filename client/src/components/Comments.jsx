import axios from "axios";
import Comment from "./Comment";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/clerk-react";
import { toast } from "react-toastify";

const fetchComments = async (postId) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/comments/${postId}`
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
        `${import.meta.env.VITE_API_URL}/comments/${postId}`,
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
      <h1 className="text-xl text-gray-500 underline">Comments</h1>
      <form
        onSubmit={handleSubmit}
        className="flex items-center justify-between gap-8 w-full"
      >
        <textarea
          name="desc"
          placeholder="Write a comment..."
          className="w-full p-4 rounded-xl shadow-sm border border-gray-100 focus:outline-none focus:ring-1 focus:ring-green-800"
          rows={2}
        />
        <button
          disabled={mutation.isPending}
          className="bg-green-800 px-5 py-3 text-white font-medium rounded-xl hover:bg-green-900 transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? "Sending..." : "Send"}
        </button>
      </form>
      {isPending ? (
        "Loading..."
      ) : error ? (
        "Error loading comments!"
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
