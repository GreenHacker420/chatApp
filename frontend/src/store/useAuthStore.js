import { create } from "zustand";
import { authApi } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import config from "../config/env.js";
import axios from "axios";

// Success Messages
const SUCCESS_MESSAGES = {
  LOGIN: "Logged in successfully",
  LOGOUT: "Logged out successfully",
  SIGNUP: "Account created successfully",
  PROFILE_UPDATE: "Profile updated successfully",
  VERIFICATION_EMAIL: "Verification email sent",
  PASSWORD_RESET: "Password reset successful",
};

// Error Messages
const ERROR_MESSAGES = {
  LOGIN: "Login failed",
  LOGOUT: "Logout failed",
  SIGNUP: "Signup failed",
  PROFILE_UPDATE: "Profile update failed",
  VERIFICATION_EMAIL: "Failed to send verification email",
  PASSWORD_RESET: "Password reset failed",
  GOOGLE_AUTH: "Google authentication failed",
  SOCKET_CONNECTION: "Connection error. Retrying...",
};

// Types
/**
 * @typedef {Object} User
 * @property {string} _id
 * @property {string} fullName
 * @property {string} email
 * @property {string} [profilePic]
 */

/**
 * @typedef {Object} AuthState
 * @property {User|null} user
 * @property {boolean} isLoading
 * @property {string|null} error
 * @property {boolean} isVerified
 * @property {Array} onlineUsers
 * @property {any} socket
 */

/**
 * Create a base64 string from a file
 * @param {File} file - The file to convert
 * @returns {Promise<string>} - Base64 string
 */
const fileToBase64 = async (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
};

// Load persisted state from localStorage
const loadPersistedState = () => {
  try {
    const persistedState = localStorage.getItem('authState');
    if (persistedState) {
      const parsedState = JSON.parse(persistedState);
      // Only restore user data, not socket or other volatile state
      return {
        user: parsedState.user,
        isVerified: parsedState.isVerified || false
      };
    }
  } catch (error) {
    console.error('Error loading persisted state:', error);
  }
  return { user: null, isVerified: false };
};

