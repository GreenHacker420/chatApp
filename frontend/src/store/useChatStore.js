import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  unreadMessages: {}, // ✅ Tracks unread messages per user
  isUsersLoading: false,
  isMessagesLoading: false,
  hasMoreMessages: true, // ✅ Used for pagination
  currentPage: 1, // ✅ Track the current page of messages

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

  // ✅ Fetch users with error handling
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      console.log("🔍 Users fetched:", res.data); // ✅ Debugging fetched users
  
      if (!Array.isArray(res.data.users)) {
        console.error("🚨 Unexpected response format:", res.data);
        toast.error("Invalid users data received.");
        return;
      }
  
      set({ users: res.data.users });
    } catch (error) {
      console.error("❌ Failed to fetch users:", error);
      toast.error(error.response?.data?.message || "Failed to fetch users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  // ✅ Load messages with pagination (infinite scrolling support)
  getMessages: async (userId, page = 1) => {
    set({ isMessagesLoading: true });

    try {
      const res = await axiosInstance.get(`/messages/${userId}?page=${page}`);
      
      set((state) => {
        // If it's the first page, replace all messages
        if (page === 1) {
          return {
            messages: res.data.messages,
            hasMoreMessages: res.data.messages.length > 0,
            currentPage: page,
          };
        }

        // For subsequent pages, filter out any duplicate messages before adding new ones
        const existingMessageIds = new Set(state.messages.map(msg => msg._id));
        const newMessages = res.data.messages.filter(msg => !existingMessageIds.has(msg._id));

        return {
          messages: [...state.messages, ...newMessages],
          hasMoreMessages: newMessages.length > 0,
          currentPage: page,
        };
      });

      // Mark messages as read when opening the chat
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
      await axiosInstance.post(`/messages/mark-as-read/${userId}`);
      set((state) => ({
        unreadMessages: { ...state.unreadMessages, [userId]: 0 },
      }));
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  },

  // ✅ Send messages and update state
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    if (!selectedUser) return;

    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      
      // Update messages state only if the message isn't already in the list
      set((state) => {
        const messageExists = state.messages.some(msg => msg._id === res.data._id);
        if (messageExists) return state;

        return {
          messages: [...state.messages, res.data],
        };
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  // ✅ Delete a message
  deleteMessage: async (messageId, deleteForEveryone = false) => {
    const { selectedUser, messages, socket } = get();
    if (!selectedUser) return;

    try {
      await axiosInstance.delete(`/messages/${messageId}`, {
        data: { deleteForEveryone }
      });
      
      // Update local state
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== messageId),
      }));

      // Notify the other user via socket
      if (socket) {
        socket.emit("deleteMessage", { messageId, receiverId: selectedUser._id, deleteForEveryone });
      }

      toast.success(deleteForEveryone ? "Message deleted for everyone" : "Message deleted for you");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  },

  // ✅ Real-time updates for incoming messages
  subscribeToMessages: () => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;

    if (!socket) {
      console.warn("⚠️ Socket not available for message subscription");
      return;
    }

    // Debounce message updates
    let messageUpdateTimeout;

    socket.off("newMessage");
    socket.on("newMessage", (newMessage) => {
      // Clear any pending updates
      if (messageUpdateTimeout) {
        clearTimeout(messageUpdateTimeout);
      }

      // Debounce the state update
      messageUpdateTimeout = setTimeout(() => {
        set((state) => {
          // Prevent duplicate messages
          const messageExists = state.messages.some(msg => msg._id === newMessage._id);
          if (messageExists) return state;

          return {
            messages: [...state.messages, newMessage],
          };
        });
      }, 100);
    });

    socket.off("messageDeleted");
    socket.on("messageDeleted", ({ messageId, deleteForEveryone }) => {
      set((state) => ({
        messages: state.messages.filter((msg) => msg._id !== messageId),
      }));
    });

    // Cleanup on unsubscribe
    return () => {
      if (messageUpdateTimeout) {
        clearTimeout(messageUpdateTimeout);
      }
    };
  },

  // ✅ Handles infinite scrolling (load more messages)
  loadMoreMessages: async () => {
    const { selectedUser, currentPage, hasMoreMessages } = get();
    if (!selectedUser || !hasMoreMessages) return;

    await get().getMessages(selectedUser._id, currentPage + 1);
  },

  setSelectedUser: (selectedUser) => {
    // Clear messages before loading new ones to prevent flickering
    set({ 
      selectedUser, 
      messages: [], 
      currentPage: 1, 
      hasMoreMessages: true,
      isMessagesLoading: true // Set loading state immediately
    });
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
    
    // Prevent multiple call attempts
    if (activeCall) {
      toast.error("You're already in a call");
      return;
    }

    if (!socket) {
      toast.error("Unable to start call. Socket connection not available.");
      return;
    }

    try {
      // Request media permissions first
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true
      });

      // Set call state before emitting to prevent flickering
      set({
        isCallActive: true,
        activeCall: {
          userId,
          isVideo,
          stream,
          isOutgoing: true,
          isReceiverOnline: isUserOnline,
          startTime: null, // Initialize as null until call is accepted
          connectedAt: null // New field to track when call is actually connected
        }
      });

      // Emit call request only if user is online
      if (isUserOnline) {
        socket.emit("initiateCall", {
          callerId: authUser._id,
          callerName: authUser.fullName,
          receiverId: userId,
          isVideo
        });
        toast.success("Ringing...");
      } else {
        toast.info("User is offline. They will be notified when they come online.");
      }
    } catch (error) {
      console.error("Error starting call:", error);
      toast.error("Failed to access camera/microphone");
      // Clean up call state if media access fails
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: incomingCallData.isVideo,
        audio: true
      });

      const now = Date.now();

      // Set call state before emitting to prevent flickering
      set({
        isCallActive: true,
        activeCall: {
          userId: incomingCallData.callerId,
          isVideo: incomingCallData.isVideo,
          stream,
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
    } catch (error) {
      console.error("Error accepting call:", error);
      toast.error("Failed to access camera/microphone");
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
      
      if (!activeCall) return;

      // Clear any pending end call timeout
      if (endCallTimeout) {
        clearTimeout(endCallTimeout);
      }

      // Stop all media tracks
      if (activeCall.stream) {
        activeCall.stream.getTracks().forEach(track => track.stop());
      }

      // Emit end call event if socket is available
      if (socket) {
        socket.emit("endCall", {
          userId: activeCall.userId
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
