import { X, Circle, Phone, Video, User } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useNavigate } from "react-router-dom";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, startCall } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const navigate = useNavigate();

  if (!selectedUser) return null;

  const isOnline = onlineUsers.includes(selectedUser._id);

  const handleAudioCall = () => {
    startCall(selectedUser._id, false, isOnline);
  };

  const handleVideoCall = () => {
    startCall(selectedUser._id, true, isOnline);
  };

  return (
    <div className="p-3 border-b border-base-300 bg-base-100 animate-fadeIn">
      <div className="flex items-center justify-between">
        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="avatar relative">
            <div className="size-10 rounded-full">
              <img
                src={selectedUser.profilePic || "/avatar.png"}
                alt={selectedUser.fullName}
                className="object-cover w-full h-full rounded-full"
              />
            </div>
            {isOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-white"></span>
            )}
          </div>

          <div>
            <h3 className="font-medium">{selectedUser.fullName}</h3>
            <p className="text-sm text-base-content/70 flex items-center gap-1">
              <Circle
                className={`w-3 h-3 ${isOnline ? "text-green-500" : "text-gray-400"}`}
                fill={isOnline ? "currentColor" : "none"}
              />
              {isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>

        {/* Call Options */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/profile/${selectedUser._id}`)}
            className="btn btn-circle btn-sm btn-ghost"
            title="View Profile"
          >
            <User className="w-4 h-4" />
          </button>
          <button
            onClick={handleAudioCall}
            className="btn btn-circle btn-sm btn-ghost"
            title={`Audio Call${!isOnline ? ' (User Offline)' : ''}`}
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            onClick={handleVideoCall}
            className="btn btn-circle btn-sm btn-ghost"
            title={`Video Call${!isOnline ? ' (User Offline)' : ''}`}
          >
            <Video className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSelectedUser(null)}
            className="btn btn-sm btn-ghost hover:bg-base-200 transition-all"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;

