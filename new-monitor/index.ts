import { Monitor } from "./monitor";
import type { NetworkName } from "./client/client";

/**
 * New Monitor Entry Point
 * Monitors intents and transactions for Arcana networks
 */

async function main() {
  // Get network from environment or default to CORAL
  const network = (process.env.NETWORK || "CORAL") as NetworkName;

  // Get database URL from environment
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL environment variable is required");
    console.error("Example: DATABASE_URL=postgresql://user:pass@host/db");
    process.exit(1);
  }

  console.log(`Starting monitor for ${network} network...\n`);

  try {
    // Initialize monitor
    const monitor = new Monitor(network, databaseUrl);
    await monitor.initialize();

    // Compare intent IDs between database and network
    const comparison = await monitor.compareIntentIds();

    // If there's a gap, sync intents
    if (comparison.needsSync) {
      console.log(
        `Found ${comparison.gap} intents to sync. Starting sync...\n`
      );
      const syncResult = await monitor.syncAllIntents();

      console.log(`Intent Sync Summary:`);
      console.log(`  ✓ Successfully synced ${syncResult.inserted} intents`);
      if (syncResult.failed > 0) {
        console.log(`  ✗ Failed to sync ${syncResult.failed} intents`);
      }
    } else {
      console.log(`✓ Intents are up to date!\n`);
    }

    // Sync all transactions (fills and deposits)
    console.log(`Syncing transactions...\n`);
    const transactionResults = await monitor.syncAllTransactions();

    console.log(`Transaction Sync Summary:`);
    console.log(
      `  ✓ Fills synced: ${transactionResults.fills.inserted}/${transactionResults.fills.fetched}`
    );
    console.log(
      `  ✓ Deposits synced: ${transactionResults.deposits.inserted}/${transactionResults.deposits.fetched}`
    );
    if (
      transactionResults.fills.failed > 0 ||
      transactionResults.deposits.failed > 0
    ) {
      console.log(
        `  ✗ Failed: ${transactionResults.fills.failed} fills, ${transactionResults.deposits.failed} deposits`
      );
    }

    // Display database stats after sync
    const stats = await monitor.getStats();
    if (stats) {
      console.log(`\nFinal Database Statistics:`);
      console.log(`  Total intents:  ${stats.intent_count}`);
      console.log(`  Total fills:    ${stats.fill_count}`);
      console.log(`  Total deposits: ${stats.deposit_count}`);
      console.log(`  Last update:    ${stats.last_update || "Never"}\n`);
    }

    // Start monitoring loop to keep pending intents updated
    console.log(`Starting continuous monitoring...\n`);

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      console.log("\n\nReceived SIGINT, stopping monitor...");
      monitor.stopMonitoring();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      console.log("\n\nReceived SIGTERM, stopping monitor...");
      monitor.stopMonitoring();
      process.exit(0);
    });

    // Start the monitoring loop
    await monitor.startMonitoring();
  } catch (error) {
    console.error("ERROR:", error);
    process.exit(1);
  }
}

// Run the monitor
main().catch(console.error);
