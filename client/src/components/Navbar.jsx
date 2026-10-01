import { useState } from "react";
import { Link } from "react-router-dom";
import { SignedIn, SignedOut, UserButton, useUser } from "@clerk/clerk-react";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "admin";

  return (
    <div className="w-full h-16 md:h-20 flex items-center justify-between text-black">
      {/* LOGO */}
      <Link to="/" className="flex items-center gap-4 text-2xl font-bold text-black tracking-tight">
          <img src="/logo.png"alt="Veles Logo" width={32} height={32} className="rounded-full" />
        <span className="font-[Cinzel] text-3xl">Veles</span>
      </Link>
      {/* MOBILE MENU */}
      <div className="md:hidden">
        {/* MOBILE BUTTON */}
        <div
          className="cursor-pointer text-4xl p-2 focus:outline-none"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          <div className="flex flex-col gap-[5.4px]">
            <div
              className={`h-[3px] rounded-md w-6 bg-white origin-left transition-all ease-in-out ${
                open && "rotate-45"
              }`}
            ></div>
            <div
              className={`h-[3px] rounded-md w-6 bg-white transition-all ease-in-out ${
                open && "opacity-0"
              }`}
            ></div>
            <div
              className={`h-[3px] rounded-md w-6 bg-white origin-left transition-all ease-in-out ${
                open && "-rotate-45"
              }`}
            ></div>
          </div>
        </div>
        {/* MOBILE LINK LIST */}
        <div
          className={`w-full h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)]  text-white flex flex-col items-center justify-center gap-8 font-medium text-lg fixed top-16 md:top-20 left-0 z-50 border-t border-white/10 transition-all duration-300 ease-in-out ${
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
          <Link to="/about" onClick={() => setOpen(false)} className="hover:text-emerald-300 transition-colors">
            About
          </Link>
          <Link to="/write" onClick={() => setOpen(false)} className="hover:text-emerald-300 transition-colors">
            Write 
          </Link>
          <SignedOut>
            <Link to="/login" onClick={() => setOpen(false)}>
              <button className="py-2 px-6 rounded-3xl bg-green-700 hover:bg-green-600 text-white transition-colors">
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
              Dashboard 
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
      <div className="hidden md:flex items-center gap-8 xl:gap-12 font-medium text-black/90">
        <Link to="/" className="hover:text-black transition-colors">Home</Link>
        <Link to="/posts?sort=trending" className="hover:text-black transition-colors">Trending</Link>
        <Link to="/posts?sort=popular" className="hover:text-black transition-colors">Most Popular</Link>
        <Link to="/about" className="hover:text-black transition-colors">About</Link>
        
        <SignedOut>
          <Link to="/login">
            <button className="py-2 px-5 rounded-3xl bg-green-700 hover:bg-green-600 text-white shadow-sm transition-colors">
              Login 
            </button>
          </Link>
        </SignedOut>
        <SignedIn>
          <Link
            to="/dashboard"
            className="flex items-center gap-1 text-black/90 hover:text-black transition-colors"
          >
            <span>Dashboard</span>
          </Link>
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-1 text-black/90 hover:text-black transition-colors"
            >
              <span>Admin Panel</span>
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
  );
};

export default Navbar;
