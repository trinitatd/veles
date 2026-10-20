import { useState } from "react";
import { Link, NavLink, Outlet, Navigate } from "react-router-dom";
import { useUser, SignOutButton } from "@clerk/clerk-react";

const AdminLayout = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 1. Loading State
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#111713]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-green-800 dark:border-[#7BC98C] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-gray-600 dark:text-[#A5B0A7]">
            Verifying administrative privileges...
          </span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Redirect to login
  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  // 3. Authenticated but not an admin: Deny access
  const isAdmin = user?.publicMetadata?.role === "admin";
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#111713] px-4">
        <div className="max-w-md w-full bg-white dark:bg-[#1B241E] rounded-2xl shadow-xl border border-red-100 dark:border-red-900/40 p-8 text-center flex flex-col items-center gap-5 animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 flex items-center justify-center text-3xl shadow-inner">
            🛡️
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-[#E5E9E4]">Access Restricted</h1>
            <p className="text-sm text-gray-600 dark:text-[#A5B0A7] mt-2 leading-relaxed">
              This portal is restricted to authorized Veles administrators.
              Your account{" "}
              <span className="font-semibold text-gray-800 dark:text-[#E5E9E4]">
                ({user.primaryEmailAddress?.emailAddress})
              </span>{" "}
              does not have administrative privileges.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
            <Link
              to="/"
              className="flex-1 py-2.5 px-4 rounded-xl bg-green-800 hover:bg-green-900 dark:bg-[#7BC98C] dark:hover:bg-[#68b87a] text-white dark:text-[#111713] text-sm font-medium transition-colors shadow-sm"
            >
              Back to Veles
            </Link>
            <Link
              to="/dashboard"
              className="flex-1 py-2.5 px-4 rounded-xl bg-gray-100 dark:bg-[#222D25] text-gray-700 dark:text-[#E5E9E4] text-sm font-medium hover:bg-gray-200 dark:hover:bg-[#2b3a2f] transition-colors"
            >
              Author Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Navigation Items
  const navItems = [
    {
      to: "/admin",
      end: true,
      label: "Overview",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      to: "/admin/posts",
      label: "Posts",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
          />
        </svg>
      ),
    },
    {
      to: "/admin/comments",
      label: "Comments",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
    },
    {
      to: "/admin/users",
      label: "Users",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      to: "/admin/channels",
      label: "Channels",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8faf8] dark:bg-[#111713] text-gray-800 dark:text-[#E5E9E4]">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-[#11231a] dark:bg-[#162019] text-white shrink-0 border-r border-[#1a382a] dark:border-[#35443A] sticky top-0 h-screen z-30">
        {/* LOGO & ADMIN BADGE */}
        <div className="p-6 border-b border-white/10 flex flex-col gap-2">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Veles Logo"
              width={32}
              height={32}
              className="rounded-full shadow-sm"
            />
            <span className="font-[Cinzel] text-2xl font-bold tracking-tight text-white">
              Veles
            </span>
          </Link>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wider uppercase border border-emerald-500/30">
              Admin Panel
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 p-4 flex flex-col gap-1.5 overflow-y-auto">
          <div className="text-[11px] font-semibold tracking-wider text-emerald-300/60 uppercase px-3 mb-1">
            Platform Management
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  isActive
                    ? "bg-green-700/80 text-white shadow-sm font-semibold border-l-4 border-emerald-400 pl-2.5"
                    : "text-gray-300 hover:text-white hover:bg-white/5"
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* SIDEBAR FOOTER */}
        <div className="p-4 border-t border-white/10 flex flex-col gap-2">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-emerald-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span>Author Dashboard</span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span>Back to Veles</span>
          </Link>

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={user.imageUrl || "/userImg.jpeg"}
                alt={user.fullName || "Admin"}
                className="w-8 h-8 rounded-full object-cover border border-emerald-500/40"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate">
                  {user.fullName || user.firstName || "Admin"}
                </span>
                <span className="text-[10px] text-emerald-400 truncate">
                  Administrator
                </span>
              </div>
            </div>

            <SignOutButton>
              <button
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                title="Sign Out"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </SignOutButton>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER & DRAWER */}
      <div className="md:hidden flex flex-col bg-[#11231a] dark:bg-[#162019] text-white sticky top-0 z-40 border-b border-[#1a382a] dark:border-[#35443A]">
        <div className="flex items-center justify-between px-4 py-3.5">
          <Link to="/admin" className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Veles Logo"
              width={26}
              height={26}
              className="rounded-full"
            />
            <span className="font-[Cinzel] text-xl font-bold tracking-tight text-white">
              Veles
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              Admin
            </span>
          </Link>

          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 focus:outline-none"
            aria-label="Toggle admin navigation menu"
          >
            {mobileMenuOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>

        {/* MOBILE DRAWER CONTENT */}
        {mobileMenuOpen && (
          <div className="px-4 pb-4 pt-2 border-t border-white/10 flex flex-col gap-2 animate-in slide-in-from-top-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm ${
                    isActive
                      ? "bg-green-700/80 text-white font-semibold"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}

            <div className="pt-3 mt-2 border-t border-white/10 flex flex-col gap-2">
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs text-emerald-300 hover:text-white flex items-center gap-1.5 font-medium"
              >
                <span>👤 Author Dashboard</span>
              </Link>
              <div className="flex items-center justify-between">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs text-gray-300 hover:text-white flex items-center gap-1.5"
                >
                  <span>← Back to Veles</span>
                </Link>
                <SignOutButton>
                  <button className="text-xs text-red-400 hover:text-red-300 font-medium">
                    Sign Out
                  </button>
                </SignOutButton>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MAIN CONTENT OUTLET */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
