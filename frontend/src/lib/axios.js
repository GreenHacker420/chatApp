// import axios from "axios";

// const BASE_URL = "http://localhost:5001/api"; 

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
const BASE_URL = "https://gutargu.greenhacker.tech/api/auth";
console.log("🔹 Using API URL:", BASE_URL);

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor for debugging
axiosInstance.interceptors.request.use(
  (config) => {
    // Remove trailing slash from baseURL if it exists
    if (config.baseURL.endsWith('/')) {
      config.baseURL = config.baseURL.slice(0, -1);
    }
    
    // Remove leading slash from url if it exists
    if (config.url.startsWith('/')) {
      config.url = config.url.slice(1);
    }
    
    // Log the full URL being requested
    const fullUrl = `${config.baseURL}/${config.url}`;
    console.log(`🔹 ${config.method.toUpperCase()} request to ${fullUrl}`, { 
      url: fullUrl,
      method: config.method,
      headers: config.headers,
      withCredentials: config.withCredentials 
    });
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
    console.log(`✅ Response from ${response.config.url}:`, {
      status: response.status,
      data: response.data,
      headers: response.headers
    });
    return response;
  },
  (error) => {
    console.error("🔴 Response error:", {
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers,
      url: error.config?.url
    });
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      // Clear auth state and redirect to login only if not already on login page
      localStorage.removeItem("jwt");
      if (!window.location.pathname.includes('/login')) {
        window.location.href = "/login";
      }
    }
    
    if (!error.response) {
      toast.error("Network error. Please check your connection.");
    } else {
      toast.error(error.response.data?.message || "An error occurred");
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
