import mongoose from "mongoose";

export function dbConnection() {
  mongoose
    .connect(process.env.MONGO_URL)
    .then(() => {
      console.log("✅ MongoDB Connected Successfully");
    })
    .catch((error) => {
      console.error("❌ MongoDB Connection Failed:", error.message);
      // Retry after 5 seconds
      setTimeout(dbConnection, 5000);
    });

  // Handle disconnection events
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB Disconnected');
  });

  mongoose.connection.on('error', (error) => {
    console.error('🔴 MongoDB Error:', error.message);
  });
}