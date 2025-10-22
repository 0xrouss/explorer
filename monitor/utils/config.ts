import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export interface MonitorConfig {
  databaseUrls: {
    CORAL: string;
    FOLLY: string;
    CERISE: string;
  };
  networks: {
    CORAL: boolean;
    FOLLY: boolean;
    CERISE: boolean;
  };
  intervalMs: number;
  logLevel: string;
  fullSync: boolean;
  batchSize: number;
  syncDelayMs: number;
}

export function loadConfig(): MonitorConfig {
  const coralUrl = process.env.DATABASE_URL_CORAL;
  const follyUrl = process.env.DATABASE_URL_FOLLY;
  const ceriseUrl = process.env.DATABASE_URL_CERISE;

  // Fallback to single DATABASE_URL if separate URLs not provided
  const fallbackUrl = process.env.DATABASE_URL;

  if (!fallbackUrl && (!coralUrl || !follyUrl || !ceriseUrl)) {
    throw new Error(
      "Either DATABASE_URL or separate DATABASE_URL_CORAL/FOLLY/CERISE environment variables are required"
    );
  }

  return {
    databaseUrls: {
      CORAL: coralUrl || fallbackUrl || "",
      FOLLY: follyUrl || fallbackUrl || "",
      CERISE: ceriseUrl || fallbackUrl || "",
    },
    networks: {
      CORAL: process.env.MONITOR_CORAL_ENABLED === "true",
      FOLLY: process.env.MONITOR_FOLLY_ENABLED === "true",
      CERISE: process.env.MONITOR_CERISE_ENABLED === "true",
    },
    intervalMs: parseInt(process.env.MONITOR_INTERVAL_MS || "5000"),
    logLevel: process.env.LOG_LEVEL || "info",
    fullSync: process.env.MONITOR_FULL_SYNC === "true",
    batchSize: parseInt(process.env.MONITOR_BATCH_SIZE || "20"),
    syncDelayMs: parseInt(process.env.MONITOR_SYNC_DELAY_MS || "500"),
  };
}

export function validateConfig(config: MonitorConfig): void {
  const enabledNetworks = Object.values(config.networks).filter(Boolean).length;

  if (enabledNetworks === 0) {
    throw new Error("At least one network must be enabled");
  }

  if (config.intervalMs < 1000) {
    throw new Error("Monitor interval must be at least 1000ms");
  }

  if (config.intervalMs > 300000) {
    throw new Error("Monitor interval should not exceed 300000ms (5 minutes)");
  }

  console.log("Configuration validated:", {
    enabledNetworks,
    networks: config.networks,
    intervalMs: config.intervalMs,
    logLevel: config.logLevel,
    fullSync: config.fullSync,
    batchSize: config.batchSize,
    syncDelayMs: config.syncDelayMs,
  });
}
