import { useEffect, useState, useMemo } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users } from "lucide-react";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, unreadMessages, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [displayedUsers, setDisplayedUsers] = useState([]);
  const USERS_PER_LOAD = 10;

  // ✅ Memoized Sorted & Filtered Users (Prevents Unnecessary Renders)
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aOnline = onlineUsers.includes(a._id) ? -1 : 1;
      const bOnline = onlineUsers.includes(b._id) ? -1 : 1;
      const aUnread = unreadMessages[a._id] || 0;
      const bUnread = unreadMessages[b._id] || 0;
      return aOnline - bOnline || bUnread - aUnread;
    });
  }, [users, onlineUsers, unreadMessages]);

  const filteredUsers = useMemo(() => {
    return showOnlineOnly ? sortedUsers.filter((user) => onlineUsers.includes(user._id)) : sortedUsers;
  }, [sortedUsers, showOnlineOnly]);

  // ✅ Initialize Displayed Users
  useEffect(() => {
    setDisplayedUsers(filteredUsers.slice(0, USERS_PER_LOAD));
  }, [filteredUsers]);

  // ✅ Load More Users Efficiently
  const loadMoreUsers = () => {
    if (displayedUsers.length >= filteredUsers.length) return;
    setIsLoading(true);
    setTimeout(() => {
      setDisplayedUsers((prev) => [...prev, ...filteredUsers.slice(prev.length, prev.length + USERS_PER_LOAD)]);
      setIsLoading(false);
    }, 300);
  };

  // ✅ Set Default Selected User Once (Prevent Infinite Loops)
  useEffect(() => {
    if (!selectedUser && users.length > 0) {
      setSelectedUser(users[0]);
    }
  }, [users, selectedUser, setSelectedUser]);

  if (isUsersLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-medium hidden lg:block">Contacts</span>
        </div>
        {/* ✅ Toggle: Show Only Online Users */}
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
          <span className="text-xs text-zinc-500">({Math.max(onlineUsers.length - 1, 0)} online)</span>
        </div>
      </div>

      <div className="overflow-y-auto w-full py-3">
        {displayedUsers.map((user) => (
          <button
            key={user._id}
            onClick={() => setSelectedUser(user)}
            className={`
              w-full p-3 flex items-center gap-3
              hover:bg-base-300 transition-colors
              ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
            `}
          >
            <div className="relative mx-auto lg:mx-0">
              <img
                src={user.profilePic || "/avatar.png"}
                alt={user.fullName}
                className="size-12 object-cover rounded-full"
              />
              {onlineUsers.includes(user._id) && (
                <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-zinc-900" />
              )}
            </div>

            {/* ✅ User Info & Unread Message Count */}
            <div className="hidden lg:block text-left min-w-0">
              <div className="font-medium truncate flex items-center gap-1">
                {user.fullName}
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
          </button>
        ))}

        {/* ✅ "Load More" Button */}
        {displayedUsers.length < filteredUsers.length && (
          <button
            className="w-full py-3 text-center text-blue-500 hover:underline"
            onClick={loadMoreUsers}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Load More"}
          </button>
        )}

        {filteredUsers.length === 0 && (
          <div className="text-center text-zinc-500 py-4">No online users</div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
