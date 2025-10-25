import { neon, neonConfig } from "@neondatabase/serverless";
import type { NetworkType } from "@/types";

/**
 * Database client for Neon serverless Postgres
 * Read-only client optimized for serverless environments
 * Used by the frontend explorer to query network data
 */
export class DatabaseClient {
  private sql: ReturnType<typeof neon>;
  private connectionString: string;
  private isConnected = false;

  constructor(connectionString: string) {
    this.connectionString = connectionString;

    // Configure Neon for optimal performance
    neonConfig.fetchConnectionCache = true;

    this.sql = neon(connectionString);
  }

  /**
   * Test database connection
   */
  async connect(): Promise<void> {
    try {
      await this.sql`SELECT 1`;
      this.isConnected = true;
      console.log("Database connected successfully");
    } catch (error) {
      console.error("Failed to connect to database:", error);
      throw error;
    }
  }

  /**
   * Get the Neon SQL client for direct queries
   */
  getClient() {
    return this.sql;
  }

  /**
   * Execute a raw query
   */
  async query<T = any>(queryString: string, params?: any[]): Promise<T[]> {
    if (!this.isConnected) {
      throw new Error("Database not connected");
    }

    try {
      // Neon uses tagged template literals, but we can pass parameterized queries
      if (params && params.length > 0) {
        // Convert positional parameters to Neon format
        return (await this.sql(queryString, params)) as T[];
      }
      return (await this.sql(queryString)) as T[];
    } catch (error) {
      console.error("Database query error:", error);
      throw error;
    }
  }

  /**
   * Begin a transaction
   */
  async transaction<T>(
    callback: (sql: ReturnType<typeof neon>) => Promise<T>
  ): Promise<T> {
    // Neon automatically handles transactions with the sql function
    return callback(this.sql);
  }

  /**
   * Health check
   */
  isHealthy(): boolean {
    return this.isConnected;
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const result = (await this.sql`
      SELECT 
        (SELECT COUNT(*) FROM intents) as intent_count,
        (SELECT COUNT(*) FROM fill_transactions) as fill_count,
        (SELECT COUNT(*) FROM deposit_transactions) as deposit_count,
        (SELECT MAX(id) FROM intents) as max_intent_id,
        (SELECT MAX(updated_at) FROM intents) as last_update
    `) as Array<{
      intent_count: number;
      fill_count: number;
      deposit_count: number;
      max_intent_id: number | null;
      last_update: Date | null;
    }>;
    return result[0];
  }
}

// Database connection manager for FULLY network
class DatabaseManager {
  private connection: DatabaseClient | null = null;

  constructor() {
    this.initializeConnection();
  }

  private initializeConnection(): void {
    const fullyUrl = process.env.DATABASE_URL_FULLY;
    const fallbackUrl = process.env.DATABASE_URL;

    // For development, use fallback URLs if specific network URLs are not set
    const defaultUrl = "postgresql://user:password@localhost:5432/nexus_db";

    this.connection = new DatabaseClient(fullyUrl || fallbackUrl || defaultUrl);
  }

  getClient(network: NetworkType): DatabaseClient {
    if (!this.connection) {
      throw new Error(
        `No database connection configured for network: ${network}`
      );
    }
    return this.connection;
  }

  async connectAll(): Promise<void> {
    if (this.connection) {
      await this.connection.connect();
    }
  }

  async disconnectAll(): Promise<void> {
    // Neon is serverless and doesn't need explicit disconnection
    console.log(
      "Neon connections are serverless - no explicit disconnect needed"
    );
  }

  isHealthy(network?: NetworkType): boolean {
    return this.connection ? this.connection.isHealthy() : false;
  }
}

// Singleton instance
export const dbManager = new DatabaseManager();
