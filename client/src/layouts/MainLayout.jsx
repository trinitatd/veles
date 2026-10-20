import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#e5f3f1] dark:bg-[#111713] text-gray-800 dark:text-[#E5E9E4] transition-colors duration-200">
      <header className="w-full shadow-sm bg-transparent dark:bg-[#111713]/80 dark:border-b dark:border-[#35443A]/60 backdrop-blur-md">
        <div className="px-4 md:px-8 lg:px-16 lx:px-32 2xl:px-64">
          <Navbar />
        </div>
      </header>
      <div className="px-4 md:px-8 lg:px-16 lx:px-32 2xl:px-64 flex-1">
        <Outlet />
      </div>
    </div>
  );
};

export default MainLayout;
