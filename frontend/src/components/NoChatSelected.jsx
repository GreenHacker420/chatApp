import { MessageSquare, Users } from "lucide-react";
import { useChatStore } from "../store/useChatStore";

const NoChatSelected = () => {
  const { openNewChatModal } = useChatStore(); // ✅ Function to start a new chat

  return (
    <div className="w-full flex flex-1 flex-col items-center justify-center p-10 sm:p-16 bg-base-100/50 animate-fadeIn">
      <div className="max-w-md text-center space-y-6">
        {/* ✅ Animated Icon */}
        <div className="flex justify-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center 
            justify-center animate-bounce shadow-lg"
          >
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* ✅ Welcome Message */}
        <h2 className="text-2xl font-bold">Welcome to GutarGu!</h2>
        <p className="text-base-content/60">
          Select a conversation from the sidebar or start a new one.
        </p>

        {/* ✅ Call-to-Action Button */}
        {/* <button
          onClick={openNewChatModal}
          className="btn btn-primary flex items-center gap-2 mt-4"
        >
          <Users className="w-5 h-5" />
          Start a New Chat
        </button> */}
      </div>
    </div>
  );
};

export default NoChatSelected;