export const useAuthStore = create((set, get) => ({
  // Initial state with persistence
  ...loadPersistedState(),
  isLoading: false,
  error: null,
  onlineUsers: [],
  socket: null,

  // ✅ Auth Actions
  checkAuth: async () => {
    try {
      set({ isLoading: true });
      const response = await authApi.get("check");
      if (response.data?._id) {
        set({ user: response.data });
        get().connectSocket();
        // Persist user data
        localStorage.setItem('authState', JSON.stringify({ 
          user: response.data,
          isVerified: response.data.isVerified || false
        }));
        return true;
      }
      set({ user: null });
      localStorage.removeItem('authState');
      return false;
    } catch (error) {
      set({ user: null });
      localStorage.removeItem('authState');
      if (!error.response && error.code === 'ERR_NETWORK') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return get().checkAuth();
      }
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  handleGoogleAuthSuccess: async () => {
    try {
      console.log('🔹 Fetching Google auth success data');
      const response = await authApi.get("google/success");
      console.log('✅ Google auth response:', response.data);

      if (!response.data?.user) {
        console.error('❌ No user data in response');
        throw new Error('No user data received');
      }

      const userData = response.data.user;
      console.log('✅ User data received:', userData);
      
      // Update state
      set({ 
        user: userData,
        isVerified: userData.isVerified || false,
        error: null
      });

      // Persist user data
      localStorage.setItem('authState', JSON.stringify({ 
        user: userData,
        isVerified: userData.isVerified || false
      }));

      console.log('🔹 Initializing socket connection');
      // Initialize socket connection
      get().connectSocket();
      
      toast.success(SUCCESS_MESSAGES.LOGIN);
      console.log('✅ Google auth success complete');
      return true;
    } catch (error) {
      console.error('❌ Google auth success error:', error);
      console.error('Error details:', {
        response: error.response?.data,
        status: error.response?.status,
        message: error.message
      });
      
      set({ 
        error: error.response?.data?.message || ERROR_MESSAGES.GOOGLE_AUTH,
        user: null,
        isVerified: false
      });
      toast.error(ERROR_MESSAGES.GOOGLE_AUTH);
      return false;
    }
  },

  signup: async (userData, navigate) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.post("signup", userData);
      toast.success(response.data.message || SUCCESS_MESSAGES.SIGNUP);
      navigate?.(config.ROUTES.AUTH.LOGIN);
      return true;
    } catch (error) {
      const message = error.response?.data?.message || ERROR_MESSAGES.SIGNUP;
      toast.error(message);
      set({ error: message });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (credentials, navigate) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.post("login", credentials);
      set({ user: response.data });
      
      // Persist user data
      localStorage.setItem('authState', JSON.stringify({ 
        user: response.data,
        isVerified: response.data.isVerified || false
      }));
      
      // Connect socket before navigation
      get().connectSocket();
      
      toast.success(SUCCESS_MESSAGES.LOGIN);
      
      // Force navigation to home page with a slight delay to ensure socket connection
      setTimeout(() => {
        if (navigate) {
          navigate(config.ROUTES.APP.HOME);
        } else {
          window.location.href = config.ROUTES.APP.HOME;
        }
      }, 100);
      
      return true;
    } catch (error) {
      const message = error.response?.data?.message || ERROR_MESSAGES.LOGIN;
      toast.error(message);
      set({ error: message });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async (navigate) => {
    try {
      set({ isLoading: true });
      await authApi.post("logout");
      get().disconnectSocket();
      set({ user: null });
      localStorage.removeItem('authState');
      toast.success(SUCCESS_MESSAGES.LOGOUT);
      navigate?.(config.ROUTES.AUTH.LOGIN);
      return true;
    } catch (error) {
      toast.error(ERROR_MESSAGES.LOGOUT);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // ✅ Profile Actions
  updateProfile: async (formData) => {
    try {
      set({ isLoading: true });
      
      const profilePic = formData.profilePic && typeof formData.profilePic !== 'string'
        ? await fileToBase64(formData.profilePic)
        : formData.profilePic;

      const response = await authApi.put(
        "update-profile",
        { ...formData, profilePic }
      );

      set({ user: response.data });
      
      // Update persisted user data
      const persistedState = JSON.parse(localStorage.getItem('authState') || '{}');
      localStorage.setItem('authState', JSON.stringify({
        ...persistedState,
        user: response.data
      }));
      
      toast.success(SUCCESS_MESSAGES.PROFILE_UPDATE);
      return true;
    } catch (error) {
      const message = error.response?.data?.message || ERROR_MESSAGES.PROFILE_UPDATE;
      toast.error(message);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // ✅ Email Verification Actions
  verifyEmail: async (userId, token, navigate) => {
    try {
      set({ isLoading: true });
      const response = await authApi.get(`verify/${userId}/${token}`);
      set({ isVerified: true });
      
      // Update persisted state
      const persistedState = JSON.parse(localStorage.getItem('authState') || '{}');
      localStorage.setItem('authState', JSON.stringify({
        ...persistedState,
        isVerified: true
      }));
      
      toast.success(response.data.message);
      navigate?.(`${config.ROUTES.AUTH.LOGIN}?verified=true`);
      return true;
    } catch (error) {
      const message = error.response?.data?.message || ERROR_MESSAGES.VERIFICATION_EMAIL;
      toast.error(message);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  resendVerification: async (email) => {
    try {
      set({ isLoading: true });
      const response = await authApi.post("resend-verification", { email });
      toast.success(response.data.message || SUCCESS_MESSAGES.VERIFICATION_EMAIL);
      return true;
    } catch (error) {
      const message = error.response?.data?.message || ERROR_MESSAGES.VERIFICATION_EMAIL;
      toast.error(message);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // ✅ Password Reset Actions
  forgotPassword: async (email, navigate) => {
    try {
      set({ isLoading: true });
      const response = await authApi.post("forgot-password", { email });
      toast.success(response.data.message);
      navigate?.(`${config.ROUTES.AUTH.LOGIN}?reset=requested`);
      return true;
    } catch (error) {
      const message = error.response?.data?.message || ERROR_MESSAGES.PASSWORD_RESET;
      toast.error(message);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  resetPassword: async (newPassword, token, navigate) => {
    try {
      set({ isLoading: true });
      const response = await authApi.post(`reset-password/${token}`, { newPassword });
      toast.success(response.data.message || SUCCESS_MESSAGES.PASSWORD_RESET);
      navigate?.(`${config.ROUTES.AUTH.LOGIN}?reset=success`);
      return true;
    } catch (error) {
      const message = error.response?.data?.message || ERROR_MESSAGES.PASSWORD_RESET;
      toast.error(message);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // ✅ Socket Actions
  connectSocket: () => {
    const { user, socket } = get();
    if (user?._id && !socket) {
      console.log('🔹 Connecting socket for user:', user.fullName);
      
      const newSocket = io(config.SOCKET.URL, {
        ...config.SOCKET.CONFIG,
        auth: { userId: user._id },
        query: { userId: user._id } // Add userId to query params
      });

      newSocket.on('connect', () => {
        console.log('✅ Socket connected successfully');
        newSocket.emit('online', { userId: user._id });
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        toast.error(ERROR_MESSAGES.SOCKET_CONNECTION);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, try to reconnect
          newSocket.connect();
        }
      });

      set({ socket: newSocket });
    }
  },

  disconnectSocket: () => {
    const { socket, user } = get();
    if (socket?.connected) {
      console.log('🔹 Disconnecting socket for user:', user?.fullName);
      user?._id && socket.emit('offline', { userId: user._id });
      socket.disconnect();
      set({ socket: null, onlineUsers: [] });
    }
  },

  testAuth: async () => {
    try {
      const response = await fetch('/api/auth/test', {
        credentials: 'include'
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Auth test failed:', error);
      throw error;
    }
  },
}));

export default useAuthStore;
