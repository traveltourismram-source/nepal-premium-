import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ ERROR: MONGODB_URI is not set in backend/.env");
  process.exit(1);
}

// Connect to MongoDB
export function initSchema() {
  mongoose
    .connect(MONGODB_URI!)
    .then(() => {
      console.log("🔌 Connected successfully to MongoDB Cluster");
    })
    .catch((err) => {
      console.error("❌ MongoDB connection error:", err);
      process.exit(1);
    });
}

// Export the mongoose connection as db
export const db = mongoose.connection;
