#!/usr/bin/env node

import { DatabaseClient } from "./database/client";
import { MonitorService } from "./monitor";
import { loadConfig, validateConfig } from "./utils/config";
import { createLogger } from "./utils/logger";
import type { NetworkName } from "../client";

// CLI argument parsing
interface CLIArgs {
  network?: NetworkName;
  interval?: number;
  fullSync?: boolean;
  sync?: boolean;
  syncRange?: string;
  syncTransactions?: boolean;
  status?: boolean;
  stats?: boolean;
  health?: boolean;
  restart?: NetworkName;
  help?: boolean;
}

function parseArgs(): CLIArgs {
  const args: CLIArgs = {};

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];

    switch (arg) {
      case "--network":
        const network = process.argv[++i];
        if (network) {
          args.network = network as NetworkName;
        }
        break;
      case "--interval":
        const interval = process.argv[++i];
        if (interval) {
          args.interval = parseInt(interval);
        }
        break;
      case "--full-sync":
        args.fullSync = true;
        break;
      case "--sync":
        args.sync = true;
        break;
      case "--sync-range":
        const syncRange = process.argv[++i];
        if (syncRange) {
          args.syncRange = syncRange;
        }
        break;
      case "--sync-transactions":
        args.syncTransactions = true;
        break;
      case "--status":
        args.status = true;
        break;
      case "--stats":
        args.stats = true;
        break;
      case "--health":
        args.health = true;
        break;
      case "--restart":
        const restartNetwork = process.argv[++i];
        if (restartNetwork) {
          args.restart = restartNetwork as NetworkName;
        }
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`
Intent Monitor System

Usage: npm run monitor [options]

Options:
  --network <NETWORK>     Monitor specific network (CORAL, FOLLY, CERISE)
  --interval <MS>         Polling interval in milliseconds (default: 5000)
  --full-sync            Perform full historical sync on startup
  --sync                 Sync all networks once and exit
  --sync-range <RANGE>   Sync specific range (format: startId-endId)
  --sync-transactions    Sync all deposits and fills from first intent
  --status               Show monitor status and exit
  --stats                Show statistics and exit
  --health               Show health check and exit
  --restart <NETWORK>    Restart specific network monitor
  --help, -h             Show this help message

Examples:
  npm run monitor                           # Start monitoring all enabled networks
  npm run monitor --network CORAL          # Monitor only CORAL network
  npm run monitor --interval 10000         # Poll every 10 seconds
  npm run monitor --full-sync              # Full historical sync on startup
  npm run monitor --sync                   # Sync once and exit
  npm run monitor --sync-range 100-200     # Sync intents 100-200
  npm run monitor --status                 # Show status
  npm run monitor --stats                  # Show statistics
  npm run monitor --health                 # Health check
  npm run monitor --restart CORAL          # Restart CORAL monitor

Environment Variables:
  DATABASE_URL            PostgreSQL connection string (required)
  MONITOR_CORAL_ENABLED   Enable CORAL network monitoring (default: true)
  MONITOR_FOLLY_ENABLED   Enable FOLLY network monitoring (default: true)
  MONITOR_CERISE_ENABLED  Enable CERISE network monitoring (default: true)
  MONITOR_INTERVAL_MS     Polling interval in milliseconds (default: 5000)
  LOG_LEVEL              Log level: error, warn, info, debug (default: info)
  MONITOR_FULL_SYNC      Full sync on startup (default: false)
`);
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  try {
    // Load and validate configuration
    const config = loadConfig();

    // Override config with CLI args
    if (args.interval) {
      config.intervalMs = args.interval;
    }
    if (args.fullSync) {
      config.fullSync = true;
    }
    if (args.network) {
      // Enable only the specified network
      config.networks = {
        CORAL: args.network === "CORAL",
        FOLLY: args.network === "FOLLY",
        CERISE: args.network === "CERISE",
      };
    }

    validateConfig(config);

    // Create logger
    const logger = createLogger(config);
    logger.info("Intent Monitor System starting...", {
      config: {
        ...config,
        databaseUrls: {
          CORAL: config.databaseUrls.CORAL.replace(/:\/\/.*@/, "://***:***@"),
          FOLLY: config.databaseUrls.FOLLY.replace(/:\/\/.*@/, "://***:***@"),
          CERISE: config.databaseUrls.CERISE.replace(/:\/\/.*@/, "://***:***@"),
        },
      },
    });

    // Initialize monitor service
    const monitorService = new MonitorService(config, logger);

    // Handle different CLI modes
    if (args.status) {
      await monitorService.start();
      const status = await monitorService.getStatus();
      console.log(JSON.stringify(status, null, 2));
      await monitorService.stop();
      process.exit(0);
    }

    if (args.stats) {
      await monitorService.start();
      const stats = await monitorService.getStats();
      console.log(JSON.stringify(stats, null, 2));
      await monitorService.stop();
      process.exit(0);
    }

    if (args.health) {
      await monitorService.start();
      const health = await monitorService.healthCheck();
      console.log(JSON.stringify(health, null, 2));
      await monitorService.stop();
      process.exit(health.healthy ? 0 : 1);
    }

    if (args.restart) {
      await monitorService.start();
      await monitorService.restartNetwork(args.restart);
      logger.info(`Restarted monitor for network ${args.restart}`);
      await monitorService.stop();
      process.exit(0);
    }

    if (args.sync) {
      await monitorService.start();

      if (args.syncRange) {
        const [startStr, endStr] = args.syncRange.split("-");
        const startId = parseInt(startStr || "0");
        const endId = parseInt(endStr || "0");

        if (isNaN(startId) || isNaN(endId)) {
          throw new Error("Invalid sync range format. Use: startId-endId");
        }

        const enabledNetworks = Object.entries(config.networks)
          .filter(([, enabled]) => enabled)
          .map(([network]) => network as NetworkName);

        for (const network of enabledNetworks) {
          await monitorService.syncNetwork(network, startId, endId);
        }
      } else {
        await monitorService.syncAllNetworks();
      }

      await monitorService.stop();
      logger.info("Sync completed");
      process.exit(0);
    }

    if (args.syncTransactions) {
      await monitorService.start();

      const enabledNetworks = Object.entries(config.networks)
        .filter(([, enabled]) => enabled)
        .map(([network]) => network as NetworkName);

      for (const network of enabledNetworks) {
        logger.info(`Syncing transactions for network ${network}`);
        await monitorService.syncNetworkTransactions(network);
      }

      await monitorService.stop();
      logger.info("Transaction sync completed");
      process.exit(0);
    }

    // Normal monitoring mode
    await monitorService.start();

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      try {
        await monitorService.stop();
        logger.info("Shutdown completed");
        process.exit(0);
      } catch (error) {
        logger.error("Error during shutdown", {
          error: error instanceof Error ? error.message : String(error),
        });
        process.exit(1);
      }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // Keep the process alive
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught exception", {
        error: error.message,
        stack: error.stack,
      });
      shutdown("uncaughtException");
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled rejection", { reason: String(reason), promise });
      shutdown("unhandledRejection");
    });

    logger.info("Monitor service is running. Press Ctrl+C to stop.");
  } catch (error) {
    console.error(
      "Fatal error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    console.error(
      "Unhandled error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  });
}

export { MonitorService, DatabaseClient };
