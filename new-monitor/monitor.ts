import { ArcanaClient, type NetworkName, type Intent } from "./client/client";
import {
  DatabaseClient,
  IntentRepository,
  FillRepository,
  DepositRepository,
  type IntentRow,
} from "./database";

/**
 * Monitor for a single network
 * Tracks intents and transactions, keeping the database in sync
 */
export class Monitor {
  private network: NetworkName;
  private client: ArcanaClient;
  private db: DatabaseClient;
  private intentRepo: IntentRepository;
  private fillRepo: FillRepository;
  private depositRepo: DepositRepository;
  private isRunning = false;
  private pollIntervalMs = 10000; // 10 seconds

  constructor(network: NetworkName, databaseUrl: string) {
    this.network = network;
    this.client = new ArcanaClient(network);
    this.db = new DatabaseClient(databaseUrl);
    this.intentRepo = new IntentRepository(this.db);
    this.fillRepo = new FillRepository(this.db);
    this.depositRepo = new DepositRepository(this.db);
  }

  /**
   * Initialize the monitor
   */
  async initialize(): Promise<void> {
    console.log(`[${this.network}] Initializing monitor...`);

    // Connect to database
    await this.db.connect();
    console.log(`[${this.network}] ✓ Connected to database`);

    // Check if tables exist, run migrations if needed
    const tablesExist = await this.db.checkTablesExist();
    if (!tablesExist) {
      console.log(`[${this.network}] Running database migrations...`);
      await this.db.runMigrations();
      console.log(`[${this.network}] ✓ Migrations completed`);
    }

    console.log(`[${this.network}] ✓ Monitor initialized`);
  }

  /**
   * Get the maximum intent ID from the database
   */
  async getMaxIntentIdFromDatabase(): Promise<number> {
    const maxId = await this.intentRepo.getMaxIntentId();
    console.log(`[${this.network}] Max intent ID in database: ${maxId}`);
    return maxId;
  }

  /**
   * Get the maximum intent ID from the network
   */
  async getMaxIntentIdFromNetwork(): Promise<number> {
    console.log(`[${this.network}] Querying latest intents from network...`);

    // Query a batch of intents (they come in reverse order, so first is the latest)
    const intents = await this.client.queryIntents(50, 0);

    if (intents.length === 0) {
      console.log(`[${this.network}] No intents found on network`);
      return 0;
    }

    // Since queryIntents uses reverse: true, the first intent has the highest ID
    const maxId = intents[0]!.id;
    console.log(`[${this.network}] Max intent ID on network: ${maxId}`);

    return maxId;
  }

  /**
   * Compare database and network intent IDs
   */
  async compareIntentIds(): Promise<{
    databaseMaxId: number;
    networkMaxId: number;
    gap: number;
    needsSync: boolean;
  }> {
    const [databaseMaxId, networkMaxId] = await Promise.all([
      this.getMaxIntentIdFromDatabase(),
      this.getMaxIntentIdFromNetwork(),
    ]);

    const gap = networkMaxId - databaseMaxId;
    const needsSync = gap > 0;

    console.log(`\n[${this.network}] Sync Status:`);
    console.log(`  Database max: ${databaseMaxId}`);
    console.log(`  Network max:  ${networkMaxId}`);
    console.log(`  Gap:          ${gap} intents`);
    console.log(`  Needs sync:   ${needsSync ? "YES" : "NO"}\n`);

    return {
      databaseMaxId,
      networkMaxId,
      gap,
      needsSync,
    };
  }

  /**
   * Get database statistics
   */
  async getStats() {
    return await this.db.getStats();
  }

