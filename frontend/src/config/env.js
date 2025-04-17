const isDevelopment = import.meta.env.MODE === 'development';

// Backend URLs
const BACKEND_URLS = {
  DEVELOPMENT: `http://localhost:${import.meta.env.VITE_BACKEND_PORT || 5001}`,
  PRODUCTION: 'https://gutargu.greenhacker.tech', // Separate backend domain
};

// Frontend URLs
const FRONTEND_URLS = {
  DEVELOPMENT: 'http://localhost:5173',
  PRODUCTION: 'https://gutargu.greenhacker.tech', // Frontend domain
};

export const config = {
  // API Configuration
  API: {
    BASE_URL: isDevelopment ? BACKEND_URLS.DEVELOPMENT : BACKEND_URLS.PRODUCTION,
    AUTH_PATH: '/api/auth',
    MESSAGES_PATH: '/api/messages',
    TIMEOUT: 15000,
  },

  // Socket Configuration
  SOCKET: {
    URL: isDevelopment ? BACKEND_URLS.DEVELOPMENT : BACKEND_URLS.PRODUCTION,
    CONFIG: {
      withCredentials: true,
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    }
  },

  // Routes Configuration
  ROUTES: {
    // Auth Routes
    AUTH: {
      LOGIN: '/login',
      SIGNUP: '/signup',
      GOOGLE_CALLBACK: '/google-auth-success',
      VERIFY_EMAIL: '/verify/:id/:token',
      RESET_PASSWORD: '/reset-password/:token',
      FORGOT_PASSWORD: '/forgot-password',
    },
    // App Routes
    APP: {
      HOME: '/',
      CHAT: '/chat/:id?',
      PROFILE: '/profile',
      SETTINGS: '/settings',
    }
  },

  // Development Configuration
  DEV: {
    FRONTEND_URL: FRONTEND_URLS.DEVELOPMENT,
    BACKEND_URL: BACKEND_URLS.DEVELOPMENT,
  },

  // Production Configuration
  PROD: {
    FRONTEND_URL: FRONTEND_URLS.PRODUCTION,
    BACKEND_URL: BACKEND_URLS.PRODUCTION,
  }
};

export default config; 