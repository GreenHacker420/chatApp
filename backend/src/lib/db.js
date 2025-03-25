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

let retryCount = 0;
const MAX_RETRIES = 5;

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });

    console.log(`✅ MongoDB Connected`);
    retryCount = 0; // ✅ Reset retry count after successful connection
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);

    if (retryCount < MAX_RETRIES) {
      retryCount++;
      console.warn(`⚠️ Retrying connection in 5 seconds... Attempt ${retryCount}/${MAX_RETRIES}`);
      setTimeout(connectDB, 5000);
    } else {
      console.error("❌ Maximum retry attempts reached. Exiting process.");
      process.exit(1);
    }
  }
};
