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

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api"; // ✅ Uses production API

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // ✅ Allows sending cookies if backend supports it
});

export default axiosInstance;
