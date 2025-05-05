import dotenv from 'dotenv';
dotenv.config();

const isDevelopment = process.env.NODE_ENV === 'development';

// Frontend URLs
const FRONTEND_URLS = {
  DEVELOPMENT: 'http://localhost:5173',
  PRODUCTION: 'https://gutargu.greenhacker.tech',
};

// Port Configuration
const PORTS = {
  FRONTEND: isDevelopment ? 5173 : 80,
  BACKEND: process.env.PORT || 5001,
};

export const config = {
  // Server Configuration
  SERVER: {
    PORT: PORTS.BACKEND,
    HOST: isDevelopment ? 'localhost' : '0.0.0.0',
  },

  // Database Configuration
  DB: {
    URI: process.env.MONGODB_URI,
    OPTIONS: {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority',
      ssl: true,
      tls: true,
    },
  },

  // CORS Configuration
  CORS: {
    ORIGIN: isDevelopment
      ? [FRONTEND_URLS.DEVELOPMENT]
      : [FRONTEND_URLS.PRODUCTION],
    CREDENTIALS: true,
    METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    ALLOWED_HEADERS: ['Content-Type', 'Authorization'],
  },

  // Cookie Configuration
  COOKIE: {
    SECRET: process.env.COOKIE_SECRET,
    OPTIONS: {
      httpOnly: true,
      secure: !isDevelopment,
      sameSite: isDevelopment ? 'lax' : 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      domain: isDevelopment ? 'localhost' : '.gutargu.greenhacker.tech', // Allow sharing between subdomains
    },
  },

  // JWT Configuration
  JWT: {
    SECRET: process.env.JWT_SECRET,
    EXPIRES_IN: '7d',
  },

  // Google OAuth Configuration
  GOOGLE: {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    CALLBACK_URL: isDevelopment
      ? `http://localhost:${PORTS.BACKEND}/api/auth/google/callback`
      : `https://gutargu.greenhacker.tech/api/auth/google/callback`,
    AUTH_URL: isDevelopment
      ? `http://localhost:${PORTS.BACKEND}/api/auth/google`
      : `https://gutargu.greenhacker.tech/api/auth/google`,
  },

  // Email Configuration
  EMAIL: {
    SERVICE: process.env.EMAIL_SERVICE || process.env.SERVICE || 'gmail',
    USER: process.env.EMAIL_USER || process.env.GMAIL_USER,
    PASS: process.env.EMAIL_PASS || process.env.GMAIL_PASS,
    FROM: 'noreply@gutargu.greenhacker.tech', // Default value
    HOST: process.env.EMAIL_HOST || process.env.HOST || 'smtp.gmail.com',
    PORT: process.env.EMAIL_PORT || process.env.PORT || 465,
    SECURE: process.env.EMAIL_SECURE || process.env.SECURE || true,
  },

  // Cloudinary Configuration
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    API_KEY: process.env.CLOUDINARY_API_KEY,
    API_SECRET: process.env.CLOUDINARY_API_SECRET,
  },

  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
  },

  // Client URLs
  CLIENT: {
    URL: isDevelopment ? FRONTEND_URLS.DEVELOPMENT : FRONTEND_URLS.PRODUCTION,
    PORTS: PORTS,
  },
};

export default config;