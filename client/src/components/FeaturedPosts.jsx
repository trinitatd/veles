import { Link } from "react-router-dom";
import Image from "./Image";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { format } from "timeago.js";
import { buildApiUrl } from "../utils/api";

const fetchPost = async () => {
  const res = await axios.get(
    buildApiUrl("/posts?featured=true&limit=4&sort=newest")
  );
  return res.data;
};

const FeaturedPosts = () => {
  const { isPending, error, data } = useQuery({
    queryKey: ["featuredPosts"],
    queryFn: () => fetchPost(),
  });

  if (isPending) return <div className="py-8 text-sm text-gray-500 dark:text-[#A5B0A7]">Loading featured articles...</div>;
  if (error) return <div className="py-8 text-sm text-red-500">Something went wrong! {error.message}</div>;

  const posts = data?.posts;
  if (!posts || posts.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 flex flex-col lg:flex-row gap-8">
      {/* First */}
      <div className="w-full lg:w-1/2 flex flex-col gap-4">
        {/* image */}
        {posts[0].img && (
          <Image
            src={posts[0].img}
            className="rounded-3xl object-cover"
            w="895"
          />
        )}
        {/* details */}
        <div className="flex items-center gap-4">
          <h1 className="font-semibold lg:text-lg text-gray-800 dark:text-[#E5E9E4]">01.</h1>
          <Link
            to={`/posts?cat=${posts[0].category}`}
            className="text-green-800 dark:text-[#7BC98C] font-semibold lg:text-lg hover:underline"
          >
            {posts[0].category}
          </Link>
          <span className="text-gray-500 dark:text-[#A5B0A7] text-sm">{format(posts[0].createdAt)}</span>
        </div>
        {/* title */}
        <Link
          to={`/${posts[0].slug}`}
          className="text-xl lg:text-3xl font-semibold lg:font-bold text-gray-900 dark:text-[#E5E9E4] hover:text-green-800 dark:hover:text-[#7BC98C] transition-colors"
        >
          {posts[0].title}
        </Link>
      </div>

      {/* Others */}
      <div className="w-full lg:w-1/2 flex flex-col gap-4">
        {/* second */}
        {posts[1] && (
          <div className="lg:h-1/3 flex justify-between gap-4">
            {posts[1].img && (
              <div className="w-1/3 aspect-video">
                <Image
                  src={posts[1].img}
                  className="rounded-3xl object-cover w-full h-full"
                  w="298"
                />
              </div>
            )}
            {/* details and title */}
            <div className="w-2/3">
              {/* details */}
              <div className="flex items-center gap-4 text-sm lg:text-base mb-2">
                <h1 className="font-semibold text-gray-800 dark:text-[#E5E9E4]">02.</h1>
                <Link
                  to={`/posts?cat=${posts[1].category}`}
                  className="text-green-800 dark:text-[#7BC98C] font-semibold hover:underline"
                >
                  {posts[1].category}
                </Link>
                <span className="text-gray-500 dark:text-[#A5B0A7] text-xs sm:text-sm">{format(posts[1].createdAt)}</span>
              </div>
              {/* title */}
              <Link
                to={`/${posts[1].slug}`}
                className="text-base sm:text-lg md:text-2xl lg:text-xl xl:text-2xl font-medium text-gray-900 dark:text-[#E5E9E4] hover:text-green-800 dark:hover:text-[#7BC98C] transition-colors line-clamp-2"
              >
                {posts[1].title}
              </Link>
            </div>
          </div>
        )}

        {/* third */}
        {posts[2] && (
          <div className="lg:h-1/3 flex justify-between gap-4">
            {posts[2].img && (
              <div className="w-1/3 aspect-video">
                <Image
                  src={posts[2].img}
                  className="rounded-3xl object-cover w-full h-full"
                  w="298"
                />
              </div>
            )}
            {/* details and title */}
            <div className="w-2/3">
              {/* details */}
              <div className="flex items-center gap-4 text-sm lg:text-base mb-2">
                <h1 className="font-semibold text-gray-800 dark:text-[#E5E9E4]">03.</h1>
                <Link
                  to={`/posts?cat=${posts[2].category}`}
                  className="text-green-800 dark:text-[#7BC98C] font-semibold hover:underline"
                >
                  {posts[2].category}
                </Link>
                <span className="text-gray-500 dark:text-[#A5B0A7] text-xs sm:text-sm">{format(posts[2].createdAt)}</span>
              </div>
              {/* title */}
              <Link
                to={`/${posts[2].slug}`}
                className="text-base sm:text-lg md:text-2xl lg:text-xl xl:text-2xl font-medium text-gray-900 dark:text-[#E5E9E4] hover:text-green-800 dark:hover:text-[#7BC98C] transition-colors line-clamp-2"
              >
                {posts[2].title}
              </Link>
            </div>
          </div>
        )}

        {/* fourth */}
        {posts[3] && (
          <div className="lg:h-1/3 flex justify-between gap-4">
            {posts[3].img && (
              <div className="w-1/3 aspect-video">
                <Image
                  src={posts[3].img}
                  className="rounded-3xl object-cover w-full h-full"
                  w="298"
                />
              </div>
            )}
            {/* details and title */}
            <div className="w-2/3">
              {/* details */}
              <div className="flex items-center gap-4 text-sm lg:text-base mb-2">
                <h1 className="font-semibold text-gray-800 dark:text-[#E5E9E4]">04.</h1>
                <Link
                  to={`/posts?cat=${posts[3].category}`}
                  className="text-green-800 dark:text-[#7BC98C] font-semibold hover:underline"
                >
                  {posts[3].category}
                </Link>
                <span className="text-gray-500 dark:text-[#A5B0A7] text-xs sm:text-sm">{format(posts[3].createdAt)}</span>
              </div>
              {/* title */}
              <Link
                to={`/${posts[3].slug}`}
                className="text-base sm:text-lg md:text-2xl lg:text-xl xl:text-2xl font-medium text-gray-900 dark:text-[#E5E9E4] hover:text-green-800 dark:hover:text-[#7BC98C] transition-colors line-clamp-2"
              >
                {posts[3].title}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeaturedPosts;
