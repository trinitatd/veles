import { useAuth, useUser } from "@clerk/clerk-react";
import "react-quill-new/dist/quill.snow.css";
import ReactQuill from "react-quill-new";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Upload from "../components/Upload";

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
      return axios.post(`${import.meta.env.VITE_API_URL}/posts`, newPost, {
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
    return <div className="">Loading...</div>;
  }

  if (isLoaded && !isSignedIn) {
    return <div className="">You should login!</div>;
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
    <div className="h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] flex flex-col gap-6">
      <h1 className="text-cl font-light">Create a New Post</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 flex-1 mb-6">
        <Upload type="image" setProgress={setProgress} setData={setCover}>
          <button
            type="button"
            className="w-max p-2 shadow-md rounded-xl text-sm text-gray-500 bg-white"
          >
            {cover ? "Cover image selected ✓" : "Add a cover image"}
          </button>
        </Upload>
        <input
          className="text-4xl font-semibold bg-transparent outline-none"
          type="text"
          placeholder="Article Title"
          name="title"
          required
        />
        <div className="flex items-center gap-4">
          <label htmlFor="" className="text-sm">
            Choose a category:
          </label>
          <select
            name="category"
            id=""
            className="p-2 rounded-xl bg-white shadow-md"
          >
            <option value="general">General</option>
            <option value="web-design">Web Design</option>
            <option value="ai_ml">AI & ML</option>
            <option value="databases">Databases</option>
            <option value="seo">Search Engines</option>
            <option value="devops">DevOps</option>
          </select>
        </div>
        <textarea
          className="p-4 rounded-xl bg-white shadow-md"
          name="desc"
          placeholder="A Short Description"
        />
        <div className="flex flex-1 ">
          <div className="flex flex-col gap-2 mr-2" onMouseDown={saveSelection}>
            <Upload type="image" setProgress={setProgress} setData={setImg} onClick={saveSelection}>
              🌆
            </Upload>
            <Upload type="video" setProgress={setProgress} setData={setVideo} onClick={saveSelection}>
              ▶️
            </Upload>
          </div>
          <ReactQuill
            ref={quillRef}
            theme="snow"
            className="flex-1 rounded-xl bg-white shadow-md"
            value={value}
            onChange={setValue}
            onChangeSelection={handleSelectionChange}
            readOnly={0 < progress && progress < 100}
          />
        </div>
        <button
          disabled={mutation.isPending || (0 < progress && progress < 100)}
          className="bg-green-800 text-white font-medium rounded-xl mt-4 p-2 w-36 disabled:bg-green-400 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? "Loading..." : "Send"}
        </button>
        {"Progress:" + progress}
        {/* {mutation.isError && <span>{mutation.error.message}</span>} */}
      </form>
    </div>
  );
};

export default Write;
