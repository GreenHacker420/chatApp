import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const SOCKET_URL = "https://gutargu.greenhacker.tech";

export const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: false,
  error: null,
  isVerified: false,
  onlineUsers: [],
  socket: null,

  // ✅ Check Auth Status
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

  // ✅ Handle Google Auth Success
  handleGoogleAuthSuccess: async (navigate) => {
    try {
      console.log("🔹 Starting Google auth success flow...");
      set({ isLoading: true });
      
      // First check if we're already authenticated
      const authResponse = await get().checkAuth();
      console.log("✅ Auth check result:", authResponse);
      
      if (authResponse) {
        console.log("✅ User authenticated, navigating to home...");
        if (navigate) {
          navigate('/');
        }
        return true;
      }
      
      console.log("⚠️ Auth check failed, redirecting to login...");
      if (navigate) {
        navigate('/login');
      }
      return false;
    } catch (error) {
      console.error("❌ Google auth error:", error);
      set({ isLoading: false });
      toast.error('Google authentication failed');
      if (navigate) {
        navigate('/login');
      }
      return false;
    }
  },

  // ✅ Sign Up
  signup: async (userData, navigate) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axiosInstance.post("signup", userData);
      toast.success(response.data.message);
      set({ isLoading: false });
      if (navigate) {
        navigate('/login');
      }
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Signup failed';
      toast.error(message);
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // ✅ Login
  login: async (credentials, navigate) => {
    try {
      set({ isLoading: true, error: null });
      const response = await axiosInstance.post("login", credentials);
      set({ user: response.data, isLoading: false });
      get().connectSocket();
      toast.success('Logged in successfully');
      if (navigate) {
        navigate('/');
      }
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      set({ error: message, isLoading: false });
      return false;
    }
  },

  // ✅ Logout
  logout: async (navigate) => {
    try {
      set({ isLoading: true });
      await axiosInstance.post("logout");
      get().disconnectSocket();
      set({ user: null, isLoading: false });
      toast.success('Logged out successfully');
      if (navigate) {
        navigate('/login');
      }
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
  verifyEmail: async (userId, token, navigate) => {
    try {
      set({ isLoading: true });
      const response = await axiosInstance.get(`verify/${userId}/${token}`);
      set({ isVerified: true, isLoading: false });
      toast.success(response.data.message);
      if (navigate) {
        navigate('/login?verified=true');
      }
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
  forgotPassword: async (email, navigate) => {
    try {
      set({ isLoading: true });
      const response = await axiosInstance.post("forgot-password", { email });
      toast.success(response.data.message);
      set({ isLoading: false });
      if (navigate) {
        navigate('/login?reset=requested');
      }
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to process forgot password request';
      toast.error(message);
      set({ isLoading: false });
      return false;
    }
  },

  // ✅ Reset Password
  resetPassword: async (newPassword, token, navigate) => {
    try {
      set({ isLoading: true });
      const response = await axiosInstance.post(`reset-password/${token}`, { newPassword });
      toast.success(response.data.message);
      set({ isLoading: false });
      if (navigate) {
        navigate('/login?reset=success');
      }
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

export default useAuthStore;
