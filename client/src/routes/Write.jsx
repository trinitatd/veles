import { useAuth, useUser } from "@clerk/clerk-react";
import "react-quill-new/dist/quill.snow.css";
import ReactQuill from "react-quill-new";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import Upload from "../components/Upload";
import { buildApiUrl } from "../utils/api";

const Write = () => {
  const { isLoaded, isSignedIn } = useUser();
  const [value, setValue] = useState("");
  const [cover, setCover] = useState("");
  const [img, setImg] = useState("");
  const [video, setVideo] = useState("");
  const [progress, setProgress] = useState(0);

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
    setValue(editor.root.innerHTML);
    editor.focus();
  };

  useEffect(() => {
    if (img && img.url) {
      insertEmbed("image", img.url);
      setImg("");
    }
  }, [img]);

  useEffect(() => {
    if (video && video.url) {
      insertEmbed("video", video.url);
      setVideo("");
    }
  }, [video]);

  const navigate = useNavigate();

  const { getToken } = useAuth();

  const mutation = useMutation({
    mutationFn: async (newPost) => {
      const token = await getToken();
      return axios.post(buildApiUrl("/posts"), newPost, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    },
    onSuccess: (res) => {
      toast.success("Post has been created");
      navigate(`/${res.data.slug}`);
    },
    onError: (err) => {
      const message =
        err.response?.data?.message ||
        err.response?.data ||
        err.message ||
        "Failed to create post!";
      toast.error(
        typeof message === "string" ? message : "Failed to create post!"
      );
    },
  });

  if (!isLoaded) {
    return <div className="py-12 text-center text-sm text-gray-500 dark:text-[#A5B0A7]">Loading editor...</div>;
  }

  if (isLoaded && !isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-[#E5E9E4]">Please sign in to write an article</h2>
        <Link
          to="/login"
          className="py-2.5 px-6 rounded-3xl bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-white font-medium transition-colors"
        >
          Login
        </Link>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const title = formData.get("title")?.trim();
    if (!title) {
      toast.error("Please enter a title for your post!");
      return;
    }

    if (!value || value.trim() === "<p><br></p>" || !value.trim()) {
      toast.error("Please add some content to your post!");
      return;
    }

    const data = {
      img: cover.filePath || "",
      title,
      category: formData.get("category"),
      desc: formData.get("desc"),
      content: value,
    };

    mutation.mutate(data);
  };

  return (
    <div className="h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] flex flex-col gap-6 text-gray-800 dark:text-[#E5E9E4]">
      <h1 className="text-xl font-light text-gray-800 dark:text-[#E5E9E4]">Create a New Post</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 flex-1 mb-6">
        <Upload type="image" setProgress={setProgress} setData={setCover}>
          <button
            type="button"
            className="w-max p-2.5 shadow-md rounded-xl text-sm font-medium text-gray-700 dark:text-[#E5E9E4] bg-white dark:bg-[#1B241E] border border-transparent dark:border-[#35443A] hover:bg-gray-50 dark:hover:bg-[#222D25] transition-colors"
          >
            {cover ? "Cover image selected ✓" : "Add a cover image"}
          </button>
        </Upload>
        <input
          className="text-4xl font-semibold bg-transparent outline-none text-gray-900 dark:text-[#E5E9E4] placeholder-gray-400 dark:placeholder-[#A5B0A7] border-b border-transparent focus:border-green-800 dark:focus:border-[#7BC98C] pb-2 transition-colors"
          type="text"
          placeholder="Article Title"
          name="title"
          required
        />
        <div className="flex items-center gap-4">
          <label htmlFor="" className="text-sm font-medium text-gray-700 dark:text-[#E5E9E4]">
            Choose a category:
          </label>
          <select
            name="category"
            id=""
            className="p-2.5 rounded-xl bg-white dark:bg-[#1B241E] text-gray-800 dark:text-[#E5E9E4] border border-transparent dark:border-[#35443A] shadow-md focus:outline-none focus:ring-1 focus:ring-green-800 dark:focus:ring-[#7BC98C]"
          >
            <option value="general" className="dark:bg-[#1B241E]">General</option>
            <option value="web-design" className="dark:bg-[#1B241E]">Web Design</option>
            <option value="ai_ml" className="dark:bg-[#1B241E]">AI & ML</option>
            <option value="databases" className="dark:bg-[#1B241E]">Databases</option>
            <option value="seo" className="dark:bg-[#1B241E]">Search Engines</option>
            <option value="devops" className="dark:bg-[#1B241E]">DevOps</option>
          </select>
        </div>
        <textarea
          className="p-4 rounded-xl bg-white dark:bg-[#1B241E] text-gray-800 dark:text-[#E5E9E4] border border-transparent dark:border-[#35443A] placeholder-gray-400 dark:placeholder-[#A5B0A7] shadow-md focus:outline-none focus:ring-1 focus:ring-green-800 dark:focus:ring-[#7BC98C]"
          name="desc"
          placeholder="A Short Description"
        />
        <div className="flex flex-1 ">
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
            className="flex-1 rounded-xl bg-white dark:bg-[#1B241E] border border-transparent dark:border-[#35443A] shadow-md"
            value={value}
            onChange={setValue}
            onChangeSelection={handleSelectionChange}
            readOnly={0 < progress && progress < 100}
          />
        </div>
        <button
          disabled={mutation.isPending || (0 < progress && progress < 100)}
          className="bg-green-800 hover:bg-green-900 dark:bg-[#25382B] dark:hover:bg-[#2e4535] text-white dark:text-[#E5E9E4] font-medium rounded-xl mt-4 p-2.5 w-36 disabled:bg-green-400 dark:disabled:bg-green-950 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {mutation.isPending ? "Loading..." : "Send"}
        </button>
        <span className="text-xs text-gray-500 dark:text-[#A5B0A7]">{"Progress: " + progress + "%"}</span>
        {/* {mutation.isError && <span>{mutation.error.message}</span>} */}
      </form>
    </div>
  );
};

export default Write;
