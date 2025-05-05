import { create } from "zustand";
import { axiosInstance, authApi } from "../lib/axios";
import { connectSocket } from "../socket";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../constants/messages";
import toast from "react-hot-toast";

export const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: true,
  error: null,
  socket: null,

  checkAuth: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.get("/me");
      const userData = response.data;

      set({ user: userData, isLoading: false });

      // Connect socket if user is authenticated
      if (userData?._id) {
        const socket = connectSocket(userData._id);
        set({ socket });
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      set({ user: null, isLoading: false, error: ERROR_MESSAGES.AUTH_CHECK });
    }
  },

  login: async (credentials) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.post("/login", credentials);
      const userData = response.data;

      set({ user: userData, isLoading: false });

      // Connect socket after successful login
      if (userData?._id) {
        const socket = connectSocket(userData._id);
        set({ socket });
      }

      toast.success(SUCCESS_MESSAGES.LOGIN);
      return userData;
    } catch (error) {
      console.error("Login failed:", error);
      set({ error: error.response?.data?.message || ERROR_MESSAGES.LOGIN, isLoading: false });
      toast.error(error.response?.data?.message || ERROR_MESSAGES.LOGIN);
      throw error;
    }
  },

  signup: async (userData) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.post("/signup", userData);
      const newUser = response.data;

      set({ user: newUser, isLoading: false });

      // Connect socket after successful signup
      if (newUser?._id) {
        const socket = connectSocket(newUser._id);
        set({ socket });
      }

      toast.success(SUCCESS_MESSAGES.SIGNUP);
      return newUser;
    } catch (error) {
      console.error("Signup failed:", error);
      set({ error: error.response?.data?.message || ERROR_MESSAGES.SIGNUP, isLoading: false });
      toast.error(error.response?.data?.message || ERROR_MESSAGES.SIGNUP);
      throw error;
    }
  },

  logout: async () => {
    try {
      await authApi.post("/logout");
      set({ user: null, socket: null });
      toast.success(SUCCESS_MESSAGES.LOGOUT);
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error(ERROR_MESSAGES.LOGOUT);
    }
  },

  updateProfile: async (profileData) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.put("/profile", profileData);
      const updatedUser = response.data;

      set((state) => ({
        user: { ...state.user, ...updatedUser },
        isLoading: false
      }));

      toast.success(SUCCESS_MESSAGES.PROFILE_UPDATE);
      return updatedUser;
    } catch (error) {
      console.error("Profile update failed:", error);
      set({ error: error.response?.data?.message || ERROR_MESSAGES.PROFILE_UPDATE, isLoading: false });
      toast.error(error.response?.data?.message || ERROR_MESSAGES.PROFILE_UPDATE);
      throw error;
    }
  },

  updateProfilePicture: async (file) => {
    try {
      const formData = new FormData();
      formData.append("profilePic", file);

      set({ isLoading: true, error: null });
      const response = await authApi.put("/profile/picture", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const updatedUser = response.data;

      set((state) => ({
        user: { ...state.user, ...updatedUser },
        isLoading: false
      }));

      toast.success(SUCCESS_MESSAGES.PROFILE_PICTURE_UPDATE);
      return updatedUser;
    } catch (error) {
      console.error("Profile picture update failed:", error);
      set({ error: error.response?.data?.message || ERROR_MESSAGES.PROFILE_PICTURE_UPDATE, isLoading: false });
      toast.error(error.response?.data?.message || ERROR_MESSAGES.PROFILE_PICTURE_UPDATE);
      throw error;
    }
  }
})); 