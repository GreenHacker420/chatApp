import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import { User } from "lucide-react";

const HomePage = () => {
  const { selectedUser } = useChatStore();
  const { socket } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 640); // ✅ Sidebar open by default on desktop
  const [onlineUsers, setOnlineUsers] = useState([]);

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
          {/* ✅ Sidebar Toggle for Mobile */}
          {isSidebarOpen && <Sidebar onlineUsers={onlineUsers} />}

          <div className="flex flex-1 h-full rounded-lg overflow-hidden">
            {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
          </div>
        </div>
      </div>

      {/* ✅ Mobile Sidebar Toggle Button */}
      <button
        className="fixed bottom-6 left-6 btn btn-primary sm:hidden"
        onClick={() => setIsSidebarOpen((prev) => !prev)}
      >
        {isSidebarOpen ? "❌ Close Sidebar" : "📂 Open Sidebar"}
      </button>

      {/* Profile Button for Mobile */}
      <Link
        to="/profile"
        className="fixed bottom-6 right-6 btn btn-circle btn-primary sm:hidden"
        aria-label="View Profile"
      >
        <User className="w-5 h-5" />
      </Link>
    </div>
  );
};

export default HomePage;
