import { ArcanaClient, type NetworkName, type Intent } from "./client/client";
import {
  DatabaseClient,
  IntentRepository,
  FillRepository,
  DepositRepository,
  EvmFillRepository,
  EvmDepositRepository,
  type IntentRow,
} from "./database";
import {
  createSyncersForNetwork,
  getChainsForNetwork,
  type EvmChainSyncer,
  type ChainConfig,
} from "./evm";

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
  private evmFillRepo: EvmFillRepository;
  private evmDepositRepo: EvmDepositRepository;
  private evmSyncers: Map<number, EvmChainSyncer>;
  private chainConfigs: ChainConfig[];
  private isRunning = false;
  private pollIntervalMs = 10000; // 10 seconds

  constructor(network: NetworkName, databaseUrl: string) {
    this.network = network;
    this.client = new ArcanaClient(network);
    this.db = new DatabaseClient(databaseUrl);
    this.intentRepo = new IntentRepository(this.db);
    this.fillRepo = new FillRepository(this.db);
    this.depositRepo = new DepositRepository(this.db);
    this.evmFillRepo = new EvmFillRepository(this.db);
    this.evmDepositRepo = new EvmDepositRepository(this.db);

    // Initialize EVM syncers for this network
    this.chainConfigs = getChainsForNetwork(network);
    this.evmSyncers = createSyncersForNetwork(this.chainConfigs);

    console.log(
      `[${this.network}] Initialized ${this.evmSyncers.size} EVM chain syncers`
    );
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

      // Debug: Verify Map creation worked for the latest intent
      const latestIntentId = Math.max(...allNetworkIntents.map((i) => i.id));
      const mapLatestIntent = networkIntentsMap.get(latestIntentId);
      if (mapLatestIntent) {
        console.log(
          `[${this.network}] Latest intent ${latestIntentId} found in map: fulfilled=${mapLatestIntent.fulfilled}`
        );
      } else {
        console.log(
          `[${this.network}] Latest intent ${latestIntentId} NOT found in map despite being in raw data!`
        );
      }

      // Debug: Log the range of intents fetched from network
      if (allNetworkIntents.length > 0) {
        const minId = Math.min(...allNetworkIntents.map((i) => i.id));
        const maxId = Math.max(...allNetworkIntents.map((i) => i.id));
        console.log(
          `[${this.network}] Network query returned intents ${minId} to ${maxId} (${allNetworkIntents.length} total)`
        );

        // Debug: Check if the latest intent is actually in the results
        const latestIntent = allNetworkIntents.find(
          (i) => i.id === latestIntentId
        );
        if (latestIntent) {
          console.log(
            `[${this.network}] Latest intent ${latestIntentId} found in network data: fulfilled=${latestIntent.fulfilled}, refunded=${latestIntent.refunded}, deposited=${latestIntent.deposited}`
          );
        } else {
          console.log(
            `[${this.network}] Latest intent ${latestIntentId} NOT found in network data despite being in range`
          );
        }
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
          // Convert database ID to number for Map lookup (database returns string, Map uses number)
          const intentId = Number(dbIntent.id);
          console.log(
            `[${this.network}] Looking up intent ${
              dbIntent.id
            } (converted to ${intentId}, type: ${typeof intentId}) in map...`
          );

          const networkIntent = networkIntentsMap.get(intentId);
          console.log(
            `[${this.network}] Map lookup result for ${intentId}: ${
              networkIntent ? "FOUND" : "NOT FOUND"
            }`
          );

          if (!networkIntent) {
            console.warn(
              `[${this.network}] Intent ${dbIntent.id} not found on network (network has ${allNetworkIntents.length} intents, max ID: ${networkMaxId})`
            );
            // Debug: Check if the intent exists in the raw data but not in the map
            const rawIntent = allNetworkIntents.find((i) => i.id === intentId);
            if (rawIntent) {
              console.warn(
                `[${this.network}] Intent ${dbIntent.id} exists in raw data but not in map! This is a bug.`
              );
            }
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

        // Update transactions (fills and deposits from Cosmos)
        await this.updateTransactions();

        // Update EVM events (fills and deposits from EVM chains)
        await this.updateEvmEvents();

        // Link EVM events to intents (reconciliation job)
        await this.linkEvmEventsToIntents();
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

      // Get existing fill hashes from database (Cosmos txs are immutable, so we only insert new ones)
      console.log(
        `[${this.network}] Checking for existing fill transactions...`
      );
      const sql = this.db.getClient();
      const existingFills = (await sql`
        SELECT cosmos_hash FROM fill_transactions
      `) as Array<{ cosmos_hash: string }>;

      const existingHashes = new Set(existingFills.map((f) => f.cosmos_hash));

      // Filter for new fills only
      const newFills = fills.filter(
        (fill) => !existingHashes.has(fill.cosmosHash)
      );

      console.log(
        `[${this.network}] Found ${newFills.length} new fills to insert (${existingFills.length} already in database)`
      );

      if (newFills.length === 0) {
        console.log(`[${this.network}] No new fill transactions to sync`);
        return { fetched: fills.length, inserted: 0, failed: 0 };
      }

      // Insert only new fills into the database
      console.log(
        `[${this.network}] Inserting ${newFills.length} new fill transactions...`
      );

      let inserted = 0;
      let failed = 0;

      // Use batch upsert for better performance
      try {
        await this.fillRepo.upsertFills(newFills);
        inserted = newFills.length;

        console.log(
          `[${this.network}] ✓ Inserted ${inserted} fill transactions in batch`
        );
      } catch (error) {
        console.error(
          `[${this.network}] Batch insert failed, trying one by one:`,
          error
        );

        // Fallback to individual inserts if batch fails
        for (const fill of newFills) {
          try {
            await this.fillRepo.upsertFill(fill);
            inserted++;

            if (inserted % 50 === 0) {
              console.log(
                `[${this.network}] Progress: ${inserted}/${newFills.length} fills inserted`
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

      // Get existing deposit hashes from database (Cosmos txs are immutable, so we only insert new ones)
      console.log(
        `[${this.network}] Checking for existing deposit transactions...`
      );
      const sql = this.db.getClient();
      const existingDeposits = (await sql`
        SELECT cosmos_hash FROM deposit_transactions
      `) as Array<{ cosmos_hash: string }>;

      const existingHashes = new Set(
        existingDeposits.map((d) => d.cosmos_hash)
      );

      // Filter for new deposits only
      const newDeposits = deposits.filter(
        (deposit) => !existingHashes.has(deposit.cosmosHash)
      );

      console.log(
        `[${this.network}] Found ${newDeposits.length} new deposits to insert (${existingDeposits.length} already in database)`
      );

      if (newDeposits.length === 0) {
        console.log(`[${this.network}] No new deposit transactions to sync`);
        return { fetched: deposits.length, inserted: 0, failed: 0 };
      }

      // Insert only new deposits into the database
      console.log(
        `[${this.network}] Inserting ${newDeposits.length} new deposit transactions...`
      );

      let inserted = 0;
      let failed = 0;

      // Use batch upsert for better performance
      try {
        await this.depositRepo.upsertDeposits(newDeposits);
        inserted = newDeposits.length;

        console.log(
          `[${this.network}] ✓ Inserted ${inserted} deposit transactions in batch`
        );
      } catch (error) {
        console.error(
          `[${this.network}] Batch insert failed, trying one by one:`,
          error
        );

        // Fallback to individual inserts if batch fails
        for (const deposit of newDeposits) {
          try {
            await this.depositRepo.upsertDeposit(deposit);
            inserted++;

            if (inserted % 50 === 0) {
              console.log(
                `[${this.network}] Progress: ${inserted}/${newDeposits.length} deposits inserted`
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
   * Sync EVM events for a single chain
   */
  async syncEvmChain(
    chainId: number,
    fromBlock?: bigint,
    toBlock?: bigint
  ): Promise<{
    chainId: number;
    chainName: string;
    fillEvents: number;
    depositEvents: number;
    fromBlock: bigint;
    toBlock: bigint;
  }> {
    const syncer = this.evmSyncers.get(chainId);
    if (!syncer) {
      throw new Error(`No syncer found for chain ID ${chainId}`);
    }

    const config = syncer.getChainConfig();

    try {
      // If toBlock not specified, get current block
      const currentBlock = toBlock || (await syncer.getCurrentBlockNumber());

      // If fromBlock not specified, get last synced block from database
      const lastSyncedFillBlock =
        fromBlock || (await this.evmFillRepo.getMaxBlockNumber(chainId));
      const lastSyncedDepositBlock =
        fromBlock || (await this.evmDepositRepo.getMaxBlockNumber(chainId));

      // Use the minimum of the two (or deployment block if both are 0)
      const startBlock =
        lastSyncedFillBlock === 0n && lastSyncedDepositBlock === 0n
          ? config.deploymentBlock
          : lastSyncedFillBlock < lastSyncedDepositBlock
          ? lastSyncedFillBlock
          : lastSyncedDepositBlock;

      // Don't sync if we're already up to date
      if (startBlock >= currentBlock) {
        return {
          chainId,
          chainName: config.name,
          fillEvents: 0,
          depositEvents: 0,
          fromBlock: startBlock,
          toBlock: currentBlock,
        };
      }

      // If starting from deployment block, use it directly; otherwise increment by 1
      const actualFromBlock =
        startBlock === config.deploymentBlock ? startBlock : startBlock + 1n;

      console.log(
        `[${this.network}/${config.name}] Syncing blocks ${actualFromBlock} to ${currentBlock}...`
      );

      // Fetch and store events incrementally (batch by batch)
      const { totalFills, totalDeposits } = await syncer.fetchAndProcessBatches(
        actualFromBlock,
        currentBlock,
        async (fills, deposits) => {
          // Store this batch immediately
          if (fills.length > 0) {
            await this.evmFillRepo.upsertFillEvents(fills);
          }
          if (deposits.length > 0) {
            await this.evmDepositRepo.upsertDepositEvents(deposits);
          }
        }
      );

      console.log(
        `[${this.network}/${config.name}] ✓ Synced ${totalFills} fills, ${totalDeposits} deposits`
      );

      return {
        chainId,
        chainName: config.name,
        fillEvents: totalFills,
        depositEvents: totalDeposits,
        fromBlock: actualFromBlock,
        toBlock: currentBlock,
      };
    } catch (error) {
      console.error(
        `[${this.network}/${config.name}] Error syncing EVM events:`,
        error
      );
      throw error;
    }
  }

  /**
   * Sync EVM events for all chains in the network
   */
  async syncAllEvmChains(): Promise<{
    totalFillEvents: number;
    totalDepositEvents: number;
    results: Array<{
      chainId: number;
      chainName: string;
      fillEvents: number;
      depositEvents: number;
      success: boolean;
      error?: string;
    }>;
  }> {
    console.log(
      `\n[${this.network}] Starting EVM event sync for ${this.evmSyncers.size} chains...\n`
    );

    const results: Array<{
      chainId: number;
      chainName: string;
      fillEvents: number;
      depositEvents: number;
      success: boolean;
      error?: string;
    }> = [];

    let totalFillEvents = 0;
    let totalDepositEvents = 0;

    // Sync all chains in parallel
    const syncPromises = Array.from(this.evmSyncers.entries()).map(
      async ([chainId, syncer]) => {
        const config = syncer.getChainConfig();
        try {
          const result = await this.syncEvmChain(chainId);
          totalFillEvents += result.fillEvents;
          totalDepositEvents += result.depositEvents;

          results.push({
            chainId: result.chainId,
            chainName: result.chainName,
            fillEvents: result.fillEvents,
            depositEvents: result.depositEvents,
            success: true,
          });
        } catch (error) {
          console.error(
            `[${this.network}/${config.name}] Failed to sync:`,
            error
          );
          results.push({
            chainId,
            chainName: config.name,
            fillEvents: 0,
            depositEvents: 0,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    );

    await Promise.all(syncPromises);

    console.log(`\n[${this.network}] ✓ EVM event sync completed!`);
    console.log(`  Total fills:    ${totalFillEvents}`);
    console.log(`  Total deposits: ${totalDepositEvents}`);

    // Show per-chain summary
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;
    console.log(`  Chains synced:  ${successCount}/${this.evmSyncers.size}`);
    if (failureCount > 0) {
      console.log(`  Chains failed:  ${failureCount}`);
    }
    console.log();

    return {
      totalFillEvents,
      totalDepositEvents,
      results,
    };
  }

  /**
   * Update EVM events (check for new events on all chains)
   */
  async updateEvmEvents(): Promise<{
    totalFillEvents: number;
    totalDepositEvents: number;
  }> {
    try {
      const result = await this.syncAllEvmChains();
      return {
        totalFillEvents: result.totalFillEvents,
        totalDepositEvents: result.totalDepositEvents,
      };
    } catch (error) {
      console.error(`[${this.network}] Failed to update EVM events:`, error);
      return {
        totalFillEvents: 0,
        totalDepositEvents: 0,
      };
    }
  }

  /**
   * Link unlinked EVM events to intents by matching request_hash with intent signature hash
   * This runs as a background job to reconcile events with their source intents
   */
  async linkEvmEventsToIntents(): Promise<{
    linkedFills: number;
    linkedDeposits: number;
    remainingUnlinkedFills: number;
    remainingUnlinkedDeposits: number;
  }> {
    try {
      let linkedFills = 0;
      let linkedDeposits = 0;

      // Link fill events
      const unlinkedFills = await this.evmFillRepo.getUnlinkedFillEvents();
      console.log(
        `[${this.network}] Found ${unlinkedFills.length} unlinked fill events`
      );

      for (const fillEvent of unlinkedFills) {
        try {
          const intentId = await this.intentRepo.findIntentIdByHash(
            fillEvent.request_hash
          );
          if (intentId) {
            await this.evmFillRepo.updateIntentId(fillEvent.id, intentId);
            linkedFills++;
          }
        } catch (error) {
          console.error(
            `[${this.network}] Error linking fill event ${fillEvent.id}:`,
            error
          );
        }
      }

      // Link deposit events
      const unlinkedDeposits =
        await this.evmDepositRepo.getUnlinkedDepositEvents();
      console.log(
        `[${this.network}] Found ${unlinkedDeposits.length} unlinked deposit events`
      );

      for (const depositEvent of unlinkedDeposits) {
        try {
          const intentId = await this.intentRepo.findIntentIdByHash(
            depositEvent.request_hash
          );
          if (intentId) {
            await this.evmDepositRepo.updateIntentId(depositEvent.id, intentId);
            linkedDeposits++;
          }
        } catch (error) {
          console.error(
            `[${this.network}] Error linking deposit event ${depositEvent.id}:`,
            error
          );
        }
      }

      const remainingUnlinkedFills =
        await this.evmFillRepo.getUnlinkedFillEventCount();
      const remainingUnlinkedDeposits =
        await this.evmDepositRepo.getUnlinkedDepositEventCount();

      console.log(
        `[${this.network}] ✓ Linked ${linkedFills} fills, ${linkedDeposits} deposits`
      );
      console.log(
        `[${this.network}] Remaining unlinked: ${remainingUnlinkedFills} fills, ${remainingUnlinkedDeposits} deposits\n`
      );

      return {
        linkedFills,
        linkedDeposits,
        remainingUnlinkedFills,
        remainingUnlinkedDeposits,
      };
    } catch (error) {
      console.error(
        `[${this.network}] Failed to link EVM events to intents:`,
        error
      );
      return {
        linkedFills: 0,
        linkedDeposits: 0,
        remainingUnlinkedFills: 0,
        remainingUnlinkedDeposits: 0,
      };
    }
  }

  /**
   * Get the network name
   */
  getNetwork(): NetworkName {
    return this.network;
  }
}