  /**
   * Sync all intents from the network to the database
   */
  async syncAllIntents(): Promise<{
    fetched: number;
    inserted: number;
    failed: number;
  }> {
    console.log(`\n[${this.network}] Starting full intent sync...`);

    try {
      // Get the current max from network to know how many to fetch
      const networkMaxId = await this.getMaxIntentIdFromNetwork();

      if (networkMaxId === 0) {
        console.log(`[${this.network}] No intents to sync`);
        return { fetched: 0, inserted: 0, failed: 0 };
      }

      // Query all intents from the network
      console.log(
        `[${this.network}] Fetching all ${networkMaxId} intents from network...`
      );
      const intents = await this.client.queryIntents(networkMaxId);

      console.log(`[${this.network}] ✓ Fetched ${intents.length} intents`);

      // Insert all intents into the database
      console.log(`[${this.network}] Inserting intents into database...`);

      let inserted = 0;
      let failed = 0;

      for (const intent of intents) {
        try {
          await this.intentRepo.upsertIntent(intent);
          inserted++;

          // Log progress every 50 intents
          if (inserted % 50 === 0) {
            console.log(
              `[${this.network}] Progress: ${inserted}/${intents.length} intents inserted`
            );
          }
        } catch (error) {
          failed++;
          console.error(
            `[${this.network}] Failed to insert intent ${intent.id}:`,
            error
          );
        }
      }

      console.log(`\n[${this.network}] ✓ Sync completed!`);
      console.log(`  Fetched:  ${intents.length}`);
      console.log(`  Inserted: ${inserted}`);
      console.log(`  Failed:   ${failed}\n`);

      return {
        fetched: intents.length,
        inserted,
        failed,
      };
    } catch (error) {
      console.error(`[${this.network}] Sync failed:`, error);
      throw error;
    }
  }

  /**
   * Check if an intent is pending (not fulfilled, not refunded, and not expired)
   */
  private isIntentPending(intent: IntentRow): boolean {
    // Check if fulfilled or refunded
    if (intent.fulfilled || intent.refunded) {
      return false;
    }

    // Check if expired (expiry is Unix timestamp in seconds)
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (currentTimestamp >= intent.expiry) {
      return false;
    }

    return true;
  }

  /**
   * Get all pending intents from the database
   */
  private async getPendingIntents(): Promise<IntentRow[]> {
    const sql = this.db.getClient();

    // Get intents that are not fulfilled and not refunded
    const intents = (await sql`
      SELECT * FROM intents 
      WHERE fulfilled = false 
        AND refunded = false
      ORDER BY id ASC
    `) as IntentRow[];

    // Filter by expiry (not expired)
    const currentTimestamp = Math.floor(Date.now() / 1000);
    return intents.filter((intent) => intent.expiry > currentTimestamp);
  }

  /**
   * Check if an intent has changed
   */
  private hasIntentChanged(
    dbIntent: IntentRow,
    networkIntent: Intent
  ): boolean {
    return (
      dbIntent.deposited !== networkIntent.deposited ||
      dbIntent.fulfilled !== networkIntent.fulfilled ||
      dbIntent.refunded !== networkIntent.refunded ||
      dbIntent.fulfilled_by !== networkIntent.fulfilledBy ||
      dbIntent.fulfilled_at !== networkIntent.fulfilledAt
    );
  }

  /**
   * Update pending intents by checking their status on the network
   */
  async updatePendingIntents(): Promise<{
    checked: number;
    updated: number;
    expired: number;
    notFound: number;
  }> {
    try {
      // Get all pending intents from database
      const pendingIntents = await this.getPendingIntents();

      if (pendingIntents.length === 0) {
        return { checked: 0, updated: 0, expired: 0, notFound: 0 };
      }

      console.log(
        `[${this.network}] Checking ${pendingIntents.length} pending intents...`
      );

      // Fetch all intents from the network at once
      const networkMaxId = await this.getMaxIntentIdFromNetwork();
      console.log(
        `[${this.network}] Fetching all ${networkMaxId} intents from network...`
      );
      const allNetworkIntents = await this.client.queryIntents(networkMaxId);

      // Create a map for fast lookup by intent ID
      const networkIntentsMap = new Map<number, Intent>();
      for (const intent of allNetworkIntents) {
        networkIntentsMap.set(intent.id, intent);
      }

      console.log(
        `[${this.network}] Comparing ${pendingIntents.length} pending intents with network data...`
      );

      let updated = 0;
      let expired = 0;
      let notFound = 0;
      const currentTimestamp = Math.floor(Date.now() / 1000);

      // Compare each pending intent with network data
      for (const dbIntent of pendingIntents) {
        try {
          // Check if expired
          if (currentTimestamp >= dbIntent.expiry) {
            expired++;
            continue;
          }

          // Look up the intent in the network data
          const networkIntent = networkIntentsMap.get(dbIntent.id);

          if (!networkIntent) {
            console.warn(
              `[${this.network}] Intent ${dbIntent.id} not found on network`
            );
            notFound++;
            continue;
          }

          // Check if the intent has changed
          if (this.hasIntentChanged(dbIntent, networkIntent)) {
            await this.intentRepo.upsertIntent(networkIntent);
            updated++;

            const status = networkIntent.fulfilled
              ? "fulfilled"
              : networkIntent.refunded
              ? "refunded"
              : networkIntent.deposited
              ? "deposited"
              : "pending";

            console.log(
              `[${this.network}] Updated intent ${dbIntent.id}: ${status}`
            );
          }
        } catch (error) {
          console.error(
            `[${this.network}] Failed to process intent ${dbIntent.id}:`,
            error
          );
        }
      }

      if (updated > 0 || expired > 0 || notFound > 0) {
        console.log(
          `[${this.network}] Pending intents update: ${updated} updated, ${expired} expired, ${notFound} not found`
        );
      }

      return {
        checked: pendingIntents.length,
        updated,
        expired,
        notFound,
      };
    } catch (error) {
      console.error(
        `[${this.network}] Failed to update pending intents:`,
        error
      );
      throw error;
    }
  }

