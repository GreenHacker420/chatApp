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

  // ✅ Fetch users with error handling
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data.users });
    } catch (error) {
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
      set((state) => ({
        messages: page === 1 ? res.data.messages : [...state.messages, ...res.data.messages], // ✅ Append messages for infinite scrolling
        hasMoreMessages: res.data.messages.length > 0,
        currentPage: page,
      }));

      // ✅ Mark messages as read when opening the chat
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
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  // ✅ Real-time updates for incoming messages
  subscribeToMessages: () => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;

    if (!socket) return;

    socket.off("newMessage"); // ✅ Prevent multiple event listeners
    socket.on("newMessage", (newMessage) => {
      const { senderId } = newMessage;
      const isChatOpen = senderId === selectedUser?._id;

      set((state) => ({
        messages: isChatOpen ? [...state.messages, newMessage] : state.messages,
        unreadMessages: {
          ...state.unreadMessages,
          [senderId]: isChatOpen ? 0 : (state.unreadMessages[senderId] || 0) + 1,
        },
      }));

      if (isChatOpen) {
        get().markMessagesAsRead(senderId);
      }
    });
  },

  // ✅ Handles infinite scrolling (load more messages)
  loadMoreMessages: async () => {
    const { selectedUser, currentPage, hasMoreMessages } = get();
    if (!selectedUser || !hasMoreMessages) return;

    await get().getMessages(selectedUser._id, currentPage + 1);
  },

  setSelectedUser: (selectedUser) =>
    set({ selectedUser, messages: [], currentPage: 1, hasMoreMessages: true }),
}));
