import { useAuth, useUser } from "@clerk/clerk-react";
import "react-quill-new/dist/quill.snow.css";
import ReactQuill from "react-quill-new";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import Upload from "../components/Upload";

const EditPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [desc, setDesc] = useState("");
  const [content, setContent] = useState("");
  const [cover, setCover] = useState("");
  const [img, setImg] = useState("");
  const [video, setVideo] = useState("");
  const [progress, setProgress] = useState(0);

  // Fetch post data by ID
  const {
    data: post,
    isPending: isFetchingPost,
    error: fetchError,
  } = useQuery({
    queryKey: ["postById", id],
    queryFn: async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/posts/by-id/${id}`
      );
      return res.data;
    },
  });

  // Populate state once post is loaded
  useEffect(() => {
    if (post) {
      setTitle(post.title || "");
      setCategory(post.category || "general");
      setDesc(post.desc || "");
      setContent(post.content || "");
      if (post.img) {
        setCover({ filePath: post.img, url: post.img });
      }
    }
  }, [post]);

  // Append embedded images to editor
  useEffect(() => {
    img && setContent((prev) => prev + `<p><img src="${img.url}"/></p>`);
  }, [img]);

  // Append embedded video to editor
  useEffect(() => {
    video &&
      setContent(
        (prev) => prev + `<p><iframe class="ql-video" src="${video.url}"/></p>`
      );
  }, [video]);

  const updateMutation = useMutation({
    mutationFn: async (updatedData) => {
      const token = await getToken();
      return axios.patch(
        `${import.meta.env.VITE_API_URL}/posts/${id}`,
        updatedData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: (res) => {
      toast.success("Post updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["myPosts"] });
      queryClient.invalidateQueries({ queryKey: ["post", res.data.slug] });
      queryClient.invalidateQueries({ queryKey: ["postById", id] });
      navigate(`/${res.data.slug}`);
    },
    onError: (err) => {
      const message =
        err.response?.data?.message ||
        err.response?.data ||
        "Failed to update post";
      toast.error(typeof message === "string" ? message : "Failed to update post");
    },
  });

  if (!isLoaded || isFetchingPost) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500 text-lg">Loading post details...</div>
      </div>
    );
  }

  if (isLoaded && !isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h2 className="text-2xl font-semibold text-gray-800">
          Sign In Required
        </h2>
        <p className="text-gray-600">You must be logged in to edit posts.</p>
        <Link
          to="/login"
          className="py-2.5 px-6 rounded-3xl bg-green-800 text-white font-medium"
        >
          Login 👋
        </Link>
      </div>
    );
  }

  if (fetchError || !post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h2 className="text-2xl font-semibold text-red-600">
          Post Not Found
        </h2>
        <p className="text-gray-600">The post you are trying to edit does not exist.</p>
        <Link
          to="/dashboard"
          className="py-2 px-5 rounded-xl bg-gray-800 text-white font-medium text-sm"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Verify ownership
  const isAuthor =
    post.user?.clerkUserId === user?.id ||
    user?.publicMetadata?.role === "admin";

  if (!isAuthor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h2 className="text-2xl font-semibold text-red-600">
          Unauthorized
        </h2>
        <p className="text-gray-600">You can edit only your own posts.</p>
        <Link
          to="/dashboard"
          className="py-2 px-5 rounded-xl bg-green-800 text-white font-medium text-sm"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a title for your post!");
      return;
    }

    if (!content.trim() || content.trim() === "<p><br></p>") {
      toast.error("Please provide some content for your post!");
      return;
    }

    const updatedData = {
      title: title.trim(),
      category,
      desc: desc.trim(),
      content,
      img: cover?.filePath || cover?.url || post.img || "",
    };

    updateMutation.mutate(updatedData);
  };

  return (
    <div className="h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Edit Post</h1>
          <p className="text-sm text-gray-500">Update your article content and settings</p>
        </div>
        <Link
          to="/dashboard"
          className="text-sm text-gray-600 hover:text-green-800 transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 flex-1 mb-6">
        {/* COVER IMAGE */}
        <div className="flex items-center gap-4">
          <Upload type="image" setProgress={setProgress} setData={setCover}>
            <button
              type="button"
              className="w-max p-2.5 shadow-sm border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              {cover ? "Change Cover Image 🖼️" : "Add Cover Image 🖼️"}
            </button>
          </Upload>
          {cover && (
            <span className="text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-md font-medium">
              Cover image set ✓
            </span>
          )}
        </div>

        {/* TITLE */}
        <input
          className="text-3xl md:text-4xl font-semibold bg-transparent outline-none border-b border-gray-200 pb-2 focus:border-green-800 transition-colors"
          type="text"
          placeholder="Post Title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        {/* CATEGORY */}
        <div className="flex items-center gap-4">
          <label htmlFor="category" className="text-sm font-medium text-gray-700">
            Choose a category:
          </label>
          <select
            name="category"
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="p-2 rounded-xl bg-white shadow-sm border border-gray-200 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-green-800"
          >
            <option value="general">General</option>
            <option value="web-design">Web Design</option>
            <option value="ai_ml">AI & ML</option>
            <option value="databases">Databases</option>
            <option value="seo">Search Engines</option>
            <option value="devops">DevOps</option>
          </select>
        </div>

        {/* SHORT DESCRIPTION */}
        <textarea
          className="p-4 rounded-xl bg-white shadow-sm border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-green-800"
          name="desc"
          placeholder="A short summary of your post..."
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
        />

        {/* QUILL EDITOR */}
        <div className="flex flex-1 min-h-[300px]">
          <div className="flex flex-col gap-2 mr-2">
            <Upload type="image" setProgress={setProgress} setData={setImg}>
              <span className="cursor-pointer text-xl p-1 rounded hover:bg-gray-100" title="Insert Image">
                🌆
              </span>
            </Upload>
            <Upload type="video" setProgress={setProgress} setData={setVideo}>
              <span className="cursor-pointer text-xl p-1 rounded hover:bg-gray-100" title="Insert Video">
                ▶️
              </span>
            </Upload>
          </div>
          <ReactQuill
            theme="snow"
            className="flex-1 rounded-xl bg-white shadow-sm"
            value={content}
            onChange={setContent}
            readOnly={0 < progress && progress < 100}
          />
        </div>

        {/* SUBMIT BUTTON */}
        <div className="flex items-center gap-4 mt-4">
          <button
            type="submit"
            disabled={updateMutation.isPending || (0 < progress && progress < 100)}
            className="bg-green-800 hover:bg-green-900 text-white font-medium rounded-xl p-2.5 w-40 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
          <Link
            to="/dashboard"
            className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default EditPost;

