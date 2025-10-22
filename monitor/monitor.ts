import { DatabaseClient } from "./database/client";
import { NetworkMonitor } from "./network-monitor";
import type { MonitorConfig } from "./utils/config";
import { Logger } from "./utils/logger";
import type { NetworkName } from "../client";

export class MonitorService {
  private databases: Map<string, DatabaseClient> = new Map();
  private monitors: Map<string, NetworkMonitor> = new Map();
  private logger: Logger;
  private config: MonitorConfig;
  private isRunning = false;

  constructor(config: MonitorConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn("Monitor service is already running");
      return;
    }

    this.logger.info("Starting monitor service");

    try {
      // Initialize databases for enabled networks
      await this.initializeDatabases();

      // Initialize monitors for enabled networks
      await this.initializeMonitors();

      // Start all monitors
      await this.startMonitors();

      this.isRunning = true;
      this.logger.info("Monitor service started successfully", {
        enabledNetworks: Object.entries(this.config.networks)
          .filter(([, enabled]) => enabled)
          .map(([network]) => network),
      });
    } catch (error) {
      this.logger.error("Failed to start monitor service", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info("Stopping monitor service");

    // Stop all monitors
    const stopPromises = Array.from(this.monitors.values()).map((monitor) =>
      monitor.stop()
    );
    await Promise.all(stopPromises);

    // Disconnect from all databases
    const disconnectPromises = Array.from(this.databases.values()).map((db) =>
      db.disconnect()
    );
    await Promise.all(disconnectPromises);

    this.isRunning = false;
    this.logger.info("Monitor service stopped");
  }

  private async initializeDatabases(): Promise<void> {
    const enabledNetworks = Object.entries(this.config.networks)
      .filter(([, enabled]) => enabled)
      .map(([network]) => network as NetworkName);

    for (const network of enabledNetworks) {
      const dbUrl =
        this.config.databaseUrls[
          network as keyof typeof this.config.databaseUrls
        ];
      const db = new DatabaseClient(dbUrl);

      // Connect to database
      await db.connect();

      // Check if tables exist, run migrations if needed
      const tablesExist = await db.checkTablesExist();
      if (!tablesExist) {
        this.logger.info(
          `Database tables not found for ${network}, running migrations...`
        );
        await db.runMigrations();
        this.logger.info(`Database migrations completed for ${network}`);
      }

      this.databases.set(network, db);
      this.logger.info(`Connected to database for ${network}`);
    }
  }

  private async initializeMonitors(): Promise<void> {
    const enabledNetworks = Object.entries(this.config.networks)
      .filter(([, enabled]) => enabled)
      .map(([network]) => network as NetworkName);

    for (const network of enabledNetworks) {
      const db = this.databases.get(network);
      if (!db) {
        throw new Error(`Database not initialized for network ${network}`);
      }

      const monitor = new NetworkMonitor(network, db, this.logger, {
        intervalMs: this.config.intervalMs,
        batchSize: this.config.batchSize,
        fullSync: this.config.fullSync,
        syncDelayMs: this.config.syncDelayMs,
      });

      this.monitors.set(network, monitor);
      this.logger.info(`Initialized monitor for ${network}`);
    }
  }

  private async startMonitors(): Promise<void> {
    const startPromises = Array.from(this.monitors.values()).map((monitor) =>
      monitor.start()
    );
    await Promise.all(startPromises);
  }

  async getStatus(): Promise<{
    service: {
      isRunning: boolean;
      enabledNetworks: string[];
      totalMonitors: number;
    };
    networks: Array<{
      network: string;
      isRunning: boolean;
      lastIntentId: number;
      processedIntentsCount: number;
      intervalMs: number;
    }>;
  }> {
    const networkStatuses = Array.from(this.monitors.values()).map((monitor) =>
      monitor.getStatus()
    );

    return {
      service: {
        isRunning: this.isRunning,
        enabledNetworks: Object.entries(this.config.networks)
          .filter(([, enabled]) => enabled)
          .map(([network]) => network),
        totalMonitors: this.monitors.size,
      },
      networks: networkStatuses,
    };
  }

  async getStats(): Promise<
    Array<{
      network: string;
      intentCount: number;
      fillCount: number;
      depositCount: number;
      lastSync: Date;
    }>
  > {
    const statsPromises = Array.from(this.monitors.values()).map((monitor) =>
      monitor.getStats()
    );
    return Promise.all(statsPromises);
  }

  async syncNetwork(
    network: NetworkName,
    startId?: number,
    endId?: number
  ): Promise<void> {
    const monitor = this.monitors.get(network);
    if (!monitor) {
      throw new Error(`Monitor for network ${network} not found`);
    }

    if (startId !== undefined && endId !== undefined) {
      await monitor.syncGap(startId, endId);
    } else {
      // Perform full sync for the network
      await monitor.start(); // This will trigger full sync if configured
    }

    this.logger.info(`Sync completed for network ${network}`, {
      startId,
      endId,
    });
  }

  async syncAllNetworks(): Promise<void> {
    this.logger.info("Starting sync for all networks");

    const syncPromises = Array.from(this.monitors.keys()).map((network) =>
      this.syncNetwork(network as NetworkName)
    );

    await Promise.all(syncPromises);
    this.logger.info("Sync completed for all networks");
  }

  getMonitor(network: NetworkName): NetworkMonitor | undefined {
    return this.monitors.get(network);
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    databases: Array<{ network: string; healthy: boolean }>;
    monitors: Array<{ network: string; healthy: boolean }>;
  }> {
    const databaseHealth = Array.from(this.databases.entries()).map(
      ([network, db]) => ({
        network,
        healthy: db.isHealthy(),
      })
    );

    const monitorHealth = Array.from(this.monitors.entries()).map(
      ([network, monitor]) => ({
        network,
        healthy: monitor.getStatus().isRunning,
      })
    );

    const allDatabasesHealthy = databaseHealth.every((d) => d.healthy);
    const allMonitorsHealthy = monitorHealth.every((m) => m.healthy);
    const healthy = allDatabasesHealthy && allMonitorsHealthy;

    return {
      healthy,
      databases: databaseHealth,
      monitors: monitorHealth,
    };
  }

  async restartNetwork(network: NetworkName): Promise<void> {
    const monitor = this.monitors.get(network);
    if (!monitor) {
      throw new Error(`Monitor for network ${network} not found`);
    }

    this.logger.info(`Restarting monitor for network ${network}`);

    await monitor.stop();
    await monitor.start();

    this.logger.info(`Monitor for network ${network} restarted`);
  }

  async restartAllNetworks(): Promise<void> {
    this.logger.info("Restarting all network monitors");

    const restartPromises = Array.from(this.monitors.keys()).map((network) =>
      this.restartNetwork(network as NetworkName)
    );

    await Promise.all(restartPromises);
    this.logger.info("All network monitors restarted");
  }
}
