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
const BASE_URL = "https://gutargu.greenhacker.tech/api/auth/" || "http://localhost:5001/api/auth";
console.log("🔹 Using API URL:", BASE_URL);

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

// Add request interceptor for debugging
axiosInstance.interceptors.request.use(
  (config) => {
    // Remove trailing slash from baseURL if it exists
    if (config.baseURL.endsWith('/')) {
      config.baseURL = config.baseURL.slice(0, -1);
    }
    
    // Log the full URL being requested
    const fullUrl = `${config.baseURL}${config.url}`;
    console.log(`🔹 ${config.method.toUpperCase()} request to ${fullUrl}`, config);
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
    console.log(`✅ Response from ${response.config.url}:`, response.status, response.data);
    return response;
  },
  (error) => {
    console.error("🔴 Response error:", error.response?.status, error.response?.data);
    
    if (!error.response) {
      toast.error("Network error. Please check your connection.");
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
