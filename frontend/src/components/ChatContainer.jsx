import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    markMessagesAsRead, // ✅ New function to mark messages as read
  } = useChatStore();
  const { authUser, socket } = useAuthStore();
  const messageEndRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!selectedUser?._id) return;

    getMessages(selectedUser._id); // ✅ Load messages when chat is opened
    subscribeToMessages(); // ✅ Start listening to new messages

    // ✅ Mark messages as read when opening chat
    markMessagesAsRead(selectedUser._id);
  }, [selectedUser?._id]);

  // ✅ Scroll to latest message when messages update
  useEffect(() => {
    if (!messages.length) return;
    setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [messages]);

  // ✅ Listen for "typing" event from backend
  useEffect(() => {
    if (!socket || !selectedUser) return;

    socket.on("typing", ({ senderId }) => {
      if (senderId === selectedUser._id) {
        setIsTyping(true);
      }
    });

    socket.on("stopTyping", ({ senderId }) => {
      if (senderId === selectedUser._id) {
        setIsTyping(false);
      }
    });

    return () => {
      socket.off("typing");
      socket.off("stopTyping");
    };
  }, [socket, selectedUser]);

  // ✅ Listen for "messagesRead" event from backend
  useEffect(() => {
    if (!socket || !selectedUser) return;

    socket.on("messagesRead", ({ senderId, receiverId }) => {
      if (receiverId === authUser._id) {
        getMessages(selectedUser._id); // ✅ Refresh messages to update read status
      }
    });

    return () => socket.off("messagesRead");
  }, [socket, selectedUser, authUser]);

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
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>

            <div className="chat-header mb-1 flex justify-between w-full">
              <span className="text-xs opacity-50">{formatMessageTime(message.createdAt)}</span>
              {/* ✅ Show read status */}
              {message.senderId === authUser._id && message.isRead && (
                <span className="text-xs text-green-500">✔ Read</span>
              )}
            </div>

            <div className="chat-bubble flex flex-col">
              {message.image && (
                <img
                  src={message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2"
                />
              )}
              {message.text && <p>{message.text}</p>}
            </div>
          </div>
        ))}

        {/* ✅ Typing Indicator */}
        {isTyping && (
          <div className="text-sm text-gray-500 italic">{selectedUser?.fullName} is typing...</div>
        )}

        <div ref={messageEndRef} /> {/* ✅ Scroll anchor */}
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
