import { Link, useSearchParams } from "react-router-dom";
import MainCategories from "../components/MainCategories";
import FeaturedPosts from "../components/FeaturedPosts";
import PostList from "../components/PostList";

const Homepage = () => {
  const [searchParams] = useSearchParams();
  const currentCat = searchParams.get("cat");
  const isAllPosts = !currentCat || currentCat === "all" || currentCat === "general";

  return (
    <div className="mt-4 flex flex-col">
      {/* BANNER / HERO */}
      <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden border-y border-[#2f4b3a]/15 dark:border-[#35443A] bg-[#d9e6df] dark:bg-[#111713] shadow-sm">
        {/* Light Mode Banner */}
        <img
          src="/light-mode.jpeg"
          alt="Veles Light Banner"
          className="absolute inset-0 h-full w-full object-cover dark:hidden"
        />
        {/* Dark Mode Banner */}
        <img
          src="/dark-mode.jpeg"
          alt="Veles Dark Banner"
          className="absolute inset-0 h-full w-full object-cover hidden dark:block"
        />

        <div className="relative flex min-h-[360px] flex-col px-4 py-7 md:px-8 md:py-9 lg:px-16 2xl:px-64">
          {/* BREADCRUMB */}
          <div className="flex gap-4 text-[#2f4b3a] dark:text-[#A5B0A7]">
            <Link to="/" className="hover:underline">Home</Link>
            <span>•</span>
            <span className="text-green-800 dark:text-[#7BC98C] font-semibold">Blogs and Articles</span>
          </div>

          {/* INTRODUCTION */}
          <div className="flex flex-1 flex-col justify-center gap-8 lg:flex-row lg:items-center lg:justify-between">
            {/* titles */}
            <div className="max-w-4xl">
              <h1 className="text-gray-800 dark:text-[#E5E9E4] text-2xl md:text-5xl lg:text-6xl font-bold font-[Philosopher]">
                Where knowledge takes root and Ideas flourish.
              </h1>
              <p className="mt-8 text-md md:text-xl font-['Della_Respira'] text-gray-800 dark:text-[#D1D5DB] leading-relaxed">
                Discover insights, explore technologies, and grow with a community of curious minds.
                Dive into our collection of articles and blogs, where every post is a step towards knowledge and innovation.
              </p>
              <div className="md:hidden mt-6">
                <Link
                  to="/write"
                  className="inline-flex items-center gap-2 bg-[#2f4b3a] dark:bg-[#25382B] dark:border dark:border-[#35443A] text-white px-5 py-2.5 rounded-full font-medium text-sm shadow-md"
                >
                  <span>Write your story</span>
                  <span>✍️</span>
                </Link>
              </div>
            </div>

            <Link
              to="/write"
              className="hidden md:block relative shrink-0 self-center lg:self-auto group"
            >
              <svg
                viewBox="0 0 200 200"
                xmlns="http://www.w3.org/2000/svg"
                width="200"
                height="200"
                className="block"
              >
                {/* Outer circular text background */}
                <path
                  id="circlePath"
                  fill="none"
                  strokeWidth="50"
                  className="stroke-[#bfbeba] dark:stroke-[#1B241E]/80 transition-colors"
                  d="M 100,100
                     m -75,0
                     a 75,75 0 1,1 150,0
                     a 75,75 0 1,1 -150,0"
                />

                {/* Outer border */}
                <circle
                  cx="100"
                  cy="100"
                  r="92"
                  fill="none"
                  strokeWidth="2"
                  className="stroke-[#6f6d6b] dark:stroke-[#35443A] transition-colors"
                />

                {/* Inner border */}
                <circle
                  cx="100"
                  cy="100"
                  r="58"
                  fill="none"
                  strokeWidth="2"
                  className="stroke-[#6f6d6b] dark:stroke-[#35443A] transition-colors"
                />

                {/* Rotating text */}
                <g className="origin-center animate-[spin_30s_linear_infinite]">
                  <text
                    fontSize="14"
                    fontWeight="600"
                    letterSpacing="1"
                    className="fill-[#2f4b3a] dark:fill-[#E5E9E4] transition-colors"
                  >
                    <textPath href="#circlePath" startOffset="0%">
                      • Share Your Knowledge •
                    </textPath>

                    <textPath href="#circlePath" startOffset="50%">
                      • Let Ideas Compile •
                    </textPath>
                  </text>
                </g>
              </svg>

              {/* Center button */}
              <button
                className="
                  absolute
                  top-0
                  left-0
                  right-0
                  bottom-0
                  m-auto
                  w-20
                  h-20
                  bg-[#2f4b3a]
                  dark:bg-[#25382B]
                  dark:border
                  dark:border-[#7BC98C]/40
                  rounded-full
                  flex
                  items-center
                  justify-center
                  transition-all
                  duration-300
                  group-hover:scale-105
                  group-hover:bg-[#3a5b47]
                  dark:group-hover:bg-[#2e4736]
                "
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="50"
                  height="50"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                >
                  <path d="M13 5H19V11" />
                  <path d="M19 5L5 19" />
                </svg>
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <div className="relative z-10 -mt-7 w-full">
        <MainCategories />
      </div>

      {/* FEATURED POSTS */}
      {isAllPosts && <FeaturedPosts />}

      {/* POST LIST */}
      <div className="">
        <h1 className="my-8 text-2xl font-bold text-gray-800 dark:text-[#E5E9E4]">Recent Posts</h1>
        <PostList />
      </div>
    </div>
  );
};

export default Homepage;
