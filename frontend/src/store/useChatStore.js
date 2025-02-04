import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  unreadMessages: {}, // Track unread messages
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
  
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
  
      // ✅ Mark messages as read when opening the chat
      await axiosInstance.post(`/messages/mark-as-read/${userId}`);
      set((state) => ({
        unreadMessages: { ...state.unreadMessages, [userId]: 0 },
      }));
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  
  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    const socket = useAuthStore.getState().socket;
  
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
        axiosInstance.post(`/messages/mark-as-read/${senderId}`);
      }
    });
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
