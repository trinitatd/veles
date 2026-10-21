import { useAuth, useUser } from "@clerk/clerk-react";
import "react-quill-new/dist/quill.snow.css";
import ReactQuill from "react-quill-new";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import Upload from "../components/Upload";
import { buildApiUrl } from "../utils/api";

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
        buildApiUrl(`/posts/by-id/${id}`)
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

  const quillRef = useRef(null);
  const lastRangeRef = useRef(null);

  const saveSelection = () => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      const range = editor.getSelection();
      if (range) {
        lastRangeRef.current = range;
      }
    }
  };

  const handleSelectionChange = (range) => {
    if (range) {
      lastRangeRef.current = range;
    }
  };

  const insertEmbed = (type, url) => {
    const editor = quillRef.current?.getEditor();
    if (!editor || !url) return;

    editor.enable(true);
    const range = lastRangeRef.current || editor.getSelection();
    const index = range ? range.index : Math.max(0, editor.getLength() - 1);

    if (range && range.length > 0) {
      editor.deleteText(range.index, range.length, "user");
    }

    editor.insertEmbed(index, type, url, "user");
    editor.setSelection(index + 1, "user");
    lastRangeRef.current = { index: index + 1, length: 0 };
    setContent(editor.root.innerHTML);
    editor.focus();
  };

  // Insert embedded image into editor at cursor position
  useEffect(() => {
    if (img && img.url) {
      insertEmbed("image", img.url);
      setImg("");
    }
  }, [img]);

  // Insert embedded video into editor at cursor position
  useEffect(() => {
    if (video && video.url) {
      insertEmbed("video", video.url);
      setVideo("");
    }
  }, [video]);

  const updateMutation = useMutation({
    mutationFn: async (updatedData) => {
      const token = await getToken();
      return axios.patch(
        buildApiUrl(`/posts/${id}`),
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
        <div className="text-gray-500 dark:text-[#A5B0A7] text-lg">Loading post details...</div>
      </div>
    );
  }

  if (isLoaded && !isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-[#E5E9E4]">
          Sign In Required
        </h2>
        <p className="text-gray-600 dark:text-[#A5B0A7]">You must be logged in to edit posts.</p>
        <Link
          to="/login"
          className="py-2.5 px-6 rounded-3xl bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-white font-medium transition-colors"
        >
          Login 👋
        </Link>
      </div>
    );
  }

  if (fetchError || !post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h2 className="text-2xl font-semibold text-red-600 dark:text-red-400">
          Post Not Found
        </h2>
        <p className="text-gray-600 dark:text-[#A5B0A7]">The post you are trying to edit does not exist.</p>
        <Link
          to="/dashboard"
          className="py-2 px-5 rounded-xl bg-gray-800 hover:bg-gray-700 dark:bg-[#222D25] dark:hover:bg-[#2e3f34] text-white font-medium text-sm transition-colors"
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
        <h2 className="text-2xl font-semibold text-red-600 dark:text-red-400">
          Unauthorized
        </h2>
        <p className="text-gray-600 dark:text-[#A5B0A7]">You can edit only your own posts.</p>
        <Link
          to="/dashboard"
          className="py-2 px-5 rounded-xl bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-white font-medium text-sm transition-colors"
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
    <div className="h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] flex flex-col gap-6 max-w-5xl mx-auto w-full text-gray-800 dark:text-[#E5E9E4]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-[#E5E9E4]">Edit Post</h1>
          <p className="text-sm text-gray-500 dark:text-[#A5B0A7]">Update your article content and settings</p>
        </div>
        <Link
          to="/dashboard"
          className="text-sm text-gray-600 dark:text-[#A5B0A7] hover:text-green-800 dark:hover:text-[#7BC98C] transition-colors"
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
              className="w-max p-2.5 shadow-sm border border-gray-200 dark:border-[#35443A] rounded-xl text-sm font-medium text-gray-700 dark:text-[#E5E9E4] bg-white dark:bg-[#1B241E] hover:bg-gray-50 dark:hover:bg-[#222D25] transition-colors"
            >
              {cover ? "Change Cover Image 🖼️" : "Add Cover Image 🖼️"}
            </button>
          </Upload>
          {cover && (
            <span className="text-xs text-green-700 dark:text-[#7BC98C] bg-green-50 dark:bg-[#222D25] border border-green-200/50 dark:border-[#35443A] px-2.5 py-1 rounded-md font-medium">
              Cover image set ✓
            </span>
          )}
        </div>

        {/* TITLE */}
        <input
          className="text-3xl md:text-4xl font-semibold bg-transparent outline-none border-b border-gray-200 dark:border-[#35443A] pb-2 text-gray-900 dark:text-[#E5E9E4] placeholder-gray-400 dark:placeholder-[#A5B0A7] focus:border-green-800 dark:focus:border-[#7BC98C] transition-colors"
          type="text"
          placeholder="Post Title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        {/* CATEGORY */}
        <div className="flex items-center gap-4">
          <label htmlFor="category" className="text-sm font-medium text-gray-700 dark:text-[#E5E9E4]">
            Choose a category:
          </label>
          <select
            name="category"
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="p-2 rounded-xl bg-white dark:bg-[#1B241E] shadow-sm border border-gray-200 dark:border-[#35443A] text-gray-800 dark:text-[#E5E9E4] text-sm font-medium focus:outline-none focus:ring-1 focus:ring-green-800 dark:focus:ring-[#7BC98C]"
          >
            <option value="general" className="dark:bg-[#1B241E]">General</option>
            <option value="web-design" className="dark:bg-[#1B241E]">Web Design</option>
            <option value="ai_ml" className="dark:bg-[#1B241E]">AI & ML</option>
            <option value="databases" className="dark:bg-[#1B241E]">Databases</option>
            <option value="seo" className="dark:bg-[#1B241E]">Search Engines</option>
            <option value="devops" className="dark:bg-[#1B241E]">DevOps</option>
          </select>
        </div>

        {/* SHORT DESCRIPTION */}
        <textarea
          className="p-4 rounded-xl bg-white dark:bg-[#1B241E] shadow-sm border border-gray-200 dark:border-[#35443A] text-gray-800 dark:text-[#E5E9E4] placeholder-gray-400 dark:placeholder-[#A5B0A7] text-sm focus:outline-none focus:ring-1 focus:ring-green-800 dark:focus:ring-[#7BC98C]"
          name="desc"
          placeholder="A short summary of your post..."
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
        />

        {/* QUILL EDITOR */}
        <div className="flex flex-1 min-h-[300px]">
          <div className="flex flex-col gap-2 mr-2" onMouseDown={saveSelection}>
            <Upload type="image" setProgress={setProgress} setData={setImg} onClick={saveSelection}>
              <span className="cursor-pointer text-xl p-1 rounded hover:bg-gray-100 dark:hover:bg-[#222D25] block transition-colors" title="Insert Image">
                🌆
              </span>
            </Upload>
            <Upload type="video" setProgress={setProgress} setData={setVideo} onClick={saveSelection}>
              <span className="cursor-pointer text-xl p-1 rounded hover:bg-gray-100 dark:hover:bg-[#222D25] block transition-colors" title="Insert Video">
                ▶️
              </span>
            </Upload>
          </div>
          <ReactQuill
            ref={quillRef}
            theme="snow"
            className="flex-1 rounded-xl bg-white dark:bg-[#1B241E] border border-transparent dark:border-[#35443A] shadow-sm"
            value={content}
            onChange={setContent}
            onChangeSelection={handleSelectionChange}
            readOnly={0 < progress && progress < 100}
          />
        </div>

        {/* SUBMIT BUTTON */}
        <div className="flex items-center gap-4 mt-4">
          <button
            type="submit"
            disabled={updateMutation.isPending || (0 < progress && progress < 100)}
            className="bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-white dark:text-[#E5E9E4] font-medium rounded-xl p-2.5 w-40 disabled:bg-green-400 dark:disabled:bg-green-950 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
          <Link
            to="/dashboard"
            className="text-sm font-medium text-gray-500 dark:text-[#A5B0A7] hover:text-gray-800 dark:hover:text-[#E5E9E4] transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default EditPost;