  /**
   * Check for new intents and insert them
   */
  async updateNewIntents(): Promise<{
    checked: number;
    inserted: number;
    failed: number;
  }> {
    try {
      // Get max intent ID from database
      const dbMaxId = await this.intentRepo.getMaxIntentId();

      // Get max intent ID from network
      const networkMaxId = await this.getMaxIntentIdFromNetwork();

      // Check if there are new intents
      if (networkMaxId <= dbMaxId) {
        return { checked: 0, inserted: 0, failed: 0 };
      }

      const gap = networkMaxId - dbMaxId;
      console.log(
        `[${this.network}] Found ${gap} new intents (${
          dbMaxId + 1
        } to ${networkMaxId})`
      );

      // Fetch intents from the network (they come in reverse order)
      // We need to fetch enough to cover the gap
      const intents = await this.client.queryIntents(gap);

      // Filter for only new intents (ID > dbMaxId)
      const newIntents = intents.filter((intent) => intent.id > dbMaxId);

      if (newIntents.length === 0) {
        console.log(`[${this.network}] No new intents to insert`);
        return { checked: gap, inserted: 0, failed: 0 };
      }

      console.log(
        `[${this.network}] Inserting ${newIntents.length} new intents...`
      );

      // Insert new intents
      let inserted = 0;
      let failed = 0;

      for (const intent of newIntents) {
        try {
          await this.intentRepo.upsertIntent(intent);
          inserted++;
          console.log(`[${this.network}] Inserted new intent ${intent.id}`);
        } catch (error) {
          failed++;
          console.error(
            `[${this.network}] Failed to insert intent ${intent.id}:`,
            error
          );
        }
      }

      console.log(
        `[${this.network}] New intents inserted: ${inserted} successful, ${failed} failed`
      );

      return { checked: gap, inserted, failed };
    } catch (error) {
      console.error(
        `[${this.network}] Failed to check for new intents:`,
        error
      );
      return { checked: 0, inserted: 0, failed: 0 };
    }
  }

  /**
   * Check for new fill transactions and insert them
   */
  async updateFillTransactions(): Promise<{
    checked: number;
    inserted: number;
  }> {
    try {
      // Get all fills from the network
      const networkFills = await this.client.queryFills();

      if (networkFills.length === 0) {
        return { checked: 0, inserted: 0 };
      }

      // Get existing fill hashes from database
      const sql = this.db.getClient();
      const existingFills = (await sql`
        SELECT cosmos_hash FROM fill_transactions
      `) as Array<{ cosmos_hash: string }>;

      const existingHashes = new Set(existingFills.map((f) => f.cosmos_hash));

      // Filter for new fills only
      const newFills = networkFills.filter(
        (fill) => !existingHashes.has(fill.cosmosHash)
      );

      if (newFills.length === 0) {
        return { checked: networkFills.length, inserted: 0 };
      }

      console.log(
        `[${this.network}] Found ${newFills.length} new fill transactions`
      );

      // Insert new fills
      let inserted = 0;
      for (const fill of newFills) {
        try {
          await this.fillRepo.upsertFill(fill);
          inserted++;
          console.log(
            `[${this.network}] Inserted fill: intent ${fill.intentId}, hash ${fill.cosmosHash}`
          );
        } catch (error) {
          console.error(
            `[${this.network}] Failed to insert fill ${fill.cosmosHash}:`,
            error
          );
        }
      }

      return { checked: networkFills.length, inserted };
    } catch (error) {
      console.error(
        `[${this.network}] Failed to update fill transactions:`,
        error
      );
      return { checked: 0, inserted: 0 };
    }
  }

