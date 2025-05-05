import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance, messagesApi, usersApi } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../constants/messages";
import { socket } from "../socket";

export const useChatStore = create((set, get) => ({
  // Message and user data
  messages: [],
  users: [],
  selectedUser: null,
  unreadMessages: {}, // ✅ Tracks unread messages per user
  notifications: [], // ✅ Store message notifications

  // Pagination and loading state
  isUsersLoading: false,
  isMessagesLoading: false,
  hasMoreMessages: true, // ✅ Used for pagination
  currentPage: 1, // ✅ Track the current page of messages

  // Internal tracking objects for debouncing
  _lastFetchTimes: {}, // ✅ Track last fetch time for each user
  _lastMarkTimes: {}, // ✅ Track last mark-as-read time for each user
  _pendingMarkTimeouts: {}, // ✅ Track pending mark-as-read timeouts

  // Group call state
  isGroupCallActive: false,
  activeGroupCall: null,
  groupCallParticipants: [],
  groupCallInvitations: [],

  // Call state
  isCallActive: false,
  activeCall: null,
  isIncomingCall: false,
  incomingCallData: null,
  isMuted: false,
  isVideoOff: false,

  error: null,

  setSelectedUser: (user) => {
    set({ selectedUser: user });
    // Clear notifications for this user when selected
    if (user) {
      get().clearNotifications(user._id);
    }
  },

  getUsers: async () => {
    try {
      set({ isUsersLoading: true, error: null });
      const response = await usersApi.get("/");

      // Sort users: online first, then by last message time
      const sortedUsers = response.data.sort((a, b) => {
        if (a.isOnline !== b.isOnline) {
          return b.isOnline - a.isOnline;
        }
        const aLastMessage = a.lastMessage?.createdAt || 0;
        const bLastMessage = b.lastMessage?.createdAt || 0;
        return new Date(bLastMessage) - new Date(aLastMessage);
      });

      set({ users: sortedUsers, isUsersLoading: false });
    } catch (error) {
      console.error("Error fetching users:", error);
      set({ error: ERROR_MESSAGES.FETCH_USERS, isUsersLoading: false });
      toast.error(ERROR_MESSAGES.FETCH_USERS);
    }
  },

  // ✅ Load messages with pagination and debouncing
  getMessages: async (userId, page = 1) => {
    if (!userId) {
      console.error("getMessages called without userId");
      return;
    }

    // Get the current state
    const self = get();

    // Check if we've fetched messages for this user recently (within 1 second)
    const now = Date.now();
    const lastFetchTime = self._lastFetchTimes[userId] || 0;
    const timeSinceLastFetch = now - lastFetchTime;

    // If we've fetched messages for this user very recently, debounce the request
    if (timeSinceLastFetch < 1000 && page === 1) {
      console.log(`Debouncing message fetch for user ${userId}, last fetch was ${timeSinceLastFetch}ms ago`);
      return; // Skip this fetch
    }

    // Update the last fetch time for this user
    set((state) => ({
      _lastFetchTimes: {
        ...state._lastFetchTimes,
        [userId]: now
      }
    }));

    set({ isMessagesLoading: true });

    try {
      const res = await messagesApi.get(`/${userId}?page=${page}`);
      console.log(`Received ${res.data.messages.length} messages from API, page ${page}`);

      // Process messages in a stable way to prevent flickering
      set((state) => {
        if (page === 1) {
          // For first page, create a stable message list by preserving message objects
          // that already exist in the state to prevent unnecessary re-renders
          const newMessageIds = new Set(res.data.messages.map(msg => msg._id));
          const existingMessages = state.messages.filter(msg => newMessageIds.has(msg._id));

          // Create a map of existing messages for quick lookup
          const existingMessageMap = new Map();
          existingMessages.forEach(msg => existingMessageMap.set(msg._id, msg));

          // Create a stable message list by using existing message objects when possible
          const stableMessages = res.data.messages.map(newMsg =>
            existingMessageMap.has(newMsg._id) ? existingMessageMap.get(newMsg._id) : newMsg
          );

          return {
            messages: stableMessages,
            hasMoreMessages: res.data.messages.length > 0,
            currentPage: page,
          };
        }

        // For pagination, use a more efficient approach to merge messages
        const existingMessageIds = new Set(state.messages.map(msg => msg._id));
        const newMessages = res.data.messages.filter(msg => !existingMessageIds.has(msg._id));

        if (newMessages.length === 0) {
          return {
            hasMoreMessages: false,
            currentPage: page,
          };
        }

        // Create a map of all messages for stable sorting
        const messageMap = new Map();
        state.messages.forEach(msg => messageMap.set(msg._id, msg));
        newMessages.forEach(msg => messageMap.set(msg._id, msg));

        // Convert map to array and sort
        const allMessages = Array.from(messageMap.values());
        allMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        return {
          messages: allMessages,
          hasMoreMessages: newMessages.length > 0,
          currentPage: page,
        };
      });

      // Use a small delay before marking messages as read to prevent rapid socket events
      if (page === 1) {
        setTimeout(() => {
          get().markMessagesAsRead(userId);
        }, 300);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // ✅ Mark messages as read with debouncing
  markMessagesAsRead: async (userId) => {
    if (!userId) return;

    // Get the current state
    const self = get();

    // Check if we've marked messages as read for this user recently (within 1 second)
    const now = Date.now();
    const lastMarkTime = self._lastMarkTimes[userId] || 0;
    const timeSinceLastMark = now - lastMarkTime;

    // Clear any existing timeout for this user
    if (self._pendingMarkTimeouts[userId]) {
      clearTimeout(self._pendingMarkTimeouts[userId]);

      // Update the store to remove the pending timeout
      set((state) => ({
        _pendingMarkTimeouts: {
          ...state._pendingMarkTimeouts,
          [userId]: null
        }
      }));
    }

    // If we've marked messages as read for this user very recently, debounce the request
    if (timeSinceLastMark < 1000) {
      // Schedule a debounced mark-as-read
      const timeoutId = setTimeout(() => {
        // This will run after the debounce period
        set((state) => ({
          _lastMarkTimes: {
            ...state._lastMarkTimes,
            [userId]: Date.now()
          },
          _pendingMarkTimeouts: {
            ...state._pendingMarkTimeouts,
            [userId]: null
          }
        }));

        // Actually mark messages as read
        get()._markMessagesAsRead(userId);
      }, 500);

      // Store the timeout ID
      set((state) => ({
        _pendingMarkTimeouts: {
          ...state._pendingMarkTimeouts,
          [userId]: timeoutId
        }
      }));

      // Update unread count immediately for better UX
      set((state) => ({
        unreadMessages: {
          ...state.unreadMessages,
          [userId]: 0
        },
      }));

      return;
    }

    // Update the last mark time for this user
    set((state) => ({
      _lastMarkTimes: {
        ...state._lastMarkTimes,
        [userId]: now
      }
    }));

    // Actually mark messages as read
    get()._markMessagesAsRead(userId);
  },

  // Private helper function to actually mark messages as read
  _markMessagesAsRead: async (userId) => {
    try {
      // Send the request to mark messages as read
      await messagesApi.post(`/mark-as-read/${userId}`);

      // Update the unread count in the store
      set((state) => ({
        unreadMessages: {
          ...state.unreadMessages,
          [userId]: 0
        },
      }));

      // Update the read status of messages in the store
      set((state) => {
        // Find messages from this user that are unread
        const updatedMessages = state.messages.map(msg => {
          if ((msg.senderId === userId || msg.sender?._id === userId) && !msg.isRead) {
            return { ...msg, isRead: true };
          }
          return msg;
        });

        return { messages: updatedMessages };
      });
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  },

  addNotification: (message, userId) => {
    const { selectedUser } = get();
    // Only add notification if chat is not currently open
    if (!selectedUser || selectedUser._id !== userId) {
      set((state) => ({
        notifications: [...state.notifications, message],
        unreadMessages: {
          ...state.unreadMessages,
          [userId]: (state.unreadMessages[userId] || 0) + 1
        }
      }));
      // Show toast notification
      toast.custom(() => (
        <div className="bg-base-100 shadow-lg rounded-lg p-4 flex items-center gap-3">
          <div className="avatar">
            <div className="w-12 rounded-full">
              <img
                src={message.sender.profilePic || "/avatar.png"}
                alt="sender"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/avatar.png";
                }}
              />
            </div>
          </div>
          <div>
            <p className="font-semibold">{message.sender.fullName || message.sender.username || "User"}</p>
            <p className="text-sm text-base-content/70">{message.content}</p>
          </div>
        </div>
      ));
    }
  },

  clearNotifications: (userId) => {
    set((state) => ({
      notifications: state.notifications.filter(n => n.sender._id !== userId),
      unreadMessages: {
        ...state.unreadMessages,
        [userId]: 0
      }
    }));
  },

  sendMessage: async (content) => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    let tempMessage = null;
    const authUser = useAuthStore.getState().user;
    const socket = useAuthStore.getState().socket;

    try {
      // Create message data - handle both string and object content
      const messageData = {
        content: typeof content === 'string' ? content : content.content || content.text || '',
        receiverId: typeof content === 'string' ? selectedUser._id : (content.receiverId || selectedUser._id)
      };

      // Only add media if it exists
      if (typeof content !== 'string') {
        if (content.image) {
          messageData.image = content.image;
        }
        if (content.video) {
          messageData.video = content.video;
        }
      }

      // Optimistic update with clear sender information
      tempMessage = {
        _id: Date.now().toString(),
        content: messageData.content,
        text: messageData.content, // Keep both for compatibility
        sender: authUser,
        senderId: authUser._id,
        receiverId: messageData.receiverId,
        image: messageData.image || null,
        video: messageData.video || null,
        createdAt: new Date().toISOString(),
        isOptimistic: true,
        isRead: false
      };

      set((state) => ({
        messages: [...state.messages, tempMessage]
      }));

      // Send message using messagesApi
      const response = await messagesApi.post('', messageData);
      const data = response.data;

      // Ensure consistent field names for both directions
      if (data.content && !data.text) {
        data.text = data.content;
      } else if (data.text && !data.content) {
        data.content = data.text;
      }

      // If both fields are missing or null, set them to empty string
      if (!data.content && !data.text) {
        data.content = "";
        data.text = "";
      }

      // Add sender information if not present
      if (!data.sender) {
        data.sender = authUser;
      }
      if (!data.senderId) {
        data.senderId = authUser._id;
      }

      // Replace optimistic message with real one
      set((state) => ({
        messages: state.messages.map(msg =>
          msg._id === tempMessage._id ? data : msg
        )
      }));

      // Update last message in users list
      set((state) => ({
        users: state.users.map(user =>
          user._id === selectedUser._id
            ? { ...user, lastMessage: data }
            : user
        )
      }));

      // Emit socket event for real-time message
      if (socket && socket.connected) {
        socket.emit("sendMessage", {
          senderId: authUser._id,
          receiverId: selectedUser._id,
          message: data
        });
      }

      return data;
    } catch (error) {
      console.error("Failed to send message:", error);
      // Remove optimistic message on error
      if (tempMessage) {
        set((state) => ({
          messages: state.messages.filter(msg => msg._id !== tempMessage._id)
        }));
      }
      toast.error(ERROR_MESSAGES.SEND_MESSAGE);
      throw error;
    }
  },

  // ✅ Delete a message
  deleteMessage: async (messageId, deleteForEveryone = false) => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    try {
      await messagesApi.delete(`/${messageId}`, {
        data: { deleteForEveryone }
      });

      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== messageId),
      }));

      if (socket) {
        socket.emit("deleteMessage", { messageId, receiverId: selectedUser._id, deleteForEveryone });
      }

      toast.success(deleteForEveryone ? SUCCESS_MESSAGES.MESSAGE_DELETED_EVERYONE : SUCCESS_MESSAGES.MESSAGE_DELETED);
    } catch (error) {
      toast.error(error.response?.data?.message || ERROR_MESSAGES.DEFAULT);
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) {
      console.warn("Socket not available for message subscription");
      return () => {};
    }

    // Create a debounced message update function to prevent rapid UI updates
    let pendingMessages = [];
    let updateTimeout = null;

    const processPendingMessages = () => {
      if (pendingMessages.length === 0) return;

      const { selectedUser } = get();
      // We don't need authUserId here since we're just processing messages
      // that are already determined to be relevant to the current chat

      // Process all pending messages at once
      const uniqueMessages = [];
      const messageIds = new Set();

      // First, deduplicate the pending messages
      pendingMessages.forEach(message => {
        if (!messageIds.has(message._id)) {
          messageIds.add(message._id);
          uniqueMessages.push(message);
        }
      });

      // Clear pending messages
      pendingMessages = [];

      // Now update the state once with all unique messages
      set((state) => {
        // Get existing message IDs to prevent duplicates
        const existingMessageIds = new Set(state.messages.map(msg => msg._id));

        // Filter out messages that already exist in the state
        const newMessages = uniqueMessages.filter(msg => !existingMessageIds.has(msg._id));

        if (newMessages.length === 0) {
          return state; // No changes needed
        }

        // Find messages that need to be marked as read
        const messagesToMarkAsRead = newMessages.filter(message => {
          const senderId = message.sender?._id || message.senderId;
          return selectedUser &&
                 (senderId === selectedUser._id) &&
                 !message.isRead;
        });

        // If we have messages to mark as read, do it in a single operation
        if (messagesToMarkAsRead.length > 0 && selectedUser) {
          // Use setTimeout to avoid blocking the UI update
          setTimeout(() => {
            get().markMessagesAsRead(selectedUser._id);
          }, 300);
        }

        // Update the messages state with all new messages at once
        return {
          messages: [...state.messages, ...newMessages].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          )
        };
      });

      // Update last message in users list (once for all messages)
      set((state) => {
        const updatedUsers = [...state.users];
        let hasChanges = false;

        uniqueMessages.forEach(message => {
          const senderId = message.sender?._id || message.senderId;
          const receiverId = message.receiverId;

          // Find users that need to be updated
          for (let i = 0; i < updatedUsers.length; i++) {
            if (updatedUsers[i]._id === senderId || updatedUsers[i]._id === receiverId) {
              // Only update if this message is newer than the current lastMessage
              const currentLastMessage = updatedUsers[i].lastMessage;
              if (!currentLastMessage ||
                  new Date(message.createdAt) > new Date(currentLastMessage.createdAt)) {
                updatedUsers[i] = { ...updatedUsers[i], lastMessage: message };
                hasChanges = true;
              }
            }
          }
        });

        return hasChanges ? { users: updatedUsers } : state;
      });
    };

    // Debounced function to process messages
    const debouncedProcessMessages = () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      updateTimeout = setTimeout(processPendingMessages, 300); // 300ms debounce
    };

    const handleNewMessage = (data) => {
      const message = data.message || data;
      const { selectedUser } = get();
      const authUserId = useAuthStore.getState().user?._id;

      // Normalize message format
      if (message.content && !message.text) {
        message.text = message.content;
      } else if (message.text && !message.content) {
        message.content = message.text;
      }

      // If both fields are missing or null, set them to empty string
      if (!message.content && !message.text) {
        message.content = "";
        message.text = "";
      }

      // Ensure we have sender information
      if (!message.sender && message.senderId) {
        const senderUser = get().users.find(u => u._id === message.senderId);
        if (senderUser) {
          message.sender = {
            _id: senderUser._id,
            fullName: senderUser.fullName || "User",
            profilePic: senderUser.profilePic || "/avatar.png"
          };
        } else {
          // Create a default sender object if we can't find the user
          message.sender = {
            _id: message.senderId,
            fullName: "User",
            profilePic: "/avatar.png"
          };
        }
      }

      // Ensure sender object has all required fields
      if (message.sender && typeof message.sender === 'object') {
        if (!message.sender.fullName) message.sender.fullName = "User";
        if (!message.sender.profilePic ||
            message.sender.profilePic === "" ||
            message.sender.profilePic.includes("Default_ProfilePic.png")) {
          message.sender.profilePic = "/avatar.png";
        }
      }

      // Check if this message is relevant to the current chat
      const isRelevantToCurrentChat = selectedUser && (
        // If we're chatting with the sender of this message
        (message.sender?._id === selectedUser._id || message.senderId === selectedUser._id) ||
        // Or if we're chatting with the receiver and we sent this message
        (message.receiverId === selectedUser._id &&
         (message.sender?._id === authUserId || message.senderId === authUserId))
      );

      if (isRelevantToCurrentChat) {
        // Add to pending messages for batch processing
        pendingMessages.push(message);
        debouncedProcessMessages();
      } else {
        // Add notification if chat is not open
        const senderId = message.sender?._id || message.senderId;
        if (senderId && senderId !== authUserId) {
          get().addNotification(message, senderId);
        }
      }
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
    };
  },

  // ✅ Handles infinite scrolling (load more messages)
  loadMoreMessages: async () => {
    const { selectedUser, currentPage, hasMoreMessages } = get();
    if (!selectedUser || !hasMoreMessages) return;

    await get().getMessages(selectedUser._id, currentPage + 1);
  },

  // Start group call
  startGroupCall: (groupId, groupName) => {
    set({
      isGroupCallActive: true,
      activeGroupCall: { groupId, groupName }
    });
  },

  // End group call
  endGroupCall: () => {
    set({
      isGroupCallActive: false,
      activeGroupCall: null
    });
  },

  // ✅ Start a call
  startCall: async (userId, isVideo = false, isUserOnline = false) => {
    const socket = useAuthStore.getState().socket;
    const authUser = useAuthStore.getState().authUser;
    const { activeCall } = get();

    if (activeCall) {
      toast.error("You're already in a call");
      return;
    }

    if (!socket) {
      toast.error(ERROR_MESSAGES.SOCKET_CONNECTION);
      return;
    }

    try {
      // Find user details
      const user = get().users.find(u => u._id === userId);
      const userName = user ? user.fullName : "User";

      set({
        isCallActive: true,
        activeCall: {
          userId,
          userName,
          isVideo,
          isOutgoing: true,
          isReceiverOnline: isUserOnline,
          startTime: Date.now(),
          connectedAt: null
        }
      });

      if (isUserOnline) {
        socket.emit("initiateCall", {
          callerId: authUser._id,
          callerName: authUser.fullName,
          receiverId: userId,
          isVideo
        });
        toast.success(SUCCESS_MESSAGES.CALL_INITIATED);
      } else {
        // Use toast.success instead of toast.info which might not be available
        toast.success(SUCCESS_MESSAGES.USER_OFFLINE);
      }
    } catch (error) {
      console.error("Error starting call:", error);
      toast.error(ERROR_MESSAGES.MEDIA_ACCESS);
      set({
        isCallActive: false,
        activeCall: null
      });
    }
  },

  // ✅ Handle incoming call
  handleIncomingCall: (callData) => {
    const { activeCall, isCallActive } = get();
    const socket = useAuthStore.getState().socket;

    // Prevent handling new calls if already in a call
    if (activeCall || isCallActive) {
      if (socket) {
        socket.emit("rejectCall", {
          callerId: callData.callerId,
          receiverId: useAuthStore.getState().authUser._id,
          reason: "busy"
        });
      } else {
        console.warn("⚠️ Socket not available for rejecting call");
      }
      return;
    }

    set({
      isIncomingCall: true,
      incomingCallData: {
        ...callData,
        receivedAt: Date.now() // Add timestamp for call notification
      }
    });
  },

  // ✅ Accept call
  acceptCall: async () => {
    const { incomingCallData, activeCall } = get();
    const socket = useAuthStore.getState().socket;

    if (!incomingCallData || !socket || activeCall) {
      if (!socket) {
        console.warn("⚠️ Socket not available for accepting call");
        toast.error("Unable to accept call. Connection issue.");
      }
      return;
    }

    try {
      const now = Date.now();

      // Set call state before emitting to prevent flickering
      set({
        isCallActive: true,
        activeCall: {
          userId: incomingCallData.callerId,
          userName: incomingCallData.callerName,
          isVideo: incomingCallData.isVideo,
          isOutgoing: false,
          startTime: now,
          connectedAt: now // Set connected time when call is accepted
        },
        isIncomingCall: false,
        incomingCallData: null
      });

      socket.emit("acceptCall", {
        callerId: incomingCallData.callerId,
        receiverId: useAuthStore.getState().authUser._id
      });

      toast.success(`Connected to ${incomingCallData.callerName}`);
    } catch (error) {
      console.error("Error accepting call:", error);
      toast.error("Failed to accept call");
      set({
        isIncomingCall: false,
        incomingCallData: null
      });
    }
  },

  // ✅ End call with debounce
  endCall: (() => {
    let endCallTimeout;

    return () => {
      const { activeCall } = get();
      const socket = useAuthStore.getState().socket;
      const user = useAuthStore.getState().user;

      if (!activeCall) return;

      // Clear any pending end call timeout
      if (endCallTimeout) {
        clearTimeout(endCallTimeout);
      }

      // Emit end call event if socket is available
      if (socket && socket.connected && user) {
        try {
          console.log("Emitting endCall event:", {
            userId: user._id,
            remoteUserId: activeCall.userId
          });

          socket.emit("endCall", {
            userId: user._id,
            remoteUserId: activeCall.userId
          });
        } catch (error) {
          console.error("Error emitting endCall event:", error);
        }
      } else {
        console.warn("⚠️ Socket not available for ending call", {
          socketExists: !!socket,
          socketConnected: socket?.connected,
          userExists: !!user
        });
      }

      // Reset call state
      set({
        isCallActive: false,
        activeCall: null,
        isMuted: false,
        isVideoOff: false
      });

      toast.success(SUCCESS_MESSAGES.CALL_ENDED);
    };
  })(),

  // ✅ Reject call
  rejectCall: () => {
    const { incomingCallData } = get();
    const socket = useAuthStore.getState().socket;

    if (!incomingCallData) return;

    // Emit reject call event if socket is available
    if (socket) {
      socket.emit("rejectCall", {
        callerId: incomingCallData.callerId,
        receiverId: useAuthStore.getState().authUser._id,
        reason: "rejected"
      });
    } else {
      console.warn("⚠️ Socket not available for rejecting call");
    }

    // Clear incoming call state
    set({
      isIncomingCall: false,
      incomingCallData: null
    });
  },

  addGroupCallParticipant: (participant) => {
    set((state) => ({
      groupCallParticipants: [...state.groupCallParticipants, participant],
    }));
  },

  removeGroupCallParticipant: (participantId) => {
    set((state) => ({
      groupCallParticipants: state.groupCallParticipants.filter(
        (p) => p._id !== participantId
      ),
    }));
  },

  handleGroupCallInvitation: (invitation) => {
    set((state) => ({
      groupCallInvitations: [...state.groupCallInvitations, invitation],
    }));
  },

  acceptGroupCallInvitation: (invitationId) => {
    const invitation = get().groupCallInvitations.find(
      (inv) => inv.id === invitationId
    );
    if (!invitation) return;

    set((state) => ({
      groupCallInvitations: state.groupCallInvitations.filter(
        (inv) => inv.id !== invitationId
      ),
      activeCall: {
        ...invitation,
        isGroupCall: true,
      },
    }));
  },

  rejectGroupCallInvitation: (invitationId) => {
    set((state) => ({
      groupCallInvitations: state.groupCallInvitations.filter(
        (inv) => inv.id !== invitationId
      ),
    }));
  },

  // ✅ Toggle audio mute state
  toggleMute: (isMuted) => {
    console.log("Toggling mute state to:", isMuted);
    set({ isMuted });
  },

  // ✅ Toggle video state
  toggleVideo: (isVideoOff) => {
    console.log("Toggling video state to:", isVideoOff);
    set({ isVideoOff });
  },
}));
