import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = "https://gutargu.greenhacker.tech";

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

  // ✅ Check if user is authenticated & update auth state
  checkAuth: async () => {
    set({ isCheckingAuth: true });
    try {
      console.log("🔹 Checking authentication status...");
      const response = await axiosInstance.get("/auth/check", { withCredentials: true }); // ✅ Ensure cookies are sent
      console.log("🔹 Auth check response:", response);
      
      if (response.data) {
        console.log("✅ Authenticated User:", response.data);
        set({ authUser: response.data });
        get().connectSocket();
        return response.data;
      } else {
        console.warn("⚠️ No user data received from auth check.");
        set({ authUser: null });
        return null;
      }
    } catch (error) {
      console.warn("⚠️ Auth check failed:", error.response?.data?.message || error.message);
      set({ authUser: null });
      
      // If the error is due to network issues, try again after a short delay
      if (!error.response) {
        console.log("🔹 Network error, retrying after delay...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        return get().checkAuth();
      }
      
      throw error; // Re-throw to be caught by the component
    } finally {
      set({ isCheckingAuth: false });
    }
  },
  // ✅ Google Login Success (Refresh User Session)
  handleGoogleAuthSuccess: async () => {
    try {
      console.log("🔹 Google Auth Success: Fetching user data...");
      
      // First check if we have a user session
      const response = await axiosInstance.get("/auth/check", { withCredentials: true });
      console.log("🔹 Auth check response:", response);
      
      if (response.data) {
        console.log("✅ User session found:", response.data);
        set({ authUser: response.data });
        get().connectSocket();
        return response.data;
      } else {
        console.warn("⚠️ No user session found after Google auth");
        throw new Error("No user session found");
      }
    } catch (error) {
      console.error("Google Auth Error:", error);
      // If the error is due to network issues, try again after a short delay
      if (!error.response) {
        console.log("🔹 Network error, retrying after delay...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        return get().handleGoogleAuthSuccess();
      }
      throw error; // Re-throw to be caught by the component
    }
  },

  // ✅ Signup with validation
  signup: async (data) => {
    if (!data?.email || !data?.password || !data?.fullName) {
      toast.error("All fields are required");
      return;
    }

    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data, { withCredentials: true });
      set({ authUser: res.data });
      toast.success("Account created successfully");
      get().connectSocket();
    } catch (error) {
      console.error("Signup error:", error.response?.data?.message || error.message);
      toast.error(error.response?.data?.message || "Signup failed");
    } finally {
      set({ isSigningUp: false });
    }
  },

  // ✅ Login with validation & better error handling
  login: async (data) => {
    if (!data?.email || !data?.password) {
      toast.error("Email and password are required");
      return;
    }
  
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data, { withCredentials: true });
      set({ authUser: res.data });
      toast.success("Logged in successfully");
      get().connectSocket();
    } catch (error) {
      console.error("Login error:", error.response?.data?.message || error.message);
  
      if (error.response?.status === 403) {
        toast.error("Please verify your email before logging in.");
      } else {
        toast.error(error.response?.data?.message || "Invalid credentials");
      }
    } finally {
      set({ isLoggingIn: false });
    }
  },

  // ✅ Logout with Socket Disconnection & Token Clearing
  logout: async () => {
    set({ isLoggingOut: true });
    try {
      await axiosInstance.post("/auth/logout", {}, { withCredentials: true });
      get().disconnectSocket();
      localStorage.removeItem("jwt");
      set({ authUser: null, socket: null, onlineUsers: [] });
      toast.success("Logged out successfully");
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error.response?.data?.message || error.message);
      toast.error("Logout failed, please try again");
    } finally {
      set({ isLoggingOut: false });
    }
  },

  // ✅ Update Profile
  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data, { withCredentials: true });
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error in update profile:", error.response?.data?.message || error.message);
      toast.error("Profile update failed");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  // ✅ WebSocket Connection (Prevents Duplicates)
  connectSocket: () => {
    const { authUser, socket } = get();
    if (!authUser) return;

    if (socket && socket.connected) {
      console.log("✅ Socket already connected.");
      return;
    }

    console.log("🔗 Connecting socket...");
    try {
      const newSocket = io(BASE_URL, {
        query: { userId: authUser._id },
        withCredentials: true,
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
      });

      // Set up error handling
      newSocket.on("connect_error", (error) => {
        console.error("🔴 Socket connection error:", error.message);
      });

      newSocket.on("error", (error) => {
        console.error("🔴 Socket error:", error);
      });

      set({ socket: newSocket });

      newSocket.on("connect", () => console.log("✅ Socket connected:", newSocket.id));
      newSocket.on("getOnlineUsers", (userIds) => {
        console.log("🟢 Received Online Users:", userIds);
        set({ onlineUsers: [...userIds] }); // Forces Zustand to update state
      });
      newSocket.on("disconnect", () => console.log("🔴 Socket disconnected"));
    } catch (error) {
      console.error("🔴 Failed to create socket connection:", error);
    }
  },

  // ✅ WebSocket Disconnection
  disconnectSocket: () => {
    const { socket } = get();
    if (socket?.connected) {
      console.log("🔌 Disconnecting socket...");
      try {
        socket.disconnect();
        set({ socket: null });
      } catch (error) {
        console.error("🔴 Error disconnecting socket:", error);
      }
    }
  },
}));
