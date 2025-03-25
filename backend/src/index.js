import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url"; // ✅ Fix __dirname in ES modules
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";
import passport from "./lib/passport.js"; // ✅ Ensure Passport is imported

dotenv.config();

const PORT = process.env.PORT || 5001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// ✅ Fix `__dirname` for ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(cookieParser());

// ✅ Allow CORS only for frontend
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true, // ✅ Allows sending cookies (JWT)
  })
);

// ✅ Initialize Passport (JWT-based authentication, no session needed)
app.use(passport.initialize());

// ✅ Connect to MongoDB before starting the server
connectDB()
  .then(() => {
    server.listen(PORT, () => console.log(`✅ Server running on PORT: ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Failed:", err);
    process.exit(1); // Stop if DB fails to connect
  });

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// ✅ Serve frontend in production
if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../public");

  app.use(express.static(frontendPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

// ✅ Only log Gmail credentials in development
if (process.env.NODE_ENV !== "production") {
  console.log("GMAIL USER:", process.env.GMAIL_USER);
  console.log("GMAIL PASS:", process.env.GMAIL_PASS ? "Loaded" : "Not Loaded");
}
