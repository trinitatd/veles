import { useState } from "react";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, UserButton, useUser } from "@clerk/clerk-react";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";

  return (
    <nav className="w-full max-w-7xl mx-auto h-16 md:h-20 flex items-center justify-between text-black dark:text-[#E5E9E4] gap-2 md:gap-4 transition-colors">
      {/* LOGO */}
      <Link
        to="/"
        className="flex items-center gap-2 sm:gap-2.5 shrink-0 tracking-tight"
      >
        <img
          src="/logo.png"
          alt="Veles Logo"
          width={32}
          height={32}
          className="w-8 h-8 rounded-full object-cover shrink-0"
        />
        <span className="font-[Cinzel] text-2xl sm:text-2xl lg:text-3xl font-bold text-black dark:text-[#E5E9E4] shrink-0">
          Veles
        </span>
      </Link>

      {/* MOBILE MENU */}
      <div className="md:hidden flex items-center">
        {/* MOBILE BUTTON */}
        <button
          type="button"
          className="cursor-pointer text-4xl p-2 focus:outline-none"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <div className="flex flex-col gap-[5.4px]">
            <div
              className={`h-[3px] rounded-md w-6 bg-gray-900 dark:bg-[#E5E9E4] origin-left transition-all ease-in-out ${
                open && "rotate-45"
              }`}
            ></div>
            <div
              className={`h-[3px] rounded-md w-6 bg-gray-900 dark:bg-[#E5E9E4] transition-all ease-in-out ${
                open && "opacity-0"
              }`}
            ></div>
            <div
              className={`h-[3px] rounded-md w-6 bg-gray-900 dark:bg-[#E5E9E4] origin-left transition-all ease-in-out ${
                open && "-rotate-45"
              }`}
            ></div>
          </div>
        </button>

        {/* MOBILE LINK LIST */}
        <div
          className={`w-full h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] bg-[#13221b]/95 backdrop-blur-md text-white flex flex-col items-center justify-center gap-6 sm:gap-8 font-medium text-lg fixed top-16 md:top-20 left-0 z-50 border-t border-white/10 transition-all duration-300 ease-in-out ${
            open ? "translate-x-0 opacity-100 pointer-events-auto" : "translate-x-full opacity-0 pointer-events-none"
          }`}
        >
          <Link to="/" onClick={() => setOpen(false)} className="hover:text-emerald-300 transition-colors">
            Home
          </Link>
          <Link to="/posts?sort=trending" onClick={() => setOpen(false)} className="hover:text-emerald-300 transition-colors">
            Trending
          </Link>
          <Link to="/posts?sort=popular" onClick={() => setOpen(false)} className="hover:text-emerald-300 transition-colors">
            Most Popular
          </Link>
          <Link to="/channels" onClick={() => setOpen(false)} className="hover:text-emerald-300 transition-colors">
            Channels
          </Link>
          <Link to="/about" onClick={() => setOpen(false)} className="hover:text-emerald-300 transition-colors">
            About
          </Link>
          <Link to="/write" onClick={() => setOpen(false)} className="hover:text-emerald-300 transition-colors">
            Write 
          </Link>
          <SignedOut>
            <Link to="/login" onClick={() => setOpen(false)}>
              <button className="py-2 px-6 rounded-3xl bg-green-700 hover:bg-green-600 dark:bg-[#25382B] dark:border dark:border-[#35443A] text-white transition-colors">
                Login
              </button>
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              to="/dashboard"
              onClick={() => setOpen(false)}
              className="hover:text-emerald-300 transition-colors"
            >
              Dashboard 👤
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="hover:text-emerald-300 transition-colors"
              >
                Admin Panel
              </Link>
            )}
            <UserButton>
              <UserButton.MenuItems>
                <UserButton.Link
                  label="Dashboard"
                  labelIcon={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                  }
                  href="/dashboard"
                />
                {isAdmin && (
                  <UserButton.Link
                    label="Admin Panel"
                    labelIcon={
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    }
                    href="/admin"
                  />
                )}
              </UserButton.MenuItems>
            </UserButton>
          </SignedIn>
        </div>
      </div>

      {/* DESKTOP MENU */}
      <div className="hidden md:flex items-center justify-end flex-1 min-w-0 gap-2 md:gap-2.5 lg:gap-4 xl:gap-6 font-medium text-gray-800 dark:text-[#E5E9E4] text-xs md:text-[13px] lg:text-sm xl:text-base">
        <div className="flex items-center gap-1 md:gap-1.5 lg:gap-3 xl:gap-5 min-w-0">
          <Link to="/" className="whitespace-nowrap px-1 md:px-1.5 lg:px-2 py-1 text-gray-800 dark:text-[#E5E9E4] hover:text-black dark:hover:text-[#7BC98C] transition-colors shrink-0">Home</Link>
          <Link to="/posts?sort=trending" className="whitespace-nowrap px-1 md:px-1.5 lg:px-2 py-1 text-gray-800 dark:text-[#E5E9E4] hover:text-black dark:hover:text-[#7BC98C] transition-colors shrink-0">Trending</Link>
          <Link to="/posts?sort=popular" className="whitespace-nowrap px-1 md:px-1.5 lg:px-2 py-1 text-gray-800 dark:text-[#E5E9E4] hover:text-black dark:hover:text-[#7BC98C] transition-colors shrink-0">Most Popular</Link>
          <Link to="/channels" className="whitespace-nowrap px-1 md:px-1.5 lg:px-2 py-1 text-gray-800 dark:text-[#E5E9E4] hover:text-black dark:hover:text-[#7BC98C] transition-colors shrink-0">Channels</Link>
          <Link to="/about" className="whitespace-nowrap px-1 md:px-1.5 lg:px-2 py-1 text-gray-800 dark:text-[#E5E9E4] hover:text-black dark:hover:text-[#7BC98C] transition-colors shrink-0">About</Link>
          
          <SignedIn>
            <Link
              to="/dashboard"
              className="flex items-center gap-1 whitespace-nowrap px-1 md:px-1.5 lg:px-2 py-1 text-gray-800 dark:text-[#E5E9E4] hover:text-black dark:hover:text-[#7BC98C] transition-colors shrink-0"
            >
              <span>Dashboard</span>
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-1 whitespace-nowrap px-1 md:px-1.5 lg:px-2 py-1 text-gray-800 dark:text-[#E5E9E4] hover:text-black dark:hover:text-[#7BC98C] transition-colors shrink-0"
              >
                <span>Admin Panel</span>
              </Link>
            )}
          </SignedIn>
        </div>

        {/* AUTH / PROFILE */}
        <div className="shrink-0 flex items-center pl-1 sm:pl-2">
          <SignedOut>
            <Link to="/login">
              <button className="py-1.5 px-3.5 md:px-4 lg:px-5 rounded-3xl bg-green-700 hover:bg-green-600 dark:bg-[#25382B] dark:border dark:border-[#35443A] dark:hover:bg-[#2e4736] text-white text-xs md:text-sm font-medium shadow-sm transition-colors whitespace-nowrap">
                Login 
              </button>
            </Link>
          </SignedOut>
          <SignedIn>
            <UserButton>
              <UserButton.MenuItems>
                <UserButton.Link
                  label="Dashboard"
                  labelIcon={
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                  }
                  href="/dashboard"
                />
                {isAdmin && (
                  <UserButton.Link
                    label="Admin Panel"
                    labelIcon={
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    }
                    href="/admin"
                  />
                )}
              </UserButton.MenuItems>
            </UserButton>
          </SignedIn>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
