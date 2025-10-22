import { neon, neonConfig } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Database client for Neon serverless Postgres
 * Optimized for serverless environments with connection pooling
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
   * Run database migrations (schema setup)
   */
  async runMigrations(): Promise<void> {
    try {
      console.log("Running database migrations...");

      const schemaPath = join(__dirname, "schema.sql");
      const schema = readFileSync(schemaPath, "utf8");

      // Split SQL into individual statements more intelligently
      // This handles functions with $$ delimiters and multi-line statements
      const statements = this.splitSqlStatements(schema);

      for (const statement of statements) {
        if (statement.trim().length > 0) {
          try {
            await this.sql(statement);
          } catch (error: any) {
            // Ignore "already exists" errors
            if (!error.message?.includes("already exists")) {
              console.error("Statement failed:", statement.substring(0, 100));
              throw error;
            }
          }
        }
      }

      console.log("Database migrations completed successfully");
    } catch (error) {
      console.error("Migration failed:", error);
      throw error;
    }
  }

  /**
   * Split SQL into individual statements, handling functions and triggers
   */
  private splitSqlStatements(sql: string): string[] {
    const statements: string[] = [];
    let current = "";
    let inFunction = false;

    const lines = sql.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments
      if (trimmed.startsWith("--")) {
        continue;
      }

      // Track if we're inside a function definition
      if (trimmed.includes("$$") || trimmed.includes("$$ LANGUAGE")) {
        inFunction = !inFunction;
      }

      current += line + "\n";

      // Split on semicolon only if not in a function
      if (trimmed.endsWith(";") && !inFunction) {
        statements.push(current.trim());
        current = "";
      }
    }

    // Add any remaining statement
    if (current.trim()) {
      statements.push(current.trim());
    }

    return statements;
  }

  /**
   * Check if tables exist
   */
  async checkTablesExist(): Promise<boolean> {
    try {
      const result = (await this.sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'intents'
        ) as exists;
      `) as Array<{ exists: boolean }>;
      return result[0]?.exists || false;
    } catch (error) {
      console.error("Error checking if tables exist:", error);
      return false;
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
