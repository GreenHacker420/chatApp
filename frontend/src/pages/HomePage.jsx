import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import LanUsers from "../components/LanUsers";
import { User, Wifi } from "lucide-react";
import electronService from "../services/electron.service";

const HomePage = () => {
  const { selectedUser } = useChatStore();
  const { socket } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 640); // ✅ Sidebar open by default on desktop
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showLanUsers, setShowLanUsers] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  // Check if running in Electron
  useEffect(() => {
    setIsElectron(electronService.isElectron);
  }, []);

  // ✅ Update Page Title Dynamically
  useEffect(() => {
    document.title = selectedUser ? `Chat with ${selectedUser.fullName}` : "GutarGu Chat";
  }, [selectedUser]);

  // ✅ Listen for Real-Time Online Status Updates
  useEffect(() => {
    if (!socket) return;

    const handleOnlineUsers = (users) => {
      console.log("🔵 Online users updated:", users);
      setOnlineUsers(users);
    };

    socket.on("getOnlineUsers", handleOnlineUsers);
    return () => socket.off("getOnlineUsers", handleOnlineUsers);
  }, [socket]);

  // ✅ Handle Window Resize for Sidebar Behavior
  useEffect(() => {
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 640);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-base-200">
      <div className="flex items-center justify-center pt-20 px-4">
        <div className="bg-base-100 rounded-lg shadow-lg w-full max-w-6xl h-[calc(100vh-8rem)] flex">
          {/* Sidebar */}
          {isSidebarOpen && <Sidebar onlineUsers={onlineUsers} />}

          {/* Main Content */}
          <div className="flex flex-col flex-1 h-full rounded-lg overflow-hidden">
            {/* Chat or No Chat Selected */}
            <div className="flex-1 overflow-hidden">
              {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
            </div>

            {/* LAN Users Section - Only show when no chat is selected */}
            {!selectedUser && showLanUsers && (
              <div className="p-4 border-t border-base-300">
                <LanUsers onClose={() => setShowLanUsers(false)} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Action Buttons */}
      <div className="fixed bottom-6 left-6 flex gap-3 sm:hidden">
        {/* Sidebar Toggle */}
        <button
          className="btn btn-primary"
          onClick={() => setIsSidebarOpen((prev) => !prev)}
        >
          {isSidebarOpen ? "❌ Close Sidebar" : "📂 Open Sidebar"}
        </button>

        {/* LAN Users Toggle - Only show when no chat is selected */}
        {!selectedUser && (
          <button
            className="btn btn-circle btn-primary"
            onClick={() => setShowLanUsers((prev) => !prev)}
            aria-label="Toggle LAN Users"
          >
            <Wifi className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Profile Button for Mobile */}
      <Link
        to="/profile"
        className="fixed bottom-6 right-6 btn btn-circle btn-primary sm:hidden"
        aria-label="View Profile"
      >
        <User className="w-5 h-5" />
      </Link>

      {/* Desktop LAN Users Button */}
      {!selectedUser && (
        <button
          className="fixed bottom-6 right-20 btn btn-circle btn-primary hidden sm:flex"
          onClick={() => setShowLanUsers((prev) => !prev)}
          aria-label="Toggle LAN Users"
        >
          <Wifi className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default HomePage;
