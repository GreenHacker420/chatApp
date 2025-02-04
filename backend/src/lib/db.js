import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds if DB is unresponsive
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    
    // Exit process with failure if DB connection fails in production
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
};

// Close connection on app termination (useful in production)
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("🔴 MongoDB Disconnected due to app termination");
  process.exit(0);
});
