import { Link, useSearchParams } from "react-router-dom";
import Search from "./Search";

const SideMenu = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const handleFilterChange = (e) => {
    if (searchParams.get("sort") !== e.target.value) {
      setSearchParams({
        ...Object.fromEntries(searchParams.entries()),
        sort: e.target.value,
      });
    }
  };
  const handleCategoryChange = (category) => {
    if (searchParams.get("cat") !== category) {
      setSearchParams({
        ...Object.fromEntries(searchParams.entries()),
        cat:category,
      });
    }
  };


  return (
    <div className="px-4 h-max sticky top-8">
      <h1 className="mb-4 text-sm font-semibold text-gray-800 dark:text-[#E5E9E4]">Search</h1>
      <Search />
      <h1 className="mt-8 mb-4 text-sm font-semibold text-gray-800 dark:text-[#E5E9E4]">Filter</h1>
      <div className="flex flex-col gap-2.5 text-sm text-gray-700 dark:text-[#A5B0A7]">
        <label htmlFor="" className="flex items-center gap-2 cursor-pointer hover:text-black dark:hover:text-[#E5E9E4] transition-colors">
          <input
            type="radio"
            name="sort"
            onChange={handleFilterChange}
            value="newest"
            className="appearance-none w-4 h-4 border-[1.5px] border-green-800 dark:border-[#7BC98C] cursor-pointer rounded-sm bg-white dark:bg-[#1B241E] checked:bg-green-800 dark:checked:bg-[#7BC98C]"
          />
          Newest
        </label>
        <label htmlFor="" className="flex items-center gap-2 cursor-pointer hover:text-black dark:hover:text-[#E5E9E4] transition-colors">
          <input
            type="radio"
            name="sort"
            onChange={handleFilterChange}
            value="popular"
            className="appearance-none w-4 h-4 border-[1.5px] border-green-800 dark:border-[#7BC98C] cursor-pointer rounded-sm bg-white dark:bg-[#1B241E] checked:bg-green-800 dark:checked:bg-[#7BC98C]"
          />
          Most Popular
        </label>
        <label htmlFor="" className="flex items-center gap-2 cursor-pointer hover:text-black dark:hover:text-[#E5E9E4] transition-colors">
          <input
            type="radio"
            name="sort"
            onChange={handleFilterChange}
            value="trending"
            className="appearance-none w-4 h-4 border-[1.5px] border-green-800 dark:border-[#7BC98C] cursor-pointer rounded-sm bg-white dark:bg-[#1B241E] checked:bg-green-800 dark:checked:bg-[#7BC98C]"
          />
          Trending
        </label>
        <label htmlFor="" className="flex items-center gap-2 cursor-pointer hover:text-black dark:hover:text-[#E5E9E4] transition-colors">
          <input
            type="radio"
            name="sort"
            onChange={handleFilterChange}
            value="oldest"
            className="appearance-none w-4 h-4 border-[1.5px] border-green-800 dark:border-[#7BC98C] cursor-pointer rounded-sm bg-white dark:bg-[#1B241E] checked:bg-green-800 dark:checked:bg-[#7BC98C]"
          />
          Oldest
        </label>
      </div>
      <h1 className="mt-8 mb-4 text-sm font-semibold text-gray-800 dark:text-[#E5E9E4]">Categories</h1>
      <div className="flex flex-col gap-2.5 text-sm text-gray-700 dark:text-[#A5B0A7]">
        <span className="underline cursor-pointer hover:text-green-800 dark:hover:text-[#7BC98C] transition-colors" onClick={()=>handleCategoryChange("general")}>All</span>
        <span className="underline cursor-pointer hover:text-green-800 dark:hover:text-[#7BC98C] transition-colors" onClick={()=>handleCategoryChange("web-design")}>Web Design</span>
        <span className="underline cursor-pointer hover:text-green-800 dark:hover:text-[#7BC98C] transition-colors" onClick={()=>handleCategoryChange("ai_ml")}>AI & ML</span>
        <span className="underline cursor-pointer hover:text-green-800 dark:hover:text-[#7BC98C] transition-colors" onClick={()=>handleCategoryChange("databases")}>Databases</span>
        <span className="underline cursor-pointer hover:text-green-800 dark:hover:text-[#7BC98C] transition-colors" onClick={()=>handleCategoryChange("seo")}>Search Engines</span>
        <span className="underline cursor-pointer hover:text-green-800 dark:hover:text-[#7BC98C] transition-colors" onClick={()=>handleCategoryChange("devops")}>DevOps</span>
      </div>
    </div>
  );
};

export default SideMenu;
