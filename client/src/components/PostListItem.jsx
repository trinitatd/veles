import { Link } from "react-router-dom";
import Image from "./Image";
import { format } from "timeago.js";

const PostListItem = ({ post }) => {
  return (
    <div className="flex flex-col xl:flex-row gap-8 mb-12 border border-[#176B3A]/60 dark:border-[#35443A] bg-white/40 dark:bg-[#1B241E] rounded-2xl p-5 md:p-6 overflow-hidden transition-all duration-300 ease-in-out hover:border-[#0f4424] dark:hover:border-[#7BC98C] hover:shadow-md">
      {/* image */}
      {post.img && (
        <div className="md:hidden xl:block xl:w-1/3 shrink-0">
          <Image src={post.img} className="rounded-2xl object-cover w-full h-full max-h-64" w="735" />
        </div>
      )}
      {/* details */}
      <div className="flex flex-col gap-4 xl:w-2/3 justify-between">
        <div className="flex flex-col gap-3">
          <Link
            to={`/${post.slug}`}
            className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-900 dark:text-[#E5E9E4] hover:text-green-800 dark:hover:text-[#7BC98C] transition-colors"
          >
            {post.title}
          </Link>
          <div className="flex items-center gap-2 text-gray-500 dark:text-[#A5B0A7] text-xs sm:text-sm flex-wrap">
            <span>Written by</span>
            <Link
              className="text-green-800 dark:text-[#7BC98C] font-semibold hover:underline"
              to={post.user?.username ? `/author/${post.user.username}` : "#"}
            >
              @{post.user?.username || "Anonymous"}
            </Link>
            <span>on</span>
            <Link
              to={`/posts?cat=${post.category}`}
              className="text-green-800 dark:text-[#7BC98C] font-semibold hover:underline capitalize"
            >
              {post.category || "General"}
            </Link>
            <span>•</span>
            <span>{format(post.createdAt)}</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-red-500 font-medium">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="14px"
                height="14px"
                fill="currentColor"
              >
                <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              <span>{post.likes?.length || 0}</span>
            </span>
          </div>
          <p className="text-gray-700 dark:text-[#A5B0A7] text-sm sm:text-base line-clamp-3 leading-relaxed">
            {post.desc}
          </p>
        </div>
        <Link
          to={`/${post.slug}`}
          className="underline text-green-800 dark:text-[#7BC98C] hover:text-green-900 dark:hover:text-[#9fe2ad] text-sm font-semibold transition-colors"
        >
          Read More →
        </Link>
      </div>
    </div>
  );
};

export default PostListItem;
