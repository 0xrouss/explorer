import { Pool, type PoolClient } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

export class DatabaseClient {
  private pool: Pool;
  private isConnected = false;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 20, // Maximum number of connections in the pool
      idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    });

    // Handle pool errors
    this.pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
    });
  }

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query("SELECT 1"); // Test the connection
      client.release();
      this.isConnected = true;
      console.log("Database connected successfully");
    } catch (error) {
      console.error("Failed to connect to database:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.pool.end();
      this.isConnected = false;
      console.log("Database disconnected");
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    if (!this.isConnected) {
      throw new Error("Database not connected");
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log("Executed query", { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error("Database query error:", { text, params, error });
      throw error;
    }
  }

  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async runMigrations(): Promise<void> {
    try {
      console.log("Running database migrations...");

      // Read and execute schema.sql
      const schemaPath = join(__dirname, "schema.sql");
      const schema = readFileSync(schemaPath, "utf8");

      await this.query(schema);
      console.log("Database schema applied successfully");
    } catch (error) {
      console.error("Migration failed:", error);
      throw error;
    }
  }

  async checkTablesExist(): Promise<boolean> {
    try {
      const result = await this.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'intents'
        );
      `);
      return result.rows[0].exists;
    } catch (error) {
      console.error("Error checking if tables exist:", error);
      return false;
    }
  }

  async getLastIntentId(network: string): Promise<number | null> {
    try {
      const result = await this.query(
        "SELECT COALESCE(MAX(id), 0) as last_id FROM intents WHERE network = $1",
        [network]
      );
      return result.rows[0].last_id;
    } catch (error) {
      console.error(
        `Error getting last intent ID for network ${network}:`,
        error
      );
      return null;
    }
  }

  async getIntentCount(network: string): Promise<number> {
    try {
      const result = await this.query(
        "SELECT COUNT(*) as count FROM intents WHERE network = $1",
        [network]
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error(
        `Error getting intent count for network ${network}:`,
        error
      );
      return 0;
    }
  }

  getPool(): Pool {
    return this.pool;
  }

  isHealthy(): boolean {
    return this.isConnected && !this.pool.ended;
  }
}