  /**
   * Check for new deposit transactions and insert them
   */
  async updateDepositTransactions(): Promise<{
    checked: number;
    inserted: number;
  }> {
    try {
      // Get all deposits from the network
      const networkDeposits = await this.client.queryDeposits();

      if (networkDeposits.length === 0) {
        return { checked: 0, inserted: 0 };
      }

      // Get existing deposit hashes from database
      const sql = this.db.getClient();
      const existingDeposits = (await sql`
        SELECT cosmos_hash FROM deposit_transactions
      `) as Array<{ cosmos_hash: string }>;

      const existingHashes = new Set(
        existingDeposits.map((d) => d.cosmos_hash)
      );

      // Filter for new deposits only
      const newDeposits = networkDeposits.filter(
        (deposit) => !existingHashes.has(deposit.cosmosHash)
      );

      if (newDeposits.length === 0) {
        return { checked: networkDeposits.length, inserted: 0 };
      }

      console.log(
        `[${this.network}] Found ${newDeposits.length} new deposit transactions`
      );

      // Insert new deposits
      let inserted = 0;
      for (const deposit of newDeposits) {
        try {
          await this.depositRepo.upsertDeposit(deposit);
          inserted++;
          console.log(
            `[${this.network}] Inserted deposit: intent ${deposit.intentId}, hash ${deposit.cosmosHash}`
          );
        } catch (error) {
          console.error(
            `[${this.network}] Failed to insert deposit ${deposit.cosmosHash}:`,
            error
          );
        }
      }

      return { checked: networkDeposits.length, inserted };
    } catch (error) {
      console.error(
        `[${this.network}] Failed to update deposit transactions:`,
        error
      );
      return { checked: 0, inserted: 0 };
    }
  }

  /**
   * Update all transactions (fills and deposits) - check for new ones
   */
  async updateTransactions(): Promise<{
    fills: { checked: number; inserted: number };
    deposits: { checked: number; inserted: number };
  }> {
    const [fillResults, depositResults] = await Promise.all([
      this.updateFillTransactions(),
      this.updateDepositTransactions(),
    ]);

    if (fillResults.inserted > 0 || depositResults.inserted > 0) {
      console.log(
        `[${this.network}] Transactions updated: ${fillResults.inserted} fills, ${depositResults.inserted} deposits`
      );
    }

    return {
      fills: fillResults,
      deposits: depositResults,
    };
  }

  /**
   * Start monitoring loop to continuously check pending intents and new transactions
   */
  async startMonitoring(): Promise<void> {
    if (this.isRunning) {
      console.log(`[${this.network}] Monitor is already running`);
      return;
    }

    this.isRunning = true;
    console.log(
      `[${this.network}] Starting monitoring loop (checking every ${
        this.pollIntervalMs / 1000
      }s)...\n`
    );

    while (this.isRunning) {
      try {
        // Check for new intents and insert them
        await this.updateNewIntents();

        // Update pending intents (status changes)
        await this.updatePendingIntents();

        // Update transactions (fills and deposits)
        await this.updateTransactions();
      } catch (error) {
        console.error(`[${this.network}] Error in monitoring loop:`, error);
      }

      // Wait for the next poll interval
      await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
    }
  }

  /**
   * Stop monitoring loop
   */
  stopMonitoring(): void {
    console.log(`[${this.network}] Stopping monitoring loop...`);
    this.isRunning = false;
  }

  /**
   * Get monitoring status
   */
  isMonitoring(): boolean {
    return this.isRunning;
  }

  /**
   * Set poll interval (in milliseconds)
   */
  setPollInterval(intervalMs: number): void {
    this.pollIntervalMs = intervalMs;
  }

