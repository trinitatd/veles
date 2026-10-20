import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem("veles_theme");
      if (saved === "dark" || saved === "light") {
        return saved;
      }
      if (typeof document !== "undefined") {
        if (
          document.documentElement.classList.contains("dark") ||
          document.documentElement.getAttribute("data-theme") === "dark"
        ) {
          return "dark";
        }
      }
      return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } catch {
      return "light";
    }
  });

  const applyTheme = (newTheme) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (newTheme === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
      root.style.colorScheme = "dark";
      if (document.body) {
        document.body.classList.add("dark");
        document.body.setAttribute("data-theme", "dark");
      }
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
      root.style.colorScheme = "light";
      if (document.body) {
        document.body.classList.remove("dark");
        document.body.setAttribute("data-theme", "light");
      }
    }
  };

  const setTheme = (newTheme) => {
    try {
      localStorage.setItem("veles_theme", newTheme);
    } catch (e) {
      console.warn("Could not save theme preference to localStorage", e);
    }
    setThemeState(newTheme);
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  // Sync theme changes with DOM immediately
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Handle multi-tab sync and system preference changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Sync across browser tabs
    const handleStorage = (e) => {
      if (e.key === "veles_theme" && (e.newValue === "dark" || e.newValue === "light")) {
        setThemeState(e.newValue);
        applyTheme(e.newValue);
      }
    };

    // Listen for OS system theme changes when no preference is saved in localStorage
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = (e) => {
      const saved = localStorage.getItem("veles_theme");
      if (!saved) {
        const sysTheme = e.matches ? "dark" : "light";
        setThemeState(sysTheme);
        applyTheme(sysTheme);
      }
    };

    window.addEventListener("storage", handleStorage);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleMediaChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleMediaChange);
    }

    return () => {
      window.removeEventListener("storage", handleStorage);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleMediaChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, []);

  const value = {
    theme,
    isDark: theme === "dark",
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
