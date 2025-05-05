import axios from "axios";
import toast from "react-hot-toast";
import { config } from "../config/env";

// Error Messages
const ERROR_MESSAGES = {
  NETWORK: "Network error. Please check your connection.",
  DEFAULT: "An error occurred. Please try again.",
  SESSION_EXPIRED: "Your session has expired. Please login again.",
};

// Determine the base URL based on environment
const getBaseUrl = () => {
  const isDevelopment = import.meta.env.MODE === 'development';

  // In development, use relative paths to work with Vite's proxy
  if (isDevelopment) {
    return '';
  }

  // In production, always use the config.API.BASE_URL
  // This ensures we're using the correct production URL
  const baseUrl = config.API.BASE_URL;

  // Add debugging information
  console.log('🔹 Environment:', import.meta.env.MODE);
  console.log('🔹 Config API BASE_URL:', config.API.BASE_URL);
  console.log('🔹 BACKEND_URLS.PRODUCTION:', config.PROD.BACKEND_URL);

  return baseUrl;
};

const API_BASE_URL = getBaseUrl();
console.log('🔹 Final API Base URL:', API_BASE_URL);

// Create axios instances for different API endpoints
export const axiosInstance = axios.create({
  baseURL: isDevelopment() ? '/api/auth' : `${API_BASE_URL}/api/auth`,
  timeout: 15000,
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json',
  },
  // Ensure cookies are properly handled
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

export const messagesApi = axios.create({
  baseURL: isDevelopment() ? '/api/messages' : `${API_BASE_URL}/api/messages`,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

export const usersApi = axios.create({
  baseURL: isDevelopment() ? '/api/users' : `${API_BASE_URL}/api/users`,
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Helper function to check if we're in development mode
function isDevelopment() {
  return import.meta.env.MODE === 'development';
}

/**
 * Add interceptors to an axios instance
 * @param {import('axios').AxiosInstance} instance - Axios instance
 * @param {string} name - Instance name for logging
 */
const addInterceptors = (instance, name) => {
  // Request interceptor
  instance.interceptors.request.use(
    (config) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔹 ${name} Request:`, {
          url: config.url,
          method: config.method?.toUpperCase(),
          headers: config.headers,
        });
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ ${name} Response:`, {
          url: response.config.url,
          status: response.status,
          data: response.data,
        });
      }
      return response;
    },
    (error) => {
      console.error("🔴 Response error:", {
        name,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });

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
  // Get persisted state first
  const persistedState = localStorage.getItem('authState');

  // Only clear auth state and redirect if we're not on a refresh/navigation
  // This prevents logout on page refresh or navigation
  const isPageRefresh = window.performance &&
                       (window.performance.getEntriesByType('navigation')[0]?.type === 'reload' ||
                        sessionStorage.getItem('pageRefreshed') === 'true');

  // Set flag for page refresh detection
  sessionStorage.setItem('pageRefreshed', 'false');

  if (document.visibilityState === 'visible' && !document.hidden && !isPageRefresh) {

    // Clear local storage auth data
    localStorage.removeItem('authState');
    toast.error(ERROR_MESSAGES.SESSION_EXPIRED);

    // Only redirect if not already on login page
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  } else if (persistedState) {
    // On refresh/navigation, keep the persisted state
    console.log("Auth error during page transition, keeping persisted state");
  }
};

// Add interceptors to instances
addInterceptors(axiosInstance, 'Auth API');
addInterceptors(messagesApi, 'Messages API');
addInterceptors(usersApi, 'Users API');

// For backward compatibility
export const authApi = axiosInstance;

export default axiosInstance;
