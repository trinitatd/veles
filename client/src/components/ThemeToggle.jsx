import { useTheme } from "../context/ThemeContext";

const ThemeToggle = ({ className = "" }) => {
  const { isDark, toggleTheme, setTheme } = useTheme();

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const option = e.target.closest("[data-theme-option]");
    if (option) {
      const mode = option.getAttribute("data-theme-option");
      if (mode === "light" || mode === "dark") {
        setTheme(mode);
        return;
      }
    }
    toggleTheme();
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={`Current theme is ${isDark ? "Dark" : "Light"}. Click to switch to ${isDark ? "Light" : "Dark"} mode.`}
      title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
      className={`inline-flex items-center p-1 rounded-2xl border transition-all duration-200 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-800/30 dark:focus:ring-[#7BC98C]/30 shadow-xs ${
        isDark
          ? "bg-[#1B241E] border-[#35443A] text-[#E5E9E4]"
          : "bg-white border-gray-200 text-gray-700"
      } ${className}`}
    >
      <div className="flex items-center gap-1 text-xs font-semibold">
        {/* Light Option (Sun) */}
        <span
          data-theme-option="light"
          className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
            !isDark
              ? "bg-amber-100/70 text-amber-900 font-bold shadow-2xs"
              : "text-gray-400 dark:text-[#A5B0A7] hover:text-gray-200"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-[#A5B0A7]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <span className="text-[11px] font-medium leading-none">Light</span>
        </span>

        {/* Dark Option (Moon) */}
        <span
          data-theme-option="dark"
          className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
            isDark
              ? "bg-[#25382B] text-[#7BC98C] border border-[#35443A] font-bold shadow-2xs"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-[#7BC98C]"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          <span className="text-[11px] font-medium leading-none">Dark</span>
        </span>
      </div>
    </button>
  );
};

export default ThemeToggle;
