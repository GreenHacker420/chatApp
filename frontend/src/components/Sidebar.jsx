import { useEffect, useState, useMemo } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, Loader, User, MessageSquare, MoreVertical } from "lucide-react";

const Sidebar = () => {
  const { getUsers, users = [], selectedUser, setSelectedUser, unreadMessages, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const navigate = useNavigate();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);

  // Fetch users once when component mounts
  useEffect(() => {
    getUsers();
  }, [getUsers]);

  // Sorting users: Online users first, then by unread messages count
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aOnline = onlineUsers.includes(a?._id) ? 1 : 0;
      const bOnline = onlineUsers.includes(b?._id) ? 1 : 0;
      const aUnread = unreadMessages[a?._id] || 0;
      const bUnread = unreadMessages[b?._id] || 0;
      return bOnline - aOnline || bUnread - aUnread;
    });
  }, [users, onlineUsers, unreadMessages]);

  // Filtering users based on search query and "Show online only" toggle
  const filteredUsers = useMemo(() => {
    let filtered = sortedUsers;

    if (searchQuery) {
      filtered = filtered.filter((user) =>
        user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (showOnlineOnly) {
      filtered = filtered.filter((user) => onlineUsers.includes(user._id));
    }

    return filtered;
  }, [sortedUsers, searchQuery, showOnlineOnly, onlineUsers]);

  // Handle Search query change
  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 300);
  };

  if (isUsersLoading || !users.length) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-medium hidden lg:block">Contacts</span>
        </div>
        <div className="mt-3">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            className="input input-bordered w-full"
            placeholder="Search by name..."
          />
        </div>
        <div className="mt-3 hidden lg:flex items-center gap-2">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-sm">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500">({onlineUsers.length} online)</span>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-3">
        {isSearching && (
          <div className="text-center py-4">
            <Loader className="animate-spin mx-auto text-blue-500" />
            <p className="text-zinc-500 mt-2">Searching...</p>
          </div>
        )}

        {filteredUsers.length > 0 && !isSearching && (
          filteredUsers.map((user) => (
            <div key={user?._id} className="relative">
              <button
                onClick={() => setSelectedUser(user)}
                className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors
                  ${selectedUser?._id === user?._id ? "bg-base-300 ring-1 ring-base-300" : ""}`}
              >
                <div className="relative mx-auto lg:mx-0">
                  <img
                    src={user?.profilePic && !user.profilePic.includes("Default_ProfilePic.png")
                      ? user.profilePic
                      : import.meta.env.MODE === 'development'
                        ? "/avatar.png"
                        : `${window.location.origin}/avatar.png`}
                    alt={user?.fullName || "Unknown"}
                    className="size-12 object-cover rounded-full"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = import.meta.env.MODE === 'development'
                        ? "/avatar.png"
                        : `${window.location.origin}/avatar.png`;
                    }}
                  />
                  {onlineUsers.includes(user._id) && (
                    <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-zinc-900" />
                  )}
                </div>
                <div className="hidden lg:block text-left min-w-0 flex-1">
                  <div className="font-medium truncate flex items-center gap-1">
                    {user?.fullName || "Unknown"}
                    {unreadMessages[user._id] > 0 && (
                      <span className="ml-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {unreadMessages[user._id]}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-zinc-400">
                    {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                  </div>
                </div>
                <div
                  className="hidden lg:block cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(activeMenu === user._id ? null : user._id);
                  }}
                >
                  <MoreVertical className="w-5 h-5 text-gray-500" />
                </div>
              </button>

              {/* User action menu */}
              {activeMenu === user._id && (
                <div className="absolute right-2 top-16 bg-base-100 shadow-lg rounded-lg border border-base-300 p-2 z-10 w-40">
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-base-200 rounded-lg transition flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${user._id}`);
                      setActiveMenu(null);
                    }}
                  >
                    <User className="w-4 h-4" />
                    View Profile
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-base-200 rounded-lg transition flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedUser(user);
                      setActiveMenu(null);
                    }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Message
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {filteredUsers.length === 0 && !isSearching && (
          <div className="text-center text-zinc-500 py-4">
            {searchQuery ? "No users found with that name" : showOnlineOnly ? "No online users" : "No users available"}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;