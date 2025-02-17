import { useEffect, useState, useMemo } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users } from "lucide-react";
import { Loader } from "lucide-react"; // Importing Loader for animation

const USERS_PER_LOAD = 100;

const Sidebar = () => {
  const { getUsers, users = [], selectedUser, setSelectedUser, unreadMessages, isUsersLoading } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [displayedUsers, setDisplayedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState(""); // ✅ State for search query
  const [isSearching, setIsSearching] = useState(false); // ✅ State to track if searching

  // ✅ Fetch users once when component mounts
  useEffect(() => {
    getUsers();
  }, [getUsers]);

  // ✅ Debugging users data
  useEffect(() => {
    console.log("📢 Users fetched:", users);
  }, [users]); // Logs whenever `users` is updated

  // ✅ Debugging online users data
  useEffect(() => {
    console.log("📢 Online users updated:", onlineUsers);
  }, [onlineUsers]); // Logs whenever `onlineUsers` is updated

  // ✅ Sorting users: Online users first, then by unread messages count
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aOnline = onlineUsers.includes(a?._id) ? 1 : 0;
      const bOnline = onlineUsers.includes(b?._id) ? 1 : 0;
      const aUnread = unreadMessages[a?._id] || 0;
      const bUnread = unreadMessages[b?._id] || 0;
      return bOnline - aOnline || bUnread - aUnread;
    });
  }, [users, onlineUsers, unreadMessages]);

  // ✅ Filtering users based on search query and "Show online only" toggle
  const filteredUsers = useMemo(() => {
    let filtered = sortedUsers;

    // Apply search query filter
    if (searchQuery) {
      filtered = filtered.filter((user) =>
        user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply online only filter
    if (showOnlineOnly) {
      filtered = filtered.filter((user) => user && user._id && onlineUsers.includes(user._id));
    }

    return filtered;
  }, [sortedUsers, searchQuery, showOnlineOnly, onlineUsers]);

  // ✅ Load more users logic
  const loadMoreUsers = () => {
    setIsLoading(true);
    setTimeout(() => {
      setDisplayedUsers((prev) => [
        ...prev,
        ...filteredUsers.slice(prev.length, prev.length + USERS_PER_LOAD),
      ]);
      setIsLoading(false);
    }, 500);
  };

  // ✅ Handle Search query change
  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
    setIsSearching(true);

    // Simulate a delay for animation (you can adjust the time for a better UX)
    setTimeout(() => {
      setIsSearching(false);
    }, 300); // You can adjust the timeout duration to control the animation delay
  };

  // If users are still loading, show a loading skeleton
  if (isUsersLoading || !users.length) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        <div className="flex items-center gap-2">
          <Users className="size-6" />
          <span className="font-medium hidden lg:block">Contacts</span>
        </div>

        {/* ✅ Search bar */}
        <div className="mt-3">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            className="input input-bordered w-full"
            placeholder="Search by name..."
          />
        </div>

        {/* Show online only filter toggle */}
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
        {/* Show loading animation while searching */}
        {isSearching && (
          <div className="text-center py-4">
            <Loader className="animate-spin mx-auto text-blue-500" />
            <p className="text-zinc-500 mt-2">Searching...</p>
          </div>
        )}

        {/* Display filtered users */}
        {filteredUsers.length > 0 && !isSearching && (
          <>
            {filteredUsers.slice(0, USERS_PER_LOAD).map((user) => (
              <button
                key={user?._id}
                onClick={() => user && setSelectedUser(user)}
                className={`
                  w-full p-3 flex items-center gap-3
                  hover:bg-base-300 transition-colors
                  ${selectedUser?._id === user?._id ? "bg-base-300 ring-1 ring-base-300" : ""}
                `}
              >
                <div className="relative mx-auto lg:mx-0">
                  <img
                    src={user?.profilePic || "/avatar.png"}
                    alt={user?.fullName || "Unknown"}
                    className="size-12 object-cover rounded-full"
                  />
                  {user?._id && onlineUsers.includes(user._id) && (
                    <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-zinc-900" />
                  )}
                </div>

                {/* User info and unread messages count */}
                <div className="hidden lg:block text-left min-w-0">
                  <div className="font-medium truncate flex items-center gap-1">
                    {user?.fullName || "Unknown"}
                    {user?._id && unreadMessages[user._id] > 0 && (
                      <span className="ml-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        {unreadMessages[user._id]}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-zinc-400">
                    {user?._id && onlineUsers.includes(user._id) ? "Online" : "Offline"}
                  </div>
                </div>
              </button>
            ))}
          </>
        )}

        {/* Show message if no users are found */}
        {filteredUsers.length === 0 && !isSearching && (
          <div className="text-center text-zinc-500 py-4">
            {searchQuery
              ? "No users found with that name"
              : showOnlineOnly
              ? "No online users"
              : "No users available"}
          </div>
        )}

        {/* If there are search results and users to load, show "Load More" button */}
        {filteredUsers.length > USERS_PER_LOAD && searchQuery && (
          <button
            className="w-full py-3 text-center text-blue-500 hover:underline"
            onClick={loadMoreUsers}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Load More"}
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
