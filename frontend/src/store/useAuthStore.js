import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,
  onlineUsers: [],
  socket: null,

  // ✅ Check if user is authenticated
  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");

      if (res.data) {
        set({ authUser: res.data });
        get().connectSocket(); // ✅ Connect WebSocket if user is authenticated
      } else {
        set({ authUser: null });
      }
    } catch (error) {
      console.error("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  // ✅ Handle Google Login Success (Refresh User Session)
  handleGoogleAuthSuccess: async () => {
    try {
      console.log("🔹 Google Auth Success: Fetching user data...");
      await get().checkAuth(); // ✅ Refresh user session
      toast.success("Google login successful!");
    } catch (error) {
      console.error("Google Auth Error:", error);
      toast.error("Google login failed!");
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
      const res = await axiosInstance.post("/auth/signup", data);
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
      console.log("🔹 Login Data:", data); // Debug log

      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Logged in successfully");

      get().connectSocket();
    } catch (error) {
      console.error("Login error:", error.response?.data?.message || error.message);
      toast.error(error.response?.data?.message || "Invalid credentials");
    } finally {
      set({ isLoggingIn: false });
    }
  },

  // ✅ Logout
  logout: async () => {
    try {
      await axiosInstance.post("api/auth/logout");
      localStorage.removeItem("jwt");  // ✅ Remove JWT from storage
      set({ authUser: null });
      toast.success("Logged out successfully");
      get().disconnectSocket();
    } catch (error) {
      console.error("Logout error:", error.response?.data?.message || error.message);
      toast.error("Logout failed");
    }
  },

  // ✅ Update Profile
  updateProfile: async (data) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error in update profile:", error.response?.data?.message || error.message);
      toast.error("Profile update failed");
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  // ✅ WebSocket Connection with Fixes
  connectSocket: () => {
    const { authUser, socket } = get();
    if (!authUser) return;

    if (socket && socket.connected) {
      console.log("✅ Socket already connected.");
      return;
    }

    console.log("🔗 Connecting socket...");
    const newSocket = io(BASE_URL, {
      query: { userId: authUser._id },
    });

    set({ socket: newSocket });

    newSocket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });

    newSocket.connect();
  },

  // ✅ WebSocket Disconnection Fix
  disconnectSocket: () => {
    if (get().socket?.connected) {
      console.log("🔌 Disconnecting socket...");
      get().socket.disconnect();
    }
  },
}));
