import { create } from "zustand";
import { authApi } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import config from "../config/env.js";

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

export const useAuthStore = create((set, get) => ({
  // Initial state
  user: null,
  isLoading: false,
  error: null,
  isVerified: false,
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

  handleGoogleAuthSuccess: async (navigate) => {
    try {
      set({ isLoading: true });
      const authResponse = await get().checkAuth();
      
      if (authResponse) {
        navigate?.(config.ROUTES.APP.HOME);
        return true;
      }
      
      navigate?.(config.ROUTES.AUTH.LOGIN);
      return false;
    } catch (error) {
      console.error("❌ Google auth error:", error);
      set({ isLoading: false });
      toast.error(ERROR_MESSAGES.GOOGLE_AUTH);
      navigate?.(config.ROUTES.AUTH.LOGIN);
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
      get().connectSocket();
      toast.success(SUCCESS_MESSAGES.LOGIN);
      navigate?.(config.ROUTES.APP.HOME);
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
      const newSocket = io(config.SOCKET.URL, {
        ...config.SOCKET.CONFIG,
        auth: { userId: user._id }
      });

      newSocket.on('connect', () => {
        console.log('✅ Socket connected successfully');
        newSocket.emit('online', { userId: user._id });
      });

      newSocket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        toast.error(ERROR_MESSAGES.SOCKET_CONNECTION);
      });

      set({ socket: newSocket });
    }
  },

  disconnectSocket: () => {
    const { socket, user } = get();
    if (socket?.connected) {
      user?._id && socket.emit('offline', { userId: user._id });
      socket.disconnect();
      set({ socket: null, onlineUsers: [] });
    }
  },
}));

export default useAuthStore;
