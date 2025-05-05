import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { MoreVertical, Trash2, Phone } from "lucide-react";
import toast from "react-hot-toast";
import GroupCall from "./GroupCall";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    selectedGroup,
    subscribeToMessages,
    markMessagesAsRead,
    deleteMessage,
    isGroupCallActive,
    activeGroupCall,
    startGroupCall,
    endGroupCall,
  } = useChatStore();

  const { user: authUser, socket } = useAuthStore();
  const messageEndRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);

  // ✅ Load messages and subscribe to real-time updates
  useEffect(() => {
    if (!selectedUser?._id) return;

    getMessages(selectedUser._id);
    const unsubscribe = subscribeToMessages();

    // Handle incoming messages
    if (socket) {
      const handleNewMessage = (data) => {
        const { senderId, message } = data;
        if (senderId === selectedUser._id) {
          set((state) => ({
            messages: [...state.messages, message]
          }));
          markMessagesAsRead(selectedUser._id);
        }
      };

      socket.on("newMessage", handleNewMessage);
      return () => {
        socket.off("newMessage", handleNewMessage);
        unsubscribe();
      };
    }

    return () => {
      if (socket) {
        socket.off("typing");
        socket.off("stopTyping");
        socket.off("messagesRead");
      }
    };
  }, [selectedUser?._id]);

  // ✅ Auto-scroll to latest message
  useEffect(() => {
    if (!messages.length) return;
    setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [messages]);

  // ✅ Handle "typing" events
  useEffect(() => {
    if (!socket || !selectedUser) return;

    const handleTyping = ({ senderId }) => {
      if (senderId === selectedUser._id) setIsTyping(true);
    };

    const handleStopTyping = ({ senderId }) => {
      if (senderId === selectedUser._id) setIsTyping(false);
    };

    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);

    return () => {
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
    };
  }, [socket, selectedUser]);

  // ✅ Handle "messagesRead" event
  useEffect(() => {
    if (!socket || !selectedUser || !authUser) return;

    const handleMessagesRead = ({ senderId, receiverId }) => {
      if (receiverId === authUser._id && senderId === selectedUser._id) {
        getMessages(selectedUser._id); // Refresh messages
      }
    };

    socket.on("messagesRead", handleMessagesRead);

    return () => socket.off("messagesRead", handleMessagesRead);
  }, [socket, selectedUser, authUser]);

  // ✅ Handle message deletion
  const handleDeleteMessage = async (messageId, deleteForEveryone = false) => {
    if (window.confirm(deleteForEveryone
      ? "Are you sure you want to delete this message for everyone?"
      : "Are you sure you want to delete this message for yourself?")) {
      await deleteMessage(messageId, deleteForEveryone);
      setSelectedMessage(null);
    }
  };

  const handleStartGroupCall = () => {
    if (selectedGroup) {
      startGroupCall(selectedGroup._id, selectedGroup.name);
    }
  };

  if (!selectedUser || !authUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-base-content/70">Select a user to start chatting</p>
      </div>
    );
  }

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader>
        {selectedGroup && (
          <button
            onClick={handleStartGroupCall}
            className="btn btn-circle btn-primary btn-sm"
          >
            <Phone size={16} />
          </button>
        )}
      </ChatHeader>

      {isGroupCallActive && activeGroupCall && (
        <GroupCall
          groupId={activeGroupCall.groupId}
          groupName={activeGroupCall.groupName}
          onEndCall={endGroupCall}
        />
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          // Check if the message was sent by the current user
          const isSentByMe =
            (message.sender?._id === authUser._id) ||
            (message.senderId === authUser._id) ||
            (message.senderId && message.senderId.toString() === authUser._id.toString());

          // Use the correct profile picture based on who sent the message
          const senderProfilePic = isSentByMe
            ? authUser.profilePic || "/avatar.png"
            : selectedUser.profilePic || "/avatar.png";

          return (
            <div
              key={message._id}
              className={`chat ${isSentByMe ? "chat-end" : "chat-start"}`}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img src={senderProfilePic} alt="profile pic" />
                </div>
              </div>

              <div className="chat-header mb-1 flex justify-between w-full">
                <span className="text-xs opacity-50">{formatMessageTime(message.createdAt)}</span>
                {isSentByMe && message.isRead && (
                  <span className="text-xs text-green-500">✔ Read</span>
                )}
              </div>

              <div className="chat-bubble flex flex-col relative group">
                {isSentByMe && (
                  <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="dropdown dropdown-end">
                      <label tabIndex={0} className="btn btn-xs btn-circle btn-ghost">
                        <MoreVertical size={14} />
                      </label>
                      <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-24">
                        <li>
                          <button
                            onClick={() => handleDeleteMessage(message._id, false)}
                            className="text-error flex items-center gap-1"
                          >
                            <Trash2 size={14} />
                            Delete for me
                          </button>
                        </li>
                        <li>
                          <button
                            onClick={() => handleDeleteMessage(message._id, true)}
                            className="text-error flex items-center gap-1"
                          >
                            <Trash2 size={14} />
                            Delete for everyone
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {message.text}
                {message.image && (
                  <img
                    src={message.image}
                    alt="Message attachment"
                    className="max-w-xs rounded-lg mt-2"
                  />
                )}
                {message.video && (
                  <video
                    src={message.video}
                    controls
                    className="max-w-xs rounded-lg mt-2"
                  />
                )}
              </div>
            </div>
          );
        })}
        <div ref={messageEndRef} />
      </div>

      <MessageInput isTyping={isTyping} />
    </div>
  );
};

export default ChatContainer;
