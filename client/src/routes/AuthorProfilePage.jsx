import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { format } from "timeago.js";
import { useState } from "react";
import { toast } from "react-toastify";
import { useUser } from "@clerk/clerk-react";
import Image from "../components/Image";

const fetchAuthorProfile = async (username) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/users/by-username/${encodeURIComponent(username)}`
  );
  return res.data;
};

const fetchAuthorPosts = async (username) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/posts/author/${encodeURIComponent(username)}`
  );
  return res.data;
};

const fetchAuthorChannels = async (username) => {
  const res = await axios.get(
    `${import.meta.env.VITE_API_URL}/channels/author/${encodeURIComponent(username)}`
  );
  return res.data;
};

const AuthorProfilePage = () => {
  const { username } = useParams();
  const { user: currentUser } = useUser();
  const [copied, setCopied] = useState(false);
  const [channelFilter, setChannelFilter] = useState("all"); // "all" | "created" | "joined"

  // 1. Fetch Author Profile
  const {
    data: author,
    isPending: isAuthorPending,
    error: authorError,
  } = useQuery({
    queryKey: ["authorProfile", username],
    queryFn: () => fetchAuthorProfile(username),
    retry: 1,
  });

  // 2. Fetch Author's Published Posts
  const {
    data: posts,
    isPending: isPostsPending,
    error: postsError,
  } = useQuery({
    queryKey: ["authorPosts", username],
    queryFn: () => fetchAuthorPosts(username),
    enabled: !!author,
  });

  // 3. Fetch Author's Public Channels
  const {
    data: channelsData,
    isPending: isChannelsPending,
    error: channelsError,
  } = useQuery({
    queryKey: ["authorChannels", username],
    queryFn: () => fetchAuthorChannels(username),
    enabled: !!author,
  });

  const displayedChannels =
    channelFilter === "created"
      ? channelsData?.created || []
      : channelFilter === "joined"
      ? channelsData?.joined || []
      : channelsData?.channels || [];

  const handleShare = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Profile link copied to clipboard! 📋");
      setTimeout(() => setCopied(false), 3000);
    } else {
      toast.info("Share URL: " + window.location.href);
    }
  };

  // Resolve author avatar src
  const avatarSrc = author?.img
    ? author.img.startsWith("http") || author.img.startsWith("/")
      ? author.img
      : `${import.meta.env.VITE_IK_URL_ENDPOINT}/${author.img}`
    : "/userImg.jpeg";

  const isOwnProfile =
    currentUser &&
    author &&
    author.username.toLowerCase() === (currentUser.username || "").toLowerCase();

  // Loading State
  if (isAuthorPending) {
    return (
      <div className="flex flex-col gap-8 my-8 max-w-6xl mx-auto w-full animate-pulse">
        {/* Breadcrumb Skeleton */}
        <div className="h-4 w-48 bg-slate-200 rounded-md"></div>

        {/* Profile Header Skeleton */}
        <div className="bg-white/80 rounded-3xl p-8 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center gap-6">
          <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-slate-200 shrink-0"></div>
          <div className="flex-1 flex flex-col items-center md:items-start gap-3 w-full">
            <div className="h-8 w-60 bg-slate-200 rounded-md"></div>
            <div className="h-4 w-32 bg-slate-200 rounded-md"></div>
            <div className="h-16 w-full max-w-xl bg-slate-100 rounded-xl"></div>
          </div>
        </div>

        {/* Articles Grid Skeleton */}
        <div className="mt-6 flex flex-col gap-4">
          <div className="h-6 w-44 bg-slate-200 rounded-md"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-80 border border-slate-100 p-4 flex flex-col gap-3">
                <div className="h-40 bg-slate-200 rounded-xl"></div>
                <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                <div className="h-4 bg-slate-100 rounded w-full"></div>
                <div className="h-4 bg-slate-100 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Not Found / Missing Profile State
  if (authorError || !author) {
    return (
      <div className="my-16 flex flex-col items-center justify-center text-center px-4 max-w-md mx-auto">
        <div className="w-20 h-20 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-4xl mb-4 border border-red-100 shadow-sm">
          👤
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2 font-[Philosopher]">
          Author Not Found
        </h1>
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
          The author profile <span className="font-semibold text-gray-800">@{username}</span> could not be found or does not exist.
        </p>
        <div className="flex gap-3">
          <Link
            to="/posts"
            className="px-5 py-2.5 rounded-xl bg-green-800 hover:bg-green-900 text-white font-medium text-sm transition-colors shadow-sm"
          >
            Explore Articles
          </Link>
          <Link
            to="/"
            className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const joinDate = author.createdAt
    ? new Date(author.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex flex-col gap-8 my-6 max-w-6xl mx-auto w-full">
      {/* BREADCRUMB NAVIGATION */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[#2f4b3a]">
        <Link to="/" className="hover:underline opacity-80">
          Home
        </Link>
        <span>•</span>
        <Link to="/posts" className="hover:underline opacity-80">
          Authors
        </Link>
        <span>•</span>
        <span className="font-semibold text-green-800">@{author.username}</span>
      </nav>

      {/* AUTHOR HERO CARD */}
      <section className="relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-sm border border-[#2f4b3a]/15 shadow-sm p-6 sm:p-8 md:p-10">
        {/* Subtle decorative green accent background glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-green-50/60 blur-3xl pointer-events-none"></div>

        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
          {/* Avatar with status/badge border */}
          <div className="relative shrink-0">
            <img
              src={avatarSrc}
              alt={author.username}
              className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full object-cover border-4 border-white shadow-md bg-emerald-50 ring-2 ring-[#176B3A]/20"
              onError={(e) => {
                e.currentTarget.src = "/userImg.jpeg";
              }}
            />
            <span
              className="absolute bottom-1 right-2 w-5 h-5 rounded-full bg-emerald-600 border-2 border-white shadow-sm"
              title="Verified Author"
            ></span>
          </div>

          {/* Author Details & Bio */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-wrap">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 font-[Philosopher]">
                {author.username}
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100/80 text-emerald-900 border border-emerald-300/60 self-center sm:self-auto">
                Author
              </span>
            </div>

            <p className="text-sm font-medium text-green-800/90 -mt-1">
              @{author.username}
            </p>

            {/* Author Bio */}
            <div className="mt-1 max-w-2xl">
              {author.about ? (
                <p className="text-gray-600 leading-relaxed text-sm sm:text-base font-normal">
                  {author.about}
                </p>
              ) : (
                <p className="text-gray-400 italic text-sm">
                  Passionate contributor writing ideas and insights on Veles.
                </p>
              )}
            </div>

            {/* Metadata Stats Pills */}
            <div className="flex items-center gap-3 sm:gap-4 mt-2 flex-wrap justify-center md:justify-start text-xs sm:text-sm text-gray-500">
              <div className="flex items-center gap-1.5 bg-[#e5f3f1]/70 px-3 py-1.5 rounded-xl border border-green-800/10 font-medium text-green-900">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4 text-green-800"
                >
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                  <path d="M6 6h10" />
                  <path d="M6 10h10" />
                </svg>
                <span>
                  {posts ? posts.length : author.postCount || 0}{" "}
                  {(posts ? posts.length : author.postCount || 0) === 1
                    ? "Article"
                    : "Articles"}
                </span>
              </div>

              {joinDate && (
                <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200/60 text-gray-600 font-medium">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-4 h-4 text-gray-500"
                  >
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                    <line x1="16" x2="16" y1="2" y2="6" />
                    <line x1="8" x2="8" y1="2" y2="6" />
                    <line x1="3" x2="21" y1="10" y2="10" />
                  </svg>
                  <span>Joined {joinDate}</span>
                </div>
              )}
            </div>

            {/* Action Buttons: Share & Dashboard edit shortcut if own profile */}
            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm transition-all hover:border-[#176B3A]"
                title="Share this author profile"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4 text-green-800"
                >
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
                  <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
                </svg>
                <span>{copied ? "Link Copied!" : "Share Profile"}</span>
              </button>

              {isOwnProfile && (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-green-800 hover:bg-green-900 text-white shadow-sm transition-colors"
                >
                  <span>Edit in Dashboard</span>
                  <span></span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CHANNELS SECTION */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-[#2f4b3a]/15 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 font-[Philosopher] flex items-center gap-2">
              <span>Community Channels</span>
            </h2>
            {channelsData?.totalCount !== undefined && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {channelsData.totalCount}
              </span>
            )}
          </div>
          <Link
            to="/channels"
            className="text-xs sm:text-sm font-medium text-green-800 hover:underline"
          >
            Explore All Channels
          </Link>
        </div>

        {/* Loading channels state */}
        {isChannelsPending && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl h-44 border border-slate-100 p-5 flex flex-col justify-between shadow-xs"
              >
                <div className="flex flex-col gap-2.5">
                  <div className="h-5 bg-slate-200 rounded w-2/3"></div>
                  <div className="h-4 bg-slate-100 rounded w-full"></div>
                  <div className="h-4 bg-slate-100 rounded w-4/5"></div>
                </div>
                <div className="h-4 bg-slate-100 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error fetching channels state */}
        {channelsError && (
          <div className="py-6 text-center text-red-500 bg-red-50/60 rounded-2xl border border-red-100 text-xs">
            Failed to load channels for this author.
          </div>
        )}

        {/* Empty state: Author has no eligible public channels */}
        {!isChannelsPending && (!channelsData?.channels || channelsData.channels.length === 0) && (
          <div className="bg-white/70 rounded-2xl border border-dashed border-[#2f4b3a]/25 p-7 text-center flex flex-col items-center justify-center gap-2 shadow-2xs">
            <span className="text-2xl">💬</span>
            <p className="text-xs text-gray-600 font-medium">
              @{author.username} hasn&apos;t created or joined any public channels yet.
            </p>
            <Link
              to="/channels"
              className="text-xs text-green-800 hover:underline font-semibold mt-0.5"
            >
              Browse technical communities on Veles  
            </Link>
          </div>
        )}

        {/* Channels Grid */}
        {!isChannelsPending && channelsData?.channels && channelsData.channels.length > 0 && (
          <div className="flex flex-col gap-4">
            {/* Filter pills when author has both created and joined channels */}
            {channelsData.createdCount > 0 && channelsData.joinedCount > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setChannelFilter("all")}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors ${
                    channelFilter === "all"
                      ? "bg-green-800 text-white shadow-2xs"
                      : "bg-white hover:bg-gray-100 text-gray-600 border border-gray-200"
                  }`}
                >
                  All ({channelsData.totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setChannelFilter("created")}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors ${
                    channelFilter === "created"
                      ? "bg-green-800 text-white shadow-2xs"
                      : "bg-white hover:bg-gray-100 text-gray-600 border border-gray-200"
                  }`}
                >
                  Created ({channelsData.createdCount})
                </button>
                <button
                  type="button"
                  onClick={() => setChannelFilter("joined")}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors ${
                    channelFilter === "joined"
                      ? "bg-green-800 text-white shadow-2xs"
                      : "bg-white hover:bg-gray-100 text-gray-600 border border-gray-200"
                  }`}
                >
                  Joined ({channelsData.joinedCount})
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedChannels.map((channel) => (
                <Link
                  key={channel._id}
                  to={`/channels/${channel.slug}`}
                  className="group flex flex-col justify-between p-5 rounded-2xl bg-white border border-[#2f4b3a]/15 shadow-2xs hover:shadow-md hover:border-green-800/40 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex flex-col gap-2.5">
                    {/* Header: Name + Relationship Pill */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-green-800/70 font-bold text-base">#</span>
                        <h3 className="font-bold text-gray-800 text-sm sm:text-base truncate group-hover:text-green-800 transition-colors">
                          {channel.name}
                        </h3>
                      </div>
                      {channel.relationship === "creator" ? (
                        <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60 flex items-center gap-1">
                          <span></span>
                          <span>Creator</span>
                        </span>
                      ) : (
                        <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200/60 flex items-center gap-1">
                          <span></span>
                          <span>Member</span>
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed min-h-[2rem]">
                      {channel.description || "Topic-based technical community."}
                    </p>
                  </div>

                  {/* Footer: Member count & Action hint */}
                  <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-medium flex items-center gap-1.5">
                      <span className="text-gray-400">👥</span>
                      <span>{channel.memberCount || 1} {channel.memberCount === 1 ? "member" : "members"}</span>
                    </span>

                    <span className="font-semibold text-green-800 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 text-[11px]">
                      <span>Open</span>
                      <span> </span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* PUBLISHED ARTICLES SECTION */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-[#2f4b3a]/15 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 font-[Philosopher]">
              Published Articles
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">
              {posts ? posts.length : 0}
            </span>
          </div>
          <Link
            to="/posts"
            className="text-xs sm:text-sm font-medium text-green-800 hover:underline"
          >
            Explore All Posts  
          </Link>
        </div>

        {/* Loading posts state */}
        {isPostsPending && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl h-80 border border-slate-100 p-5 flex flex-col gap-4 shadow-sm"
              >
                <div className="h-44 bg-slate-200 rounded-xl"></div>
                <div className="h-5 bg-slate-200 rounded w-2/3"></div>
                <div className="h-4 bg-slate-100 rounded w-full"></div>
                <div className="h-4 bg-slate-100 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error fetching posts state */}
        {postsError && (
          <div className="py-12 text-center text-red-500 bg-red-50 rounded-2xl border border-red-100">
            Failed to load articles for this author. Please try refreshing.
          </div>
        )}

        {/* Empty state: Author has no published articles */}
        {!isPostsPending && (!posts || posts.length === 0) && (
          <div className="bg-white/80 rounded-2xl border border-dashed border-[#2f4b3a]/30 p-12 text-center flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-green-50 text-green-800 flex items-center justify-center text-3xl">
              📝
            </div>
            <h3 className="text-lg font-semibold text-gray-800">
              No Published Articles Yet
            </h3>
            <p className="text-sm text-gray-500 max-w-md">
              {author.username} hasn&apos;t published any articles yet. When they write and publish new posts, they will show up here.
            </p>
            <Link
              to="/"
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-800 text-white text-sm font-medium hover:bg-green-900 transition-colors shadow-sm"
            >
              Browse Recent Posts
            </Link>
          </div>
        )}

        {/* Articles Responsive Card Grid */}
        {!isPostsPending && posts && posts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <article
                key={post._id}
                className="group flex flex-col rounded-2xl border border-[#176B3A]/30 bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-[#176B3A] transition-all duration-300"
              >
                {/* Cover Image */}
                <Link to={`/${post.slug}`} className="block relative overflow-hidden aspect-video bg-emerald-50/50">
                  {post.img ? (
                    <Image
                      src={post.img}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      w="500"
                      alt={post.title}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-100/60 to-[#d9e6df] text-green-900/60">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-12 h-12 mb-1 opacity-70"
                      >
                        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                        <path d="M6 6h10" />
                        <path d="M6 10h10" />
                      </svg>
                      <span className="text-xs font-medium uppercase tracking-wider">
                        {post.category || "Article"}
                      </span>
                    </div>
                  )}

                  {/* Category Pill Tag */}
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold bg-white/95 text-green-800 shadow-sm backdrop-blur-sm border border-green-800/10">
                    {post.category || "General"}
                  </span>
                </Link>

                {/* Article Card Body */}
                <div className="flex-1 p-5 flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-2.5">
                    {/* Publication Date & Likes */}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{format(post.createdAt)}</span>
                      {post.likes && post.likes.length > 0 && (
                        <span className="flex items-center gap-1 text-red-500 font-medium">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="13px"
                            height="13px"
                            fill="currentColor"
                          >
                            <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                          </svg>
                          <span>{post.likes.length}</span>
                        </span>
                      )}
                    </div>

                    {/* Article Title */}
                    <Link
                      to={`/${post.slug}`}
                      className="text-lg font-bold text-gray-800 group-hover:text-green-800 transition-colors line-clamp-2 leading-snug"
                    >
                      {post.title}
                    </Link>

                    {/* Article Description */}
                    <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                      {post.desc || "Read the full article on Veles to discover new insights."}
                    </p>
                  </div>

                  {/* Read More Link */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <Link
                      to={`/${post.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-800 hover:text-green-900 group-hover:translate-x-0.5 transition-all"
                    >
                      <span>Read Article</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-3.5 h-3.5"
                      >
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </Link>

                    <span className="text-[11px] text-gray-400">
                      {post.category}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AuthorProfilePage;

