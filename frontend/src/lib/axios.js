// import axios from "axios";

// const BASE_URL = "http://localhost:5001/api"; // Directly setting base URL

// export const axiosInstance = axios.create({
//   baseURL: BASE_URL,
//   withCredentials: true, // Allows sending cookies if backend supports it
// });

// // ✅ Attach JWT token from localStorage to every request
// axiosInstance.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem("jwt");
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// export default axiosInstance;

import axios from "axios";
import toast from "react-hot-toast";

// Get the base URL from environment variables
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // ✅ Allows sending cookies if backend supports it
  timeout: 10000, // 10 seconds timeout
});

// Add request interceptor for debugging
axiosInstance.interceptors.request.use(
  (config) => {
    console.log(`🔹 ${config.method.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    console.error("🔴 Request error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`✅ Response from ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    console.error("🔴 Response error:", error.response?.status, error.response?.data);
    
    // Show error toast for network errors
    if (!error.response) {
      toast.error("Network error. Please check your connection.");
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
