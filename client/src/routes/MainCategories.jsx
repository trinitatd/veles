import { useSearchParams } from "react-router-dom";
import Search from "../components/Search";

const categories = [
  { label: "All Posts", value: "all" },
  { label: "Web Design", value: "web-design" },
  { label: "AI & ML", value: "ai_ml" },
  { label: "Databases", value: "databases" },
  { label: "Search Engines", value: "seo" },
  { label: "DevOps", value: "devops" },
];

const MainCategories = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentCat = searchParams.get("cat");

  const handleCategoryClick = (catValue) => {
    const params = Object.fromEntries(searchParams.entries());
    if (catValue === "all" || catValue === "general") {
      delete params.cat;
    } else {
      params.cat = catValue;
    }
    setSearchParams(params);
  };

  return (
    <div className="w-full bg-[#dee3e0] dark:bg-[#1B241E] border border-[#2f4b3a]/20 dark:border-[#35443A] rounded-2xl p-4 shadow-lg flex items-center gap-8 transition-colors">
      {/* Categories */}
      <div className="flex-1 grid grid-cols-6 items-center">
        {categories.map((c) => {
          const isActive =
            c.value === "all"
              ? !currentCat || currentCat === "all" || currentCat === "general"
              : currentCat === c.value;

          return (
            <button
              key={c.value}
              type="button"
              onClick={() => handleCategoryClick(c.value)}
              className={`${
                isActive
                  ? "bg-green-800 dark:bg-[#25382B] dark:border dark:border-[#7BC98C]/50 text-white shadow-sm"
                  : "hover:bg-green-50 dark:hover:bg-[#222D25] text-gray-800 dark:text-[#A5B0A7] dark:hover:text-[#E5E9E4]"
              } rounded-full px-4 py-2 text-center transition-colors font-medium cursor-pointer`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <span className="text-xl font-medium text-gray-400 dark:text-[#35443A]">|</span>

      {/* Search */}
      <Search />
    </div>
  );
};

export default MainCategories;
