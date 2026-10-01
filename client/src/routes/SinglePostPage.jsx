import { Link, useParams } from "react-router-dom";
import Image from "../components/Image";
import PostMenuActions from "../components/PostMenuActions";
import Search from "../components/Search";
import Comments from "../components/Comments";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { format } from "timeago.js";

const fetchPost = async (slug) => {
  const res = await axios.get(`${import.meta.env.VITE_API_URL}/posts/${slug}`);
  return res.data;
};

const SinglePostPage = () => {
  const { slug } = useParams();

  const { isPending, error, data } = useQuery({
    queryKey: ["post", slug],
    queryFn: () => fetchPost(slug),
  });

  if (isPending) return "loading...";
  if (error) return "Something went wrong!" + error.message;
  if (!data) return "Post not found!";

  return (
    <div className="flex flex-col gap-8">
      {/* detail */}
      <div className="flex gap-8">
        <div className="lg:w-3/5 flex flex-col gap-8">
          <h1 className="text-xl md:text-3xl xl:text-4xl 2xl:text-5xl font-semibold">
            {data.title}
          </h1>
          <div className="flex items-center gap-2 text-gray-400 text-sm flex-wrap">
            <span>Written by</span>
            <Link
              to={data.user?.username ? `/posts?author=${data.user.username}` : "#"}
              className="text-green-800 font-medium hover:underline"
            >
              {data.user?.username || "Author"}
            </Link>
            <span>on</span>
            <Link
              to={`/posts?cat=${data.category}`}
              className="text-green-800 font-medium hover:underline"
            >
              {data.category}
            </Link>
            <span>•</span>
            <span>{format(data.createdAt)}</span>
          </div>
          <p className="text-gray-500 font-medium">{data.desc}</p>
        </div>
        {data.img && (
          <div className="hidden lg:block w-2/5">
            <Image src={data.img} w="600" className="rounded-2xl" />
          </div>
        )}
      </div>
      {/* content */}
      <div className="flex flex-col md:flex-row gap-8 lg:gap-12 justify-between">
        {/* text */}
        <div className="w-full md:w-[75%] lg:text-lg">
          {data.content ? (
            <div
              className="post-content"
              dangerouslySetInnerHTML={{ __html: data.content }}
            />
          ) : (
            <p>No content available.</p>
          )}
        </div>
        {/* menu */}
        <div className="w-full md:w-[22%] px-2 md:px-0 h-max sticky top-8">
          <h1 className="mb-4 text-sm font-medium">Author</h1>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <img
                src={
                  data.user?.img
                    ? data.user.img.startsWith("http") || data.user.img.startsWith("/")
                      ? data.user.img
                      : `${import.meta.env.VITE_IK_URL_ENDPOINT}/${data.user.img}`
                    : "/userImg.jpeg"
                }
                alt={data.user?.username || "Author"}
                className="w-12 h-12 rounded-full object-cover shrink-0 shadow-sm border border-gray-100"
                onError={(e) => {
                  e.currentTarget.src = "/userImg.jpeg";
                }}
              />
              <Link
                to={`/posts?author=${data.user?.username}`}
                className="text-green-800 font-semibold hover:underline"
              >
                {data.user?.username || "Author"}
              </Link>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              {data.user?.about ||
                "Passionate writer sharing insights, practical guides, and thoughtful perspectives on technology and design."}
            </p>          
          </div>
          <PostMenuActions post={data}/>
          <h1 className="mt-8 mb-4 text-sm font-medium">Categories</h1>
          <div className="flex flex-col gap-2 text-sm">
            <Link className="underline" to="/posts">All</Link>
            <Link className="underline" to="/posts?cat=web-design">
              Web Design
            </Link>
            <Link className="underline" to="/posts?cat=ai_ml">
              AI & ML
            </Link>
            <Link className="underline" to="/posts?cat=databases">
              Databases
            </Link>
            <Link className="underline" to="/posts?cat=seo">
              Search Engines
            </Link>
            <Link className="underline" to="/posts?cat=devops">
              DevOps
            </Link>
          </div>
          <h1 className="mt-8 mb-4 text-sm font-medium">Search</h1>
          <Search />
        </div>
      </div>
      <Comments postId={data._id} post={data} />
    </div>
  );
};

export default SinglePostPage;
