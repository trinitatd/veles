import React, { useState } from "react";
import { Link } from "react-router-dom";
import ConfirmModal from "./ConfirmModal";

const ChannelMembersModal = ({
  isOpen,
  members = [],
  isCreator = false,
  isAdmin = false,
  onClose,
  onRemoveMember,
}) => {
  const [search, setSearch] = useState("");
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  if (!isOpen) return null;

  const filteredMembers = members.filter((m) => {
    const username = m.user?.username || "";
    return username.toLowerCase().includes(search.toLowerCase());
  });

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    setIsRemoving(true);
    try {
      await onRemoveMember(memberToRemove.clerkUserId);
      setMemberToRemove(null);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-[#1B241E] rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 dark:border-[#35443A] flex flex-col gap-4 max-h-[85vh] text-gray-800 dark:text-[#E5E9E4]">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#35443A]">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-[#E5E9E4]">
                Channel Members ({members.length})
              </h3>
              <p className="text-xs text-gray-500 dark:text-[#A5B0A7] mt-0.5">
                People participating in this community.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-[#A5B0A7] hover:text-gray-600 dark:hover:text-white p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#222D25] transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-[#35443A] bg-white dark:bg-[#111713] text-xs focus:outline-none focus:ring-2 focus:ring-green-800/20 focus:border-green-800 dark:focus:border-[#7BC98C] transition-all text-gray-800 dark:text-[#E5E9E4] dark:placeholder-[#A5B0A7]"
            />
          </div>

          {/* Members List */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-80 pr-1 divide-y divide-gray-50 dark:divide-[#35443A]">
            {filteredMembers.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-[#A5B0A7] text-center py-6">
                No members found
              </p>
            ) : (
              filteredMembers.map((m) => {
                const isMemberCreator = m.role === "creator";
                const username = m.user?.username || "Anonymous";
                const img = m.user?.img || "/userImg.jpeg";

                return (
                  <div
                    key={m._id || m.clerkUserId}
                    className="flex items-center justify-between py-2.5 gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={img}
                        alt={username}
                        className="w-9 h-9 rounded-full object-cover border border-gray-100 dark:border-[#35443A] flex-shrink-0"
                      />
                      <div className="flex flex-col min-w-0">
                        <Link
                          to={`/author/${username}`}
                          onClick={onClose}
                          className="text-xs font-bold text-gray-800 dark:text-[#E5E9E4] hover:text-green-800 dark:hover:text-[#7BC98C] transition-colors truncate"
                        >
                          @{username}
                        </Link>
                        <span className="text-[10px] text-gray-400 dark:text-[#A5B0A7]">
                          Joined {new Date(m.joinedAt || m.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isMemberCreator ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50">
                          Creator
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-[#222D25] text-gray-600 dark:text-[#A5B0A7]">
                          Member
                        </span>
                      )}

                      {/* Remove Button for Creator or Admin */}
                      {(isCreator || isAdmin) && !isMemberCreator && (
                        <button
                          onClick={() => setMemberToRemove(m)}
                          title="Remove from channel"
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg transition-colors text-xs"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-[#35443A] flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-700 dark:text-[#E5E9E4] bg-gray-100 dark:bg-[#222D25] hover:bg-gray-200 dark:hover:bg-[#2e3f34] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!memberToRemove}
        title="Remove Member"
        message={`Are you sure you want to remove @${memberToRemove?.user?.username} from this channel? They will no longer have access to messages.`}
        confirmText="Remove Member"
        confirmStyle="danger"
        isLoading={isRemoving}
        onConfirm={handleConfirmRemove}
        onClose={() => setMemberToRemove(null)}
      />
    </>
  );
};

export default ChannelMembersModal;

