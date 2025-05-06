import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance, messagesApi, usersApi } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../constants/messages";
import { socket } from "../socket";
import WebRTCService from "../services/webrtc.service";
import offlineQueueService from "../services/offline-queue.service";

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
  pendingGroupCallInvites: [],

  // Call state
  activeCall: null,
  incomingCallData: null,
  isIncomingCall: false,
  isMuted: false,
  isVideoOff: false,
  callTimeout: null,

  error: null,

  // Add user online status tracking
  onlineUsers: new Set(),

  // Update user online status
  updateUserStatus: (userId, isOnline) => {
    set((state) => {
      const onlineUsers = new Set(state.onlineUsers);
      if (isOnline) {
        onlineUsers.add(userId);
      } else {
        onlineUsers.delete(userId);
      }
      return { onlineUsers };
    });
  },

  // Check if user is online
  isUserOnline: (userId) => {
    return get().onlineUsers.has(userId);
  },

  // Subscribe to user status changes
  subscribeToUserStatus: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return () => {};

    const handleStatusChange = ({ userId, isOnline }) => {
      get().updateUserStatus(userId, isOnline);
    };

    socket.on("userStatusChange", handleStatusChange);

    return () => {
      socket.off("userStatusChange", handleStatusChange);
    };
  },

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
    const isOnline = navigator.onLine && socket && socket.connected;

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
        isRead: false,
        status: isOnline ? 'sending' : 'queued'
      };

      set((state) => ({
        messages: [...state.messages, tempMessage]
      }));

      // Check if we're offline or on LAN-only mode
      if (!isOnline) {
        console.log("Device is offline, queueing message");

        // Add to offline queue
        const queuedMessage = offlineQueueService.addToQueue(
          messageData,
          async (msg) => {
            // This function will be called when we're back online
            const response = await messagesApi.post('', msg);
            return response.data;
          }
        );

        // Update the message with queued status
        set((state) => ({
          messages: state.messages.map(msg =>
            msg._id === tempMessage._id ? { ...msg, status: 'queued', _id: queuedMessage.id } : msg
          )
        }));

        // Update last message in users list
        set((state) => ({
          users: state.users.map(user =>
            user._id === selectedUser._id
              ? { ...user, lastMessage: { ...tempMessage, status: 'queued' } }
              : user
          )
        }));

        // Check if this is a LAN message
        const isLanUser = selectedUser.isLanUser || false;

        if (isLanUser && window.electron) {
          // Try to send directly over LAN using Electron
          try {
            // This would be implemented in the Electron preload script
            window.electron.sendLanMessage({
              message: messageData,
              receiverId: selectedUser._id,
              senderId: authUser._id
            });

            // Update status to "sent over LAN"
            set((state) => ({
              messages: state.messages.map(msg =>
                msg._id === tempMessage._id ? { ...msg, status: 'sent-lan' } : msg
              )
            }));
          } catch (lanError) {
            console.error("Failed to send message over LAN:", lanError);
          }
        }

        return tempMessage;
      }

      // Online mode - send message using messagesApi
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

      // Add status field
      data.status = 'sent';

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

      // If we're offline, keep the message with queued status
      if (!navigator.onLine) {
        set((state) => ({
          messages: state.messages.map(msg =>
            msg._id === tempMessage._id ? { ...msg, status: 'queued' } : msg
          )
        }));

        toast.error("You're offline. Message will be sent when you're back online.");
        return tempMessage;
      }

      // Remove optimistic message on error if we're online
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

  // Subscribe to call events
  subscribeToCallEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) {
      console.warn("Socket not available for call subscription");
      return () => {};
    }

    // Handle incoming call
    const handleIncomingCall = (callData) => {
      console.log("Received incoming call:", callData);
      get().handleIncomingCall(callData);
    };

    // Handle call accepted
    const handleCallAccepted = (data) => {
      console.log("Call accepted:", data);
      const { activeCall, callTimeout } = get();

      // Clear timeout if exists
      if (callTimeout) {
        clearTimeout(callTimeout);
        set({ callTimeout: null });
      }

      // Update call state if this is our outgoing call
      if (activeCall && activeCall.isOutgoing && data.receiverId === useAuthStore.getState().user?._id) {
        set((state) => ({
          activeCall: {
            ...state.activeCall,
            connected: true,
            connectedAt: Date.now()
          }
        }));
      }
    };

    // Handle call rejected
    const handleCallRejected = (data) => {
      console.log("Call rejected:", data);
      const { activeCall, callTimeout } = get();

      // Clear timeout if exists
      if (callTimeout) {
        clearTimeout(callTimeout);
        set({ callTimeout: null });
      }

      // End call if this is our outgoing call
      if (activeCall && activeCall.isOutgoing && data.receiverId === useAuthStore.getState().user?._id) {
        toast.error(`Call rejected: ${data.reason || "User busy"}`);
        get().endCall();
      }
    };

    // Handle call ended
    const handleCallEnded = (data) => {
      console.log("Call ended:", data);
      const { activeCall } = get();

      // End call if this is our active call
      if (activeCall && data.userId === activeCall.userId) {
        toast.info("Call ended by the other user");
        get().endCall();
      }
    };

    // Handle group call invitation
    const handleGroupCallInvitation = (data) => {
      console.log("Received group call invitation:", data);
      get().handleGroupCallInvitation(data);
    };

    // Handle user joining group call
    const handleUserJoinedGroupCall = (data) => {
      console.log("User joined group call:", data);
      const { activeGroupCall } = get();

      // Only process if we're in this group call
      if (activeGroupCall && activeGroupCall.groupId === data.groupId) {
        get().addGroupCallParticipant({
          _id: data.userId,
          fullName: data.userName,
          isCreator: false
        });
      }
    };

    // Handle user leaving group call
    const handleUserLeftGroupCall = (data) => {
      console.log("User left group call:", data);
      const { activeGroupCall } = get();

      // Only process if we're in this group call
      if (activeGroupCall && activeGroupCall.groupId === data.groupId) {
        get().removeGroupCallParticipant(data.userId);
      }
    };

    // Handle group call ended
    const handleGroupCallEnded = (data) => {
      console.log("Group call ended:", data);
      const { activeGroupCall } = get();

      // Only end if we're in this group call
      if (activeGroupCall && activeGroupCall.groupId === data.groupId) {
        toast.info(`Group call ended by ${data.userName || 'the host'}`);
        get().endGroupCall();
      }
    };

    // Handle LAN connection info
    const handleLanConnectionInfo = (data) => {
      console.log("Received LAN connection info:", data);
      const { activeCall, activeGroupCall } = get();

      // Check if we have an active call or group call
      if (activeCall?.webRTCService) {
        activeCall.webRTCService.handleLanInfo(data);
      } else if (activeGroupCall?.webRTCService) {
        activeGroupCall.webRTCService.handleLanInfo(data);
      }
    };

    // Register event listeners
    socket.on("incomingCall", handleIncomingCall);
    socket.on("callAccepted", handleCallAccepted);
    socket.on("callRejected", handleCallRejected);
    socket.on("callEnded", handleCallEnded);

    // Group call events
    socket.on("groupCallInvitation", handleGroupCallInvitation);
    socket.on("userJoinedGroupCall", handleUserJoinedGroupCall);
    socket.on("userLeftGroupCall", handleUserLeftGroupCall);
    socket.on("groupCallEnded", handleGroupCallEnded);

    // LAN connection events
    socket.on("lanConnectionInfo", handleLanConnectionInfo);

    return () => {
      // Clean up event listeners
      socket.off("incomingCall", handleIncomingCall);
      socket.off("callAccepted", handleCallAccepted);
      socket.off("callRejected", handleCallRejected);
      socket.off("callEnded", handleCallEnded);

      // Group call events
      socket.off("groupCallInvitation", handleGroupCallInvitation);
      socket.off("userJoinedGroupCall", handleUserJoinedGroupCall);
      socket.off("userLeftGroupCall", handleUserLeftGroupCall);
      socket.off("groupCallEnded", handleGroupCallEnded);

      // LAN connection events
      socket.off("lanConnectionInfo", handleLanConnectionInfo);
    };
  },

  // ✅ Handles infinite scrolling (load more messages)
  loadMoreMessages: async () => {
    const { selectedUser, currentPage, hasMoreMessages } = get();
    if (!selectedUser || !hasMoreMessages) return;

    await get().getMessages(selectedUser._id, currentPage + 1);
  },

  // Start group call
  startGroupCall: async (groupId, groupName, initialParticipants = []) => {
    const { socket, user } = useAuthStore.getState();
    if (!socket || !user) {
      toast.error("Not connected to server");
      return;
    }

    try {
      // Initialize WebRTC service
      const webRTCService = new WebRTCService(socket);
      await webRTCService.initLocalStream(true); // Always use video for group calls

      // Check if we can detect LAN connection
      const lanDetected = await webRTCService.detectLanConnection();
      if (lanDetected) {
        toast.success("LAN connection detected. Using local network for better quality.");
      }

      // Set group call state
      set({
        isGroupCallActive: true,
        activeGroupCall: {
          id: Date.now().toString(),
          groupId,
          groupName,
          startTime: Date.now(),
          webRTCService,
          isLanConnection: lanDetected,
          creator: user._id
        },
        groupCallParticipants: [
          {
            _id: user._id,
            fullName: user.fullName || user.name || "You",
            isCreator: true,
            joinedAt: Date.now()
          },
          ...initialParticipants.map(p => ({
            ...p,
            isCreator: false,
            joinedAt: null // Will be set when they join
          }))
        ]
      });

      // Emit group call start event
      socket.emit("startGroupCall", {
        groupId,
        groupName,
        callerId: user._id,
        callerName: user.fullName || user.name || "User",
        participants: initialParticipants.map(p => p._id),
        timestamp: Date.now(),
        lanIpAddresses: Array.from(webRTCService.lanIpAddresses || [])
      });

      // Send invites to initial participants
      initialParticipants.forEach(participant => {
        socket.emit("inviteToGroupCall", {
          groupId,
          groupName,
          callerId: user._id,
          callerName: user.fullName || user.name || "User",
          receiverId: participant._id,
          timestamp: Date.now()
        });

        // Add to pending invites
        set(state => ({
          pendingGroupCallInvites: [
            ...state.pendingGroupCallInvites,
            {
              userId: participant._id,
              userName: participant.fullName || participant.name || "User",
              timestamp: Date.now()
            }
          ]
        }));
      });

      return true;
    } catch (error) {
      console.error("Error starting group call:", error);
      toast.error("Failed to start group call. Please check your device permissions.");
      return false;
    }
  },

  // End group call
  endGroupCall: () => {
    const { socket, user } = useAuthStore.getState();
    const { activeGroupCall, groupCallParticipants } = get();

    if (!socket || !user || !activeGroupCall) {
      return;
    }

    // Emit group call end event
    socket.emit("endGroupCall", {
      groupId: activeGroupCall.groupId,
      userId: user._id,
      timestamp: Date.now()
    });

    // Notify all participants
    groupCallParticipants.forEach(participant => {
      if (participant._id !== user._id) {
        socket.emit("groupCallEnded", {
          groupId: activeGroupCall.groupId,
          userId: user._id,
          receiverId: participant._id,
          timestamp: Date.now()
        });
      }
    });

    // Clean up WebRTC
    if (activeGroupCall.webRTCService) {
      activeGroupCall.webRTCService.closeAllConnections();
    }

    // Clear states
    set({
      isGroupCallActive: false,
      activeGroupCall: null,
      groupCallParticipants: [],
      pendingGroupCallInvites: []
    });

    toast.success("Group call ended");
  },

  // Add participant to active group call
  addParticipantToGroupCall: async (userId) => {
    const { socket, user } = useAuthStore.getState();
    const { activeGroupCall, groupCallParticipants } = get();

    if (!socket || !user || !activeGroupCall) {
      toast.error("No active group call");
      return false;
    }

    // Check if user is already in the call
    if (groupCallParticipants.some(p => p._id === userId)) {
      toast.info("User is already in the call");
      return false;
    }

    // Get user details
    const userToAdd = get().users.find(u => u._id === userId);
    if (!userToAdd) {
      toast.error("User not found");
      return false;
    }

    // Send invite to the user
    socket.emit("inviteToGroupCall", {
      groupId: activeGroupCall.groupId,
      groupName: activeGroupCall.groupName,
      callerId: user._id,
      callerName: user.fullName || user.name || "User",
      receiverId: userId,
      timestamp: Date.now()
    });

    // Add to pending invites
    set(state => ({
      pendingGroupCallInvites: [
        ...state.pendingGroupCallInvites,
        {
          userId,
          userName: userToAdd.fullName || userToAdd.name || "User",
          timestamp: Date.now()
        }
      ]
    }));

    toast.success(`Invited ${userToAdd.fullName || userToAdd.name || "User"} to the call`);
    return true;
  },

  // ✅ Start a call
  startCall: async (userId, isVideo = true, forceCall = false) => {
    const { socket, user } = useAuthStore.getState();
    if (!socket || !user) {
      toast.error("Not connected to server");
      return;
    }

    // Check if already in a call
    if (get().activeCall) {
      toast.error("Already in a call");
      return;
    }

    // Get user details
    const receiver = get().users.find(u => u._id === userId);
    if (!receiver) {
      toast.error("User not found");
      return;
    }

    // Check online status - allow forcing a call even if user appears offline
    const isOnline = get().isUserOnline(userId) || forceCall;
    if (!isOnline) {
      // Instead of blocking the call, show a warning and allow the call to proceed
      toast.warning("User appears to be offline. Call may not connect.");
    }

    try {
      // Initialize WebRTC service
      const webRTCService = new WebRTCService(socket);
      await webRTCService.initLocalStream(isVideo);

      // Check if we can detect LAN connection
      const lanDetected = await webRTCService.detectLanConnection();
      if (lanDetected) {
        toast.success("LAN connection detected. Using local network for better quality.");
      }

      // Set call state
      set({
        activeCall: {
          id: Date.now().toString(),
          userId,
          userName: receiver.fullName || receiver.name || receiver.username || "User",
          isVideo,
          isOutgoing: true,
          startTime: Date.now(),
          webRTCService,
          isLanConnection: lanDetected
        }
      });

      // Emit call initiation
      socket.emit("initiateCall", {
        callerId: user._id,
        callerName: user.fullName || user.name || user.username || "User",
        receiverId: userId,
        isVideo,
        timestamp: Date.now(),
        lanIpAddresses: Array.from(webRTCService.lanIpAddresses || [])
      });

      // Set timeout for call acceptance
      const timeout = setTimeout(() => {
        if (get().activeCall?.userId === userId) {
          toast.error("Call not answered");
          get().endCall();
        }
      }, 30000); // 30 seconds timeout

      set({ callTimeout: timeout });
    } catch (error) {
      console.error("Error starting call:", error);
      toast.error("Failed to access camera/microphone. Please check your device permissions.");
    }
  },

  // ✅ Handle incoming call
  handleIncomingCall: (data) => {
    const { callerId, callerName, isVideo, timestamp } = data;

    // Validate incoming call data
    if (!callerId || !callerName) {
      console.error("Invalid incoming call data");
      return;
    }

    // Set incoming call state
    set({
      isIncomingCall: true,
      incomingCallData: {
        callerId,
        callerName,
        isVideo,
        timestamp: timestamp || Date.now()
      }
    });

    // Set timeout for call acceptance
    const timeout = setTimeout(() => {
      if (get().incomingCallData?.callerId === callerId) {
        get().rejectCall("Call timeout");
      }
    }, 30000); // 30 seconds timeout

    set({ callTimeout: timeout });
  },

  // ✅ Accept call
  acceptCall: async () => {
    const { socket, user } = useAuthStore.getState();
    const { incomingCallData } = get();

    if (!socket || !user || !incomingCallData) {
      toast.error("Cannot accept call");
      return;
    }

    // Initialize WebRTC service
    const webRTCService = new WebRTCService(socket);
    await webRTCService.initLocalStream(incomingCallData.isVideo);

    // Set call state
    set({
      activeCall: {
        id: Date.now().toString(),
        userId: incomingCallData.callerId,
        userName: incomingCallData.callerName,
        isVideo: incomingCallData.isVideo,
        isOutgoing: false,
        startTime: Date.now(),
        webRTCService
      },
      incomingCallData: null,
      isIncomingCall: false
    });

    // Clear timeout
    if (get().callTimeout) {
      clearTimeout(get().callTimeout);
      set({ callTimeout: null });
    }

    // Emit call acceptance
    socket.emit("acceptCall", {
      callerId: incomingCallData.callerId,
      receiverId: user._id,
      timestamp: Date.now()
    });
  },

  // ✅ End call with debounce
  endCall: () => {
    const { socket, user } = useAuthStore.getState();
    const { activeCall } = get();

    if (!socket || !user || !activeCall) {
      return;
    }

    // Emit call end
    socket.emit("endCall", {
      userId: user._id,
      remoteUserId: activeCall.userId
    });

    // Clean up WebRTC
    if (activeCall.webRTCService) {
      activeCall.webRTCService.closeAllConnections();
    }

    // Clear states
    set({
      activeCall: null,
      callTimeout: null
    });
  },

  // ✅ Reject call
  rejectCall: (reason = "Call rejected") => {
    const { socket, user } = useAuthStore.getState();
    const { incomingCallData, callTimeout } = get();

    if (!socket || !user || !incomingCallData) {
      return;
    }

    // Emit call rejection
    socket.emit("rejectCall", {
      callerId: incomingCallData.callerId,
      receiverId: user._id,
      reason
    });

    // Clear timeout if exists
    if (callTimeout) {
      clearTimeout(callTimeout);
    }

    // Clear states
    set({
      incomingCallData: null,
      callTimeout: null,
      isIncomingCall: false
    });
  },

  // Handle participant joining a group call
  addGroupCallParticipant: (participant) => {
    const { activeGroupCall, groupCallParticipants } = get();

    // Check if participant is already in the call
    if (groupCallParticipants.some(p => p._id === participant._id)) {
      return;
    }

    // Add participant to the list
    set((state) => ({
      groupCallParticipants: [
        ...state.groupCallParticipants,
        {
          ...participant,
          joinedAt: Date.now()
        }
      ],
      // Remove from pending invites if present
      pendingGroupCallInvites: state.pendingGroupCallInvites.filter(
        invite => invite.userId !== participant._id
      )
    }));

    // Notify that participant joined
    toast.success(`${participant.fullName || participant.name || 'User'} joined the call`);

    // If we have an active WebRTC connection, connect to the new participant
    if (activeGroupCall?.webRTCService) {
      activeGroupCall.webRTCService.callUser(participant._id);
    }
  },

  // Handle participant leaving a group call
  removeGroupCallParticipant: (participantId) => {
    const { activeGroupCall } = get();

    // Get participant details before removing
    const participant = get().groupCallParticipants.find(p => p._id === participantId);

    // Remove participant from the list
    set((state) => ({
      groupCallParticipants: state.groupCallParticipants.filter(
        (p) => p._id !== participantId
      ),
    }));

    // Notify that participant left
    if (participant) {
      toast.info(`${participant.fullName || participant.name || 'User'} left the call`);
    }

    // Close WebRTC connection with this participant
    if (activeGroupCall?.webRTCService) {
      activeGroupCall.webRTCService.closeConnection(participantId);
    }
  },

  // Handle receiving a group call invitation
  handleGroupCallInvitation: (invitation) => {
    // Add unique ID to the invitation
    const invitationWithId = {
      ...invitation,
      id: Date.now().toString()
    };

    // Add to invitations list
    set((state) => ({
      groupCallInvitations: [...state.groupCallInvitations, invitationWithId],
    }));

    // Show notification
    toast.info(`${invitation.callerName || 'Someone'} invited you to a group call`, {
      duration: 10000, // Show for 10 seconds
      action: {
        label: 'Join',
        onClick: () => get().acceptGroupCallInvitation(invitationWithId.id)
      }
    });
  },

  // Accept a group call invitation
  acceptGroupCallInvitation: async (invitationId) => {
    const { socket, user } = useAuthStore.getState();
    const invitation = get().groupCallInvitations.find(
      (inv) => inv.id === invitationId
    );

    if (!invitation || !socket || !user) {
      toast.error("Cannot join call");
      return false;
    }

    try {
      // Initialize WebRTC service
      const webRTCService = new WebRTCService(socket);
      await webRTCService.initLocalStream(true); // Always use video for group calls

      // Check if we can detect LAN connection
      const lanDetected = await webRTCService.detectLanConnection();
      if (lanDetected) {
        toast.success("LAN connection detected. Using local network for better quality.");
      }

      // Set group call state
      set({
        isGroupCallActive: true,
        activeGroupCall: {
          id: invitation.id,
          groupId: invitation.groupId,
          groupName: invitation.groupName,
          startTime: invitation.timestamp,
          webRTCService,
          isLanConnection: lanDetected,
          creator: invitation.callerId
        },
        groupCallParticipants: [
          {
            _id: user._id,
            fullName: user.fullName || user.name || "You",
            isCreator: false,
            joinedAt: Date.now()
          }
        ],
        // Remove this invitation from the list
        groupCallInvitations: get().groupCallInvitations.filter(
          (inv) => inv.id !== invitationId
        )
      });

      // Emit join group call event
      socket.emit("joinGroupCall", {
        groupId: invitation.groupId,
        userId: user._id,
        userName: user.fullName || user.name || "User",
        callerId: invitation.callerId,
        timestamp: Date.now(),
        lanIpAddresses: Array.from(webRTCService.lanIpAddresses || [])
      });

      toast.success(`Joined group call: ${invitation.groupName || 'Group Call'}`);
      return true;
    } catch (error) {
      console.error("Error joining group call:", error);
      toast.error("Failed to join group call. Please check your device permissions.");

      // Remove invitation from the list
      set((state) => ({
        groupCallInvitations: state.groupCallInvitations.filter(
          (inv) => inv.id !== invitationId
        )
      }));

      return false;
    }
  },

  // Reject a group call invitation
  rejectGroupCallInvitation: (invitationId) => {
    const { socket, user } = useAuthStore.getState();
    const invitation = get().groupCallInvitations.find(
      (inv) => inv.id === invitationId
    );

    if (invitation && socket && user) {
      // Emit reject group call event
      socket.emit("rejectGroupCall", {
        groupId: invitation.groupId,
        userId: user._id,
        callerId: invitation.callerId,
        reason: "declined",
        timestamp: Date.now()
      });
    }

    // Remove invitation from the list
    set((state) => ({
      groupCallInvitations: state.groupCallInvitations.filter(
        (inv) => inv.id !== invitationId
      ),
    }));
  },

  // ✅ Toggle audio mute state
  toggleMute: () => {
    const { activeCall } = get();
    if (!activeCall?.webRTCService) return;

    const isMuted = activeCall.webRTCService.toggleAudio();
    set({ isMuted });
  },

  // ✅ Toggle video state
  toggleVideo: () => {
    const { activeCall } = get();
    if (!activeCall?.webRTCService) return;

    const isVideoOff = activeCall.webRTCService.toggleVideo();
    set({ isVideoOff });
  },
}));
