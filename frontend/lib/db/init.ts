// Database initialization script
// Frontend is read-only - it only queries data, doesn't create or modify
import { dbManager } from "./client";

export async function initializeDatabase() {
  try {
    await dbManager.connectAll();
    console.log("All database connections established successfully");
  } catch (error) {
    console.error("Failed to initialize database connections:", error);
    throw error;
  }
}

export async function closeDatabaseConnections() {
  try {
    await dbManager.disconnectAll();
    console.log("All database connections closed successfully");
  } catch (error) {
    console.error("Failed to close database connections:", error);
  }
}

/**
 * Get statistics for all databases
 */
export async function getAllDatabaseStats() {
  try {
    const networks = ["CORAL", "FOLLY", "CERISE"] as const;
    const stats: Record<string, any> = {};

    for (const network of networks) {
      const client = dbManager.getClient(network);
      stats[network] = await client.getStats();
    }

    return stats;
  } catch (error) {
    console.error("Failed to get database stats:", error);
    return {};
  }
}
