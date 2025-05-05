import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance, messagesApi, usersApi } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../constants/messages";
import { socket } from "../socket";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  unreadMessages: {}, // ✅ Tracks unread messages per user
  isUsersLoading: false,
  isMessagesLoading: false,
  hasMoreMessages: true, // ✅ Used for pagination
  currentPage: 1, // ✅ Track the current page of messages
  notifications: [], // ✅ Store message notifications

  // Group call state
  isGroupCallActive: false,
  activeGroupCall: null,

  // Call state
  isCallActive: false,
  activeCall: null,
  isIncomingCall: false,
  incomingCallData: null,

  groupCallParticipants: [],
  groupCallInvitations: [],

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

  // ✅ Load messages with pagination
  getMessages: async (userId, page = 1) => {
    set({ isMessagesLoading: true });

    try {
      const res = await messagesApi.get(`/${userId}?page=${page}`);

      set((state) => {
        if (page === 1) {
          return {
            messages: res.data.messages,
            hasMoreMessages: res.data.messages.length > 0,
            currentPage: page,
          };
        }

        const existingMessageIds = new Set(state.messages.map(msg => msg._id));
        const newMessages = res.data.messages.filter(msg => !existingMessageIds.has(msg._id));

        return {
          messages: [...state.messages, ...newMessages],
          hasMoreMessages: newMessages.length > 0,
          currentPage: page,
        };
      });

      if (page === 1) {
        await get().markMessagesAsRead(userId);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // ✅ Mark messages as read
  markMessagesAsRead: async (userId) => {
    if (!userId) return;
    try {
      await messagesApi.post(`/mark-as-read/${userId}`);
      set((state) => ({
        unreadMessages: { ...state.unreadMessages, [userId]: 0 },
      }));
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  },

  addNotification: (message, userId) => {
    const { notifications, selectedUser } = get();
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
      toast.custom((t) => (
        <div className="bg-base-100 shadow-lg rounded-lg p-4 flex items-center gap-3">
          <div className="avatar">
            <div className="w-12 rounded-full">
              <img src={message.sender.profilePic || "/default-avatar.png"} alt="sender" />
            </div>
          </div>
          <div>
            <p className="font-semibold">{message.sender.username}</p>
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

    try {
      // Create message data - handle both string and object content
      const messageData = {
        // Map 'text' to 'content' for backend compatibility
        content: typeof content === 'string' ? content : content.text || content.content || '',
        receiverId: content.receiverId || selectedUser._id
      };

      if (content.image) {
        messageData.image = content.image;
      }
      if (content.video) {
        messageData.video = content.video;
      }

      // Optimistic update with clear sender information
      tempMessage = {
        _id: Date.now().toString(),
        // Store as text for frontend consistency
        text: messageData.content,
        sender: authUser,
        senderId: authUser._id, // Explicitly set senderId
        receiverId: messageData.receiverId, // Explicitly set receiverId
        createdAt: new Date().toISOString(),
        isOptimistic: true
      };

      set((state) => ({
        messages: [...state.messages, tempMessage]
      }));

      console.log('🔹 Sending message:', messageData);

      // Send message using messagesApi
      const response = await messagesApi.post('', messageData);

      console.log('✅ Message sent successfully:', response.data);

      const data = response.data;

      // Ensure the response data has a text field for frontend consistency
      if (data.content && !data.text) {
        data.text = data.content;
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

      return data; // Return the message data for socket emission
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
    socket.on("newMessage", (data) => {
      const { selectedUser } = get();
      const authUserId = useAuthStore.getState().user?._id;
      const message = data.message || data;

      console.log("Received message via socket:", message);

      // Update messages if chat is open with the correct user
      if (selectedUser && (
        // If we're chatting with the sender of this message
        (message.sender?._id === selectedUser._id || message.senderId === selectedUser._id) ||
        // Or if we're chatting with the receiver and we sent this message
        (message.receiverId === selectedUser._id &&
         (message.sender?._id === authUserId || message.senderId === authUserId))
      )) {
        set((state) => ({
          messages: [...state.messages, message]
        }));

        // Mark as read if we received the message
        if (message.sender?._id === selectedUser._id || message.senderId === selectedUser._id) {
          get().markMessagesAsRead(selectedUser._id);
        }
      } else {
        // Add notification if chat is not open
        const senderId = message.sender?._id || message.senderId;
        if (senderId && senderId !== authUserId) {
          get().addNotification(message, senderId);
        }
      }

      // Update last message in users list
      set((state) => ({
        users: state.users.map(user => {
          const senderId = message.sender?._id || message.senderId;
          const receiverId = message.receiverId;

          // Update last message for both sender and receiver
          if (user._id === senderId || user._id === receiverId) {
            return { ...user, lastMessage: message };
          }
          return user;
        })
      }));
    });

    return () => {
      socket.off("newMessage");
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
        toast.info(SUCCESS_MESSAGES.USER_OFFLINE);
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
      const authUser = useAuthStore.getState().authUser;

      if (!activeCall) return;

      // Clear any pending end call timeout
      if (endCallTimeout) {
        clearTimeout(endCallTimeout);
      }

      // Emit end call event if socket is available
      if (socket && authUser) {
        socket.emit("endCall", {
          userId: authUser._id,
          remoteUserId: activeCall.userId
        });
      } else {
        console.warn("⚠️ Socket not available for ending call");
      }

      // Debounce the state update
      endCallTimeout = setTimeout(() => {
        set({
          isCallActive: false,
          activeCall: null
        });
      }, 100);

      toast.info("Call ended");
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
}));
