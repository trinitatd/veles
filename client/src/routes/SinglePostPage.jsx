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

  if (isPending) return <div className="py-20 text-center text-sm text-gray-500 dark:text-[#A5B0A7]">Loading article...</div>;
  if (error) return <div className="py-20 text-center text-sm text-red-500">Something went wrong! {error.message}</div>;
  if (!data) return <div className="py-20 text-center text-sm text-gray-500 dark:text-[#A5B0A7]">Post not found!</div>;

  return (
    <div className="flex flex-col gap-8 my-4">
      {/* detail */}
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="lg:w-3/5 flex flex-col gap-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl xl:text-5xl font-bold text-gray-900 dark:text-[#E5E9E4] tracking-tight">
            {data.title}
          </h1>
          <div className="flex items-center gap-2 text-gray-500 dark:text-[#A5B0A7] text-xs sm:text-sm flex-wrap">
            <span>Written by</span>
            <Link
              to={data.user?.username ? `/author/${data.user.username}` : "#"}
              className="text-green-800 dark:text-[#7BC98C] font-semibold hover:underline"
            >
              @{data.user?.username || "Author"}
            </Link>
            <span>on</span>
            <Link
              to={`/posts?cat=${data.category}`}
              className="text-green-800 dark:text-[#7BC98C] font-semibold hover:underline capitalize"
            >
              {data.category || "General"}
            </Link>
            <span>•</span>
            <span>{format(data.createdAt)}</span>
          </div>
          <p className="text-gray-600 dark:text-[#A5B0A7] text-base leading-relaxed font-medium">{data.desc}</p>
        </div>
        {data.img && (
          <div className="hidden lg:block w-2/5">
            <Image src={data.img} w="600" className="rounded-2xl object-cover w-full max-h-96 shadow-md" />
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
            <p className="text-gray-500 dark:text-[#A5B0A7]">No content available.</p>
          )}
        </div>

        {/* menu */}
        <div className="w-full md:w-[22%] px-2 md:px-0 h-max sticky top-8 flex flex-col gap-6">
          <div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-[#A5B0A7]">Author</h2>
            <div className="flex flex-col gap-3 p-4 rounded-2xl bg-white/60 dark:bg-[#1B241E] border border-gray-100 dark:border-[#35443A] shadow-sm">
              <div className="flex items-center gap-3">
                <Link to={data.user?.username ? `/author/${data.user.username}` : "#"} className="shrink-0 group">
                  <img
                    src={
                      data.user?.img
                        ? data.user.img.startsWith("http") || data.user.img.startsWith("/")
                          ? data.user.img
                          : `${import.meta.env.VITE_IK_URL_ENDPOINT}/${data.user.img}`
                        : "/userImg.jpeg"
                    }
                    alt={data.user?.username || "Author"}
                    className="w-12 h-12 rounded-full object-cover shrink-0 shadow-sm border border-gray-100 dark:border-[#35443A] group-hover:ring-2 group-hover:ring-green-800/40 dark:group-hover:ring-[#7BC98C]/40 transition-all"
                    onError={(e) => {
                      e.currentTarget.src = "/userImg.jpeg";
                    }}
                  />
                </Link>
                <Link
                  to={data.user?.username ? `/author/${data.user.username}` : "#"}
                  className="text-green-800 dark:text-[#7BC98C] font-bold text-sm hover:underline"
                >
                  @{data.user?.username || "Author"}
                </Link>
              </div>
              <p className="text-xs text-gray-600 dark:text-[#A5B0A7] leading-relaxed">
                {data.user?.about ||
                  "Passionate writer sharing insights, practical guides, and thoughtful perspectives on technology and design."}
              </p>
            </div>
          </div>

          <PostMenuActions post={data} />

          <div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-[#A5B0A7]">Categories</h2>
            <div className="flex flex-col gap-2 text-sm">
              <Link className="text-gray-700 dark:text-[#A5B0A7] hover:text-green-800 dark:hover:text-[#7BC98C] hover:underline transition-colors" to="/posts">All Posts</Link>
              <Link className="text-gray-700 dark:text-[#A5B0A7] hover:text-green-800 dark:hover:text-[#7BC98C] hover:underline transition-colors" to="/posts?cat=web-design">
                Web Design
              </Link>
              <Link className="text-gray-700 dark:text-[#A5B0A7] hover:text-green-800 dark:hover:text-[#7BC98C] hover:underline transition-colors" to="/posts?cat=ai_ml">
                AI & ML
              </Link>
              <Link className="text-gray-700 dark:text-[#A5B0A7] hover:text-green-800 dark:hover:text-[#7BC98C] hover:underline transition-colors" to="/posts?cat=databases">
                Databases
              </Link>
              <Link className="text-gray-700 dark:text-[#A5B0A7] hover:text-green-800 dark:hover:text-[#7BC98C] hover:underline transition-colors" to="/posts?cat=seo">
                Search Engines
              </Link>
              <Link className="text-gray-700 dark:text-[#A5B0A7] hover:text-green-800 dark:hover:text-[#7BC98C] hover:underline transition-colors" to="/posts?cat=devops">
                DevOps
              </Link>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-[#A5B0A7]">Search</h2>
            <Search />
          </div>
        </div>
      </div>

      <Comments postId={data._id} post={data} />
    </div>
  );
};

export default SinglePostPage;
