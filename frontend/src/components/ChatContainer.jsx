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
import MessageStatus from "./MessageStatus";

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

  // Track if this is the first load for this user
  const isFirstLoadRef = useRef({});

  // ✅ Load messages and subscribe to real-time updates with debouncing
  useEffect(() => {
    if (!selectedUser?._id) return;

    console.log("Loading messages for user:", selectedUser._id);

    // Check if this is the first load for this specific user
    const isFirstLoad = !isFirstLoadRef.current[selectedUser._id];

    // Add a small delay before loading messages to prevent rapid loading
    // when switching between chats quickly
    const loadMessagesTimeout = setTimeout(() => {
      getMessages(selectedUser._id);
      // Mark this user as loaded
      isFirstLoadRef.current[selectedUser._id] = true;
    }, isFirstLoad ? 0 : 300); // No delay on first load, 300ms on subsequent loads

    const unsubscribe = subscribeToMessages();

    // Debug socket connection
    if (socket) {
      console.log("Socket connected:", socket.connected);
    } else {
      console.log("Socket not available in ChatContainer");
    }

    return () => {
      // Clear the timeout if the component unmounts before it fires
      clearTimeout(loadMessagesTimeout);

      if (socket) {
        socket.off("typing");
        socket.off("stopTyping");
        socket.off("messagesRead");
      }
      unsubscribe();
    };
  }, [selectedUser?._id]);

  // Create a ref for the scroll timeout outside the effect
  const scrollTimeoutRef = useRef(null);

  // ✅ Auto-scroll to latest message with debouncing
  useEffect(() => {
    if (!messages.length) return;

    // Clear any existing timeout to prevent multiple scrolls
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set a new timeout with a small delay to allow the DOM to update
    scrollTimeoutRef.current = setTimeout(() => {
      // Scroll to the message end reference
      messageEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end"
      });
      scrollTimeoutRef.current = null;
    }, 200);

    // Clean up on unmount
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
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
      console.log(`Received messagesRead event: sender=${senderId}, receiver=${receiverId}`);

      // If we're the sender and the receiver is the selected user
      if (senderId === authUser._id && receiverId === selectedUser._id) {
        console.log("Updating message read status in UI");

        // Update message read status directly in the store
        useChatStore.setState((state) => {
          const updatedMessages = state.messages.map(msg => {
            // If this is our message to the selected user and it's not marked as read
            if (
              (msg.senderId === authUser._id || msg.sender?._id === authUser._id) &&
              (msg.receiverId === selectedUser._id) &&
              !msg.isRead
            ) {
              return { ...msg, isRead: true };
            }
            return msg;
          });

          return { messages: updatedMessages };
        });
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
    <div className="flex-1 flex flex-col h-full relative">
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-2">
        {/* Display messages in chronological order (oldest first) */}
        {[...messages].slice().reverse().map((message) => {
          // Check if the message was sent by the current user
          const isSentByMe =
            // Check if sender object exists and matches current user
            (message.sender?._id === authUser._id) ||
            // Check if senderId is a string and matches current user
            (typeof message.senderId === 'string' && message.senderId === authUser._id) ||
            // Check if senderId is an object with _id that matches current user
            (message.senderId?._id && message.senderId._id.toString() === authUser._id.toString());

          console.log(`Message ${message._id} - Sent by me: ${isSentByMe}`, {
            messageId: message._id,
            senderId: typeof message.senderId === 'object' ? message.senderId?._id : message.senderId,
            authUserId: authUser._id,
            content: message.content || message.text
          });

          // Use the correct profile picture based on who sent the message with proper null checks
          const defaultAvatar = "/avatar.png"; // Default local avatar
          let profilePic = isSentByMe
            ? authUser?.profilePic
            : (selectedUser?.profilePic || message.sender?.profilePic);

          // Check for invalid or missing profile pic
          if (!profilePic || profilePic === "" || profilePic.includes("Default_ProfilePic.png")) {
            profilePic = defaultAvatar;
          }

          const senderProfilePic = profilePic;

          return (
            <div
              key={message._id}
              className={`chat ${isSentByMe ? "chat-end" : "chat-start"}`}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={senderProfilePic}
                    alt="profile pic"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/avatar.png";
                    }}
                  />
                </div>
              </div>

              <div className="chat-header mb-1 flex justify-between w-full">
                <span className="text-xs opacity-50">{formatMessageTime(message.createdAt)}</span>
                {isSentByMe && (
                  <div className="flex items-center gap-1">
                    <MessageStatus
                      status={message.isRead ? 'read' : (message.status || 'sent')}
                      isLanMessage={message.isLanMessage || selectedUser.isLanUser}
                    />
                  </div>
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

                <div className="whitespace-pre-wrap break-words">
                  {message.content || message.text || ""}
                </div>
                {message.image && (
                  <img
                    src={message.image}
                    alt="Message attachment"
                    className="max-w-xs rounded-lg mt-2"
                    loading="lazy"
                  />
                )}
                {message.video && (
                  <video
                    src={message.video}
                    controls
                    className="max-w-xs rounded-lg mt-2"
                    preload="metadata"
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
