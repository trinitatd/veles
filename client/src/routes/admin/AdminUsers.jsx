import { useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-toastify";
import { format } from "timeago.js";

const AdminUsers = () => {
  const { user: currentAdmin } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [userToModifyRole, setUserToModifyRole] = useState(null);

  // Fetch users with article/comment counts and Clerk roles
  const { data, isPending, error } = useQuery({
    queryKey: ["adminUsers", { page, search }],
    queryFn: async () => {
      const token = await getToken();
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });

      if (search) params.append("search", search);

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/admin/users?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return res.data;
    },
  });

  // Toggle user role mutation
  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }) => {
      const token = await getToken();
      return axios.patch(
        `${import.meta.env.VITE_API_URL}/admin/users/${userId}/role`,
        { role },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    },
    onSuccess: (res) => {
      toast.success(res.data.message || "User role updated successfully");
      setUserToModifyRole(null);
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.response?.data || "Failed to update user role");
      setUserToModifyRole(null);
    },
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const users = data?.users || [];
  const totalUsers = data?.totalUsers || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="flex flex-col gap-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            User Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Registered Veles community members, authors, and administrator accounts.
          </p>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by username or email..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-800/20 focus:border-green-800 transition-all"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }}
              className="text-xs text-red-600 hover:text-red-700 px-2 py-2"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* USERS TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        {isPending ? (
          <div className="py-20 text-center text-sm text-gray-500 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-green-800 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading user directory...</span>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-500">
            Failed to load users. Please try again.
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xl">
              👥
            </div>
            <h3 className="font-bold text-gray-700">No users found</h3>
            <p className="text-xs text-gray-400 max-w-sm">
              {search
                ? "No users matched your search criteria."
                : "No users have registered on Veles yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-3">Articles</th>
                  <th className="py-3 px-3">Comments</th>
                  <th className="py-3 px-3">Joined Date</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-4 text-right">Role Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {users.map((targetUser) => {
                  const isCurrentAdminSelf =
                    targetUser.clerkUserId === currentAdmin?.id;
                  const isUserAdmin = targetUser.role === "admin";

                  return (
                    <tr key={targetUser._id} className="hover:bg-gray-50/60 transition-colors group">
                      {/* Avatar & Username */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <img
                            src={targetUser.img || "/userImg.jpeg"}
                            alt={targetUser.username}
                            className="w-9 h-9 rounded-full object-cover border border-gray-200"
                          />
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900 text-sm">
                              @{targetUser.username}
                            </span>
                            {isCurrentAdminSelf && (
                              <span className="text-[10px] text-green-700 font-semibold">
                                (You)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-gray-600">
                        {targetUser.email}
                      </td>

                      {/* Number of Articles */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-xs font-semibold text-gray-800">
                        📰 {targetUser.articlesCount}
                      </td>

                      {/* Number of Comments */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-xs font-semibold text-gray-800">
                        💬 {targetUser.commentsCount}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-xs text-gray-400">
                        {format(targetUser.createdAt)}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {isUserAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span>🛡️</span>
                            <span>Admin</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            User
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isCurrentAdminSelf ? (
                          <span className="text-xs text-gray-400 italic">Current Session</span>
                        ) : (
                          <button
                            onClick={() =>
                              setUserToModifyRole({
                                ...targetUser,
                                nextRole: isUserAdmin ? "user" : "admin",
                              })
                            }
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
                              isUserAdmin
                                ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                                : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                            }`}
                          >
                            {isUserAdmin ? "Demote to User" : "Promote to Admin"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION BAR */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing page <strong className="text-gray-800">{page}</strong> of{" "}
              <strong className="text-gray-800">{totalPages}</strong> ({totalUsers} total users)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ROLE MODIFICATION CONFIRMATION MODAL */}
      {userToModifyRole && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 ${
                userToModifyRole.nextRole === "admin"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {userToModifyRole.nextRole === "admin" ? "🛡️" : "⚠️"}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {userToModifyRole.nextRole === "admin"
                  ? "Grant Administrator Privileges"
                  : "Revoke Administrator Privileges"}
              </h3>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                {userToModifyRole.nextRole === "admin" ? (
                  <>
                    Are you sure you want to promote{" "}
                    <strong className="text-gray-900">@{userToModifyRole.username}</strong> to an
                    administrator? They will gain full administrative access to all posts, comments,
                    users, and platform settings.
                  </>
                ) : (
                  <>
                    Are you sure you want to demote{" "}
                    <strong className="text-gray-900">@{userToModifyRole.username}</strong> back to a regular
                    user? They will lose access to the Admin Dashboard immediately.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setUserToModifyRole(null)}
                disabled={roleMutation.isPending}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  roleMutation.mutate({
                    userId: userToModifyRole._id,
                    role: userToModifyRole.nextRole,
                  })
                }
                disabled={roleMutation.isPending}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition-colors disabled:opacity-50 ${
                  userToModifyRole.nextRole === "admin"
                    ? "bg-green-800 hover:bg-green-900"
                    : "bg-amber-700 hover:bg-amber-800"
                }`}
              >
                {roleMutation.isPending
                  ? "Updating..."
                  : userToModifyRole.nextRole === "admin"
                  ? "Confirm Promotion"
                  : "Confirm Demotion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
