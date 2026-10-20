import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

const Search = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      const query = e.target.value.trim();
      const currentParams = Object.fromEntries(searchParams.entries());

      // If already on homepage ("/") or post list page ("/posts"), filter in-place
      if (location.pathname === "/" || location.pathname === "/posts") {
        if (query) {
          currentParams.search = query;
        } else {
          delete currentParams.search;
        }
        setSearchParams(currentParams);
      } else {
        // From other pages (e.g. single post), navigate to posts list
        if (query) {
          navigate(`/posts?search=${encodeURIComponent(query)}`);
        } else {
          navigate("/posts");
        }
      }
    }
  };

  return (
    <div className="bg-gray-100 dark:bg-[#222D25] border border-transparent dark:border-[#35443A] p-2 rounded-full flex items-center gap-2 transition-colors">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        className="text-gray-500 dark:text-[#A5B0A7] shrink-0"
      >
        <circle cx="10.5" cy="10.5" r="7.5" strokeWidth="2" />
        <line x1="16.5" y1="16.5" x2="22" y2="22" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        placeholder="search a post by title"
        className="bg-transparent focus:outline-none text-sm text-gray-700 dark:text-[#E5E9E4] placeholder-gray-400 dark:placeholder-[#A5B0A7]/60 w-full"
        defaultValue={searchParams.get("search") || ""}
        key={searchParams.get("search") || ""}
        onKeyDown={handleKeyPress}
      />
    </div>
  );
};

export default Search;
