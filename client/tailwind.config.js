/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#111713",
          secondary: "#1B241E",
          surface: "#222D25",
          border: "#35443A",
          text: "#E5E9E4",
          muted: "#A5B0A7",
          accent: "#7BC98C",
          button: "#25382B",
        },
      },
    },
  },
  plugins: [],
};

