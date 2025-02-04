import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import session from "express-session"; // ✅ Added for session handling
import passport from "./lib/passport.js"; // ✅ Import Passport Config
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT || 5001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const __dirname = path.resolve();

// ✅ Session Setup (for maintaining user sessions)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // Secure cookies in production
      httpOnly: true, // Prevents XSS attacks
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days session expiry
    },
  })
);

// ✅ Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

// Connect to MongoDB before starting the server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`✅ Server is running on PORT: ${PORT}`);
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// Log only in development
if (process.env.NODE_ENV !== "production") {
  console.log("GMAIL USER:", process.env.GMAIL_USER);
  console.log("GMAIL PASS:", process.env.GMAIL_PASS ? "Loaded" : "Not Loaded");
}
