// Server-side database initialization for Next.js API routes
import { dbManager } from "./client";

let isInitialized = false;

export async function ensureDatabaseConnections() {
  if (!isInitialized) {
    try {
      await dbManager.connectAll();
      isInitialized = true;
      console.log("Database connections initialized successfully");
    } catch (error) {
      console.error("Failed to initialize database connections:", error);
      throw error;
    }
  }
}

// Initialize connections on module load for API routes
if (typeof window === "undefined") {
  // Only run on server side
  ensureDatabaseConnections().catch(console.error);
}
