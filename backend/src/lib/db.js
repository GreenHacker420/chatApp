// import mongoose from "mongoose";

// export const connectDB = async () => {
//   try {
//     const conn = await mongoose.connect(process.env.MONGODB_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//       serverSelectionTimeoutMS: 5000, // ✅ Timeout after 5 seconds if DB is unresponsive
//       autoIndex: false, // ✅ Disable auto-indexing in production for performance
//       maxPoolSize: 10, // ✅ Maintain up to 10 socket connections
//     });

//     console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
//   } catch (error) {
//     console.error("❌ MongoDB Connection Error:", error.message);

//     // Exit process with failure if DB connection fails in production
//     if (process.env.NODE_ENV === "production") {
//       process.exit(1);
//     }
//   }
// };

// // ✅ Handle MongoDB Connection Events
// mongoose.connection.on("disconnected", () => {
//   console.warn("⚠️ MongoDB Disconnected. Attempting to reconnect...");
//   connectDB();
// });

// mongoose.connection.on("error", (err) => {
//   console.error("❌ MongoDB Connection Error:", err.message);
// });

// // ✅ Close MongoDB Connection on App Termination
// process.on("SIGINT", async () => {
//   await mongoose.connection.close();
//   console.log("🔴 MongoDB Disconnected due to app termination");
//   process.exit(0);
// });


import mongoose from "mongoose";
import { config } from "../config/env.js";

let retries = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;

/**
 * Connect to MongoDB Atlas
 * @returns {Promise<void>}
 */
export const connectDB = async () => {
  try {
    console.log("🔹 Connecting to MongoDB Atlas...");
    
    const conn = await mongoose.connect(config.DB.URI, config.DB.OPTIONS);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
      retryConnection();
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected. Attempting to reconnect...");
      retryConnection();
    });

    // Reset retries on successful connection
    retries = 0;

  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error.message);
    retryConnection();
  }
};

/**
 * Retry connection with exponential backoff
 */
const retryConnection = () => {
  if (retries < MAX_RETRIES) {
    retries++;
    const delay = RETRY_DELAY * Math.pow(2, retries - 1);
    console.log(`🔄 Retrying connection in ${delay / 1000} seconds... (Attempt ${retries}/${MAX_RETRIES})`);
    
    setTimeout(async () => {
      try {
        await connectDB();
      } catch (error) {
        console.error(`❌ Retry attempt ${retries} failed:`, error.message);
      }
    }, delay);
  } else {
    console.error("❌ Maximum retry attempts reached. Please check your MongoDB connection settings.");
    process.exit(1);
  }
};

/**
 * Gracefully close MongoDB connection
 */
export const closeDB = async () => {
  try {
    await mongoose.connection.close();
    console.log("✅ MongoDB connection closed gracefully");
  } catch (error) {
    console.error("❌ Error closing MongoDB connection:", error.message);
    process.exit(1);
  }
};

// Handle process termination
process.on("SIGINT", async () => {
  await closeDB();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeDB();
  process.exit(0);
});

export default connectDB;
