import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full shadow-sm">
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
