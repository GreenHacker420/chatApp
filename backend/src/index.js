import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import adminRoutes from "./routes/admin.route.js";
import usersRoutes from "./routes/users.route.js";
import { app, server } from "./lib/socket.js";
import passport from "./lib/passport.js";
import healthRouter from './routes/health.route.js';

// Add global error handlers for uncaught exceptions and unhandled rejections
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
  // In production, we log but don't exit to keep the service running
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at Promise:', promise, 'reason:', reason);
  // In production, we log but don't exit to keep the service running
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

dotenv.config();

const PORT = process.env.PORT || 5001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// ✅ Fix `__dirname` for ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(cookieParser());

// Improved CORS configuration for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [
        process.env.FRONTEND_URL,
        'https://gutargu.up.railway.app',
        'https://gutargu.greenhacker.tech',
        /\.railway\.app$/,  // Allow all Railway subdomains
        /\.greenhacker\.tech$/  // Allow all greenhacker.tech subdomains
      ]
    : FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

app.use(passport.initialize());

// ✅ Connect to MongoDB before starting the server
connectDB()
  .then(() => {
    server.listen(PORT, () => console.log(`✅ Server running on PORT: ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Failed:", err);
    process.exit(1);
  });

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`🔹 ${req.method} ${req.path}`);
  next();
});

// Add a root path handler for Railway health checks
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'GutarGu API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);
app.use("/health", healthRouter);

// ✅ Serve frontend in production
if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../public");

  console.log('✅ Serving static files from:', frontendPath);

  // Serve static files
  app.use(express.static(frontendPath));

  // Add a catch-all route handler for client-side routing
  app.get("*", (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/') || req.path === '/health') {
      return res.status(404).json({ message: 'API endpoint not found' });
    }

    const indexPath = path.join(frontendPath, "index.html");
    console.log(`🔹 Serving index.html for path: ${req.path}`);
    res.sendFile(indexPath);
  });
}

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Express error:', err);
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});
