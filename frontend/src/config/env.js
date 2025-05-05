const isDevelopment = import.meta.env.MODE === 'development';

// Backend URLs
const BACKEND_URLS = {
  DEVELOPMENT: `http://localhost:${import.meta.env.VITE_BACKEND_PORT || 5001}`,
  PRODUCTION: 'https://gutargu.greenhacker.tech', // Production domain
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

  // Log configuration for debugging
  ...((() => {
    console.log('🔹 Config initialization:');
    console.log('  - isDevelopment:', isDevelopment);
    console.log('  - BACKEND_URLS.DEVELOPMENT:', BACKEND_URLS.DEVELOPMENT);
    console.log('  - BACKEND_URLS.PRODUCTION:', BACKEND_URLS.PRODUCTION);
    return {};
  })()),

  // Google Authentication
  GOOGLE: {
    CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    // Log the client ID during initialization to help with debugging
    ...((() => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      console.log('Loading Google Client ID:', clientId ? 'Found' : 'Missing');
      return {};
    })())
  },

  // Socket Configuration
  SOCKET: {
    URL: isDevelopment ? BACKEND_URLS.DEVELOPMENT : BACKEND_URLS.PRODUCTION,
    CONFIG: {
      withCredentials: true,
      transports: ['websocket', 'polling'], // Allow fallback to polling
      reconnectionAttempts: 10, // Increase reconnection attempts
      reconnectionDelay: 1000,
      timeout: 20000, // Increase timeout
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