  /**
   * Sync all fill transactions from the network to the database
   */
  async syncAllFills(): Promise<{
    fetched: number;
    inserted: number;
    failed: number;
  }> {
    console.log(`\n[${this.network}] Starting fill transactions sync...`);

    try {
      // Query all fill transactions from the network
      console.log(
        `[${this.network}] Fetching all fill transactions from network...`
      );
      const fills = await this.client.queryFills();

      console.log(
        `[${this.network}] ✓ Fetched ${fills.length} fill transactions`
      );

      if (fills.length === 0) {
        console.log(`[${this.network}] No fill transactions to sync`);
        return { fetched: 0, inserted: 0, failed: 0 };
      }

      // Insert all fills into the database
      console.log(
        `[${this.network}] Inserting fill transactions into database...`
      );

      let inserted = 0;
      let failed = 0;

      // Use batch upsert for better performance
      try {
        await this.fillRepo.upsertFills(fills);
        inserted = fills.length;

        console.log(
          `[${this.network}] ✓ Inserted ${inserted} fill transactions in batch`
        );
      } catch (error) {
        console.error(
          `[${this.network}] Batch insert failed, trying one by one:`,
          error
        );

        // Fallback to individual inserts if batch fails
        for (const fill of fills) {
          try {
            await this.fillRepo.upsertFill(fill);
            inserted++;

            if (inserted % 50 === 0) {
              console.log(
                `[${this.network}] Progress: ${inserted}/${fills.length} fills inserted`
              );
            }
          } catch (error) {
            failed++;
            console.error(
              `[${this.network}] Failed to insert fill ${fill.cosmosHash}:`,
              error
            );
          }
        }
      }

      console.log(`\n[${this.network}] ✓ Fill sync completed!`);
      console.log(`  Fetched:  ${fills.length}`);
      console.log(`  Inserted: ${inserted}`);
      console.log(`  Failed:   ${failed}\n`);

      return {
        fetched: fills.length,
        inserted,
        failed,
      };
    } catch (error) {
      console.error(`[${this.network}] Fill sync failed:`, error);
      throw error;
    }
  }

  /**
   * Sync all deposit transactions from the network to the database
   */
  async syncAllDeposits(): Promise<{
    fetched: number;
    inserted: number;
    failed: number;
  }> {
    console.log(`\n[${this.network}] Starting deposit transactions sync...`);

    try {
      // Query all deposit transactions from the network
      console.log(
        `[${this.network}] Fetching all deposit transactions from network...`
      );
      const deposits = await this.client.queryDeposits();

      console.log(
        `[${this.network}] ✓ Fetched ${deposits.length} deposit transactions`
      );

      if (deposits.length === 0) {
        console.log(`[${this.network}] No deposit transactions to sync`);
        return { fetched: 0, inserted: 0, failed: 0 };
      }

      // Insert all deposits into the database
      console.log(
        `[${this.network}] Inserting deposit transactions into database...`
      );

      let inserted = 0;
      let failed = 0;

      // Use batch upsert for better performance
      try {
        await this.depositRepo.upsertDeposits(deposits);
        inserted = deposits.length;

        console.log(
          `[${this.network}] ✓ Inserted ${inserted} deposit transactions in batch`
        );
      } catch (error) {
        console.error(
          `[${this.network}] Batch insert failed, trying one by one:`,
          error
        );

        // Fallback to individual inserts if batch fails
        for (const deposit of deposits) {
          try {
            await this.depositRepo.upsertDeposit(deposit);
            inserted++;

            if (inserted % 50 === 0) {
              console.log(
                `[${this.network}] Progress: ${inserted}/${deposits.length} deposits inserted`
              );
            }
          } catch (error) {
            failed++;
            console.error(
              `[${this.network}] Failed to insert deposit ${deposit.cosmosHash}:`,
              error
            );
          }
        }
      }

      console.log(`\n[${this.network}] ✓ Deposit sync completed!`);
      console.log(`  Fetched:  ${deposits.length}`);
      console.log(`  Inserted: ${inserted}`);
      console.log(`  Failed:   ${failed}\n`);

      return {
        fetched: deposits.length,
        inserted,
        failed,
      };
    } catch (error) {
      console.error(`[${this.network}] Deposit sync failed:`, error);
      throw error;
    }
  }

  /**
   * Sync all transactions (fills and deposits)
   */
  async syncAllTransactions(): Promise<{
    fills: { fetched: number; inserted: number; failed: number };
    deposits: { fetched: number; inserted: number; failed: number };
  }> {
    console.log(`\n[${this.network}] Starting full transaction sync...\n`);

    const [fillResults, depositResults] = await Promise.all([
      this.syncAllFills(),
      this.syncAllDeposits(),
    ]);

    console.log(`\n[${this.network}] ✓ Full transaction sync completed!`);
    console.log(`  Fills:    ${fillResults.inserted}/${fillResults.fetched}`);
    console.log(
      `  Deposits: ${depositResults.inserted}/${depositResults.fetched}\n`
    );

    return {
      fills: fillResults,
      deposits: depositResults,
    };
  }

  /**
   * Get the network name
   */
  getNetwork(): NetworkName {
    return this.network;
  }
}
