import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser } = useChatStore();
  const { socket } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // ✅ Responsive sidebar

  // ✅ Update Page Title Dynamically
  useEffect(() => {
    document.title = selectedUser ? `Chat with ${selectedUser.fullName}` : "Chat App";
  }, [selectedUser]);

  // ✅ Listen for Real-Time Online Status Updates
  useEffect(() => {
    if (!socket) return;

    socket.on("getOnlineUsers", (onlineUsers) => {
      console.log("🔵 Online users updated:", onlineUsers);
      // ✅ Optionally update UI with online status
    });

    return () => socket.off("getOnlineUsers");
  }, [socket]);

  return (
    <div className="min-h-screen bg-base-200">
      <div className="flex items-center justify-center pt-20 px-4">
        <div className="bg-base-100 rounded-lg shadow-lg w-full max-w-6xl h-[calc(100vh-8rem)] flex">
          {/* ✅ Sidebar Toggle for Mobile */}
          {isSidebarOpen && <Sidebar />}
          
          <div className="flex flex-1 h-full rounded-lg overflow-hidden">
            {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
          </div>
        </div>
      </div>

      {/* ✅ Mobile Sidebar Toggle Button */}
      <button
        className="fixed bottom-6 left-6 btn btn-primary sm:hidden"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
      </button>
    </div>
  );
};

export default HomePage;
