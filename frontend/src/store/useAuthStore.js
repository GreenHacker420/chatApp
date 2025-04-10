import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import axios from 'axios';

const SOCKET_URL = "https://gutargu.greenhacker.tech";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  setAuthUser: (user) => set({ authUser: user }),

  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,
  isLoggingOut: false,

  user: null,
  isLoading: false,
  error: null,
  isVerified: false,

  // ✅ Check Auth Status
  checkAuthStatus: async () => {
    try {
      set({ isLoading: true });
      const response = await axios.get('/api/auth/check', { withCredentials: true });
      set({ user: response.data, isLoading: false });
      return true;
    } catch (error) {
      set({ user: null, isLoading: false });
      return false;
    }
  },

  // ✅ Check if user is authenticated & update auth state
  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const response = await axiosInstance.get("check");
      if (response.data && response.data._id) {
        set({ user: response.data });
        get().connectSocket();
        return true;
      }
      set({ user: null });
      return false;
    } catch (error) {
      set({ user: null });
      if (!error.response && error.code === 'ERR_NETWORK') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return get().checkAuth();
      }
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // ✅ Google Login Success (Refresh User Session)
  handleGoogleAuthSuccess: async () => {
    try {
      set({ isLoading: true });
      const response = await axiosInstance.get("check");
      if (response.data && response.data._id) {
        set({ user: response.data });
        get().connectSocket();
        toast.success('Google authentication successful');
        return true;
      }
      throw new Error('No user data received');
    } catch (error) {
      set({ isLoading: false });
      toast.error('Google authentication failed');
      return false;
    }
  },

  // ✅ Sign Up
  signup: async (userData) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axiosInstance.post("signup", userData);
      toast.success(response.data.message);
      set({ isLoading: false });
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Signup failed';
      toast.error(message);
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // ✅ Login
  login: async (credentials) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axiosInstance.post("login", credentials);
      set({ user: response.data, isLoading: false });
      get().connectSocket();
      toast.success('Logged in successfully');
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // ✅ Logout
  logout: async () => {
    try {
      set({ isLoading: true });
      await axiosInstance.post("logout");
      get().disconnectSocket();
      set({ user: null, isLoading: false });
      toast.success('Logged out successfully');
      return true;
    } catch (error) {
      toast.error('Logout failed');
      set({ isLoading: false });
      return false;
    }
  },

  // ✅ Update Profile
  updateProfile: async (formData) => {
    try {
      set({ isLoading: true });
      
      let profilePic = formData.profilePic;
      if (profilePic && typeof profilePic !== 'string') {
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(profilePic);
        });
        profilePic = base64;
      }

      const response = await axiosInstance.put(
        "update-profile",
        { ...formData, profilePic }
      );

      set({ user: response.data, isLoading: false });
      toast.success('Profile updated successfully');
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      set({ isLoading: false });
      return false;
    }
  },

  // ✅ Verify Email
  verifyEmail: async (userId, token) => {
    try {
      set({ isLoading: true });
      const response = await axiosInstance.get(`verify/${userId}/${token}`);
      set({ isVerified: true, isLoading: false });
      toast.success(response.data.message);
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Email verification failed';
      toast.error(message);
      set({ isLoading: false });
      return false;
    }
  },

  // ✅ Resend Verification Email
  resendVerification: async (email) => {
    try {
      set({ isLoading: true });
      const response = await axiosInstance.post("resend-verification", { email });
      toast.success(response.data.message);
      set({ isLoading: false });
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to resend verification email';
      toast.error(message);
      set({ isLoading: false });
      return false;
    }
  },

  // ✅ Forgot Password
  forgotPassword: async (email) => {
    try {
      set({ isLoading: true });
      const response = await axiosInstance.post("forgot-password", { email });
      toast.success(response.data.message);
      set({ isLoading: false });
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to process forgot password request';
      toast.error(message);
      set({ isLoading: false });
      return false;
    }
  },

  // ✅ Reset Password
  resetPassword: async (newPassword, token) => {
    try {
      set({ isLoading: true });
      const response = await axiosInstance.post(`reset-password/${token}`, { newPassword });
      toast.success(response.data.message);
      set({ isLoading: false });
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Password reset failed';
      toast.error(message);
      set({ isLoading: false });
      return false;
    }
  },

  // ✅ WebSocket Connection
  connectSocket: () => {
    const { user, socket } = get();
    if (user?._id && !socket) {
      const newSocket = io(SOCKET_URL, {
        withCredentials: true,
        transports: ['websocket'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        auth: {
          userId: user._id
        }
      });

      newSocket.on('connect', () => {
        console.log('✅ Socket connected successfully');
        newSocket.emit('online', { userId: user._id });
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        toast.error("Connection error. Retrying...");
      });

      set({ socket: newSocket });
    }
  },

  // ✅ WebSocket Disconnection
  disconnectSocket: () => {
    const { socket, user } = get();
    if (socket?.connected) {
      if (user?._id) {
        socket.emit('offline', { userId: user._id });
      }
      socket.disconnect();
      set({ socket: null, onlineUsers: [] });
    }
  },
}));
