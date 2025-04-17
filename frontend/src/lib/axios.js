import axios from "axios";
import toast from "react-hot-toast";
import config from "../config/env.js";

// Error Messages
const ERROR_MESSAGES = {
  NETWORK: "Network error. Please check your connection.",
  DEFAULT: "An error occurred. Please try again.",
  SESSION_EXPIRED: "Your session has expired. Please login again.",
};

// Create axios instances for different API endpoints
export const axiosInstance = axios.create({
  baseURL: `${config.API.BASE_URL}${config.API.AUTH_PATH}`,
  timeout: config.API.TIMEOUT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

export const messagesApi = axios.create({
  baseURL: `${config.API.BASE_URL}${config.API.MESSAGES_PATH}`,
  timeout: config.API.TIMEOUT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

/**
 * Normalize URL by removing trailing/leading slashes
 * @param {string} baseURL - Base URL
 * @param {string} url - Request URL
 * @returns {string} - Normalized URL
 */
const normalizeUrl = (baseURL, url) => {
  const base = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
  const path = url.startsWith('/') ? url.slice(1) : url;
  return `${base}/${path}`;
};

/**
 * Log request/response details
 * @param {string} type - Log type ('request' or 'response')
 * @param {Object} details - Details to log
 */
const logApiCall = (type, details) => {
  if (process.env.NODE_ENV === 'development') {
    const emoji = type === 'request' ? '🔹' : '✅';
    console.log(`${emoji} ${type.charAt(0).toUpperCase() + type.slice(1)}:`, details);
  }
};

/**
 * Add interceptors to an axios instance
 * @param {AxiosInstance} instance - Axios instance
 * @param {string} name - Instance name for logging
 */
const addInterceptors = (instance, name) => {
  // Request interceptor
  instance.interceptors.request.use(
    (config) => {
      const fullUrl = normalizeUrl(config.baseURL, config.url);
      config.url = config.url.startsWith('/') ? config.url.slice(1) : config.url;
      
      logApiCall('request', {
        name,
        url: fullUrl,
        method: config.method?.toUpperCase(),
        headers: config.headers,
        withCredentials: config.withCredentials
      });
      
      return config;
    },
    (error) => {
      console.error(`🔴 ${name} request error:`, error);
      return Promise.reject(error);
    }
  );

  // Response interceptor
  instance.interceptors.response.use(
    (response) => {
      logApiCall('response', {
        name,
        url: response.config.url,
        status: response.status,
        data: response.data,
        headers: response.headers
      });
      return response;
    },
    (error) => {
      const errorDetails = {
        name,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      };
      console.error("🔴 Response error:", errorDetails);

      // Handle different error scenarios
      if (!error.response) {
        toast.error(ERROR_MESSAGES.NETWORK);
      } else if (error.response.status === 401) {
        handleAuthError();
      } else {
        toast.error(error.response.data?.message || ERROR_MESSAGES.DEFAULT);
      }

      return Promise.reject(error);
    }
  );
};

/**
 * Handle authentication errors
 */
const handleAuthError = () => {
  localStorage.removeItem("jwt");
  toast.error(ERROR_MESSAGES.SESSION_EXPIRED);
  
  // Only redirect if not already on login page
  if (!window.location.pathname.includes(config.ROUTES.AUTH.LOGIN)) {
    window.location.href = config.ROUTES.AUTH.LOGIN;
  }
};

// Add interceptors to instances
addInterceptors(axiosInstance, 'Auth API');
addInterceptors(messagesApi, 'Messages API');

// For backward compatibility
export const authApi = axiosInstance;

export default axiosInstance;
