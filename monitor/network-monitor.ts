import {
  ArcanaClient,
  type NetworkName,
  type Intent,
  type FillTransaction,
  type DepositTransaction,
} from "../client";
import { DatabaseClient } from "./database/client";
import { IntentRepository } from "./database/repositories/intent-repository";
import { FillRepository } from "./database/repositories/fill-repository";
import { DepositRepository } from "./database/repositories/deposit-repository";
import type { NetworkType } from "./types/database";
import { Logger } from "./utils/logger";

export interface NetworkMonitorConfig {
  network: NetworkName;
  intervalMs: number;
  batchSize: number;
  fullSync: boolean;
  syncDelayMs: number;
}

export class NetworkMonitor {
  private client: ArcanaClient;
  private intentRepo: IntentRepository;
  private fillRepo: FillRepository;
  private depositRepo: DepositRepository;
  private logger: Logger;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private lastIntentId = 0;
  private lastBlockHeight = 0;
  private processedIntents = new Set<number>();
  private config: NetworkMonitorConfig;

  constructor(
    network: NetworkName,
    db: DatabaseClient,
    logger: Logger,
    config: Partial<NetworkMonitorConfig> = {}
  ) {
    this.client = new ArcanaClient(network);
    this.intentRepo = new IntentRepository(db);
    this.fillRepo = new FillRepository(db);
    this.depositRepo = new DepositRepository(db);
    this.logger = logger;
    this.config = {
      network,
      intervalMs: config.intervalMs || 5000,
      batchSize: config.batchSize || 20,
      fullSync: config.fullSync || false,
      syncDelayMs: config.syncDelayMs || 500,
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn(`Monitor for ${this.config.network} is already running`);
      return;
    }

    this.logger.networkLog(this.config.network, "Starting network monitor");

    try {
      // Initialize state from database
      await this.initializeState();

      // Start polling
      this.isRunning = true;
      this.intervalId = setInterval(() => {
        this.poll().catch((error) => {
          this.logger.errorLog(this.config.network, "Polling error", error);
        });
      }, this.config.intervalMs);

      this.logger.networkLog(this.config.network, "Network monitor started", {
        intervalMs: this.config.intervalMs,
        lastIntentId: this.lastIntentId,
        fullSync: this.config.fullSync,
      });
    } catch (error) {
      this.logger.errorLog(
        this.config.network,
        "Failed to start monitor",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.networkLog(this.config.network, "Stopping network monitor");

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.logger.networkLog(this.config.network, "Network monitor stopped");
  }

  private async initializeState(): Promise<void> {
    try {
      // Get last processed intent ID from database
      const maxIntentId = await this.intentRepo.getMaxIntentId(
        this.config.network as NetworkType
      );
      this.lastIntentId = maxIntentId || 0;

      this.logger.syncLog(this.config.network, "Initialized state", {
        lastIntentId: this.lastIntentId,
        maxIntentIdFromDb: maxIntentId,
      });

      // If full sync is enabled and we have no data, start from beginning
      if (this.config.fullSync && this.lastIntentId === 0) {
        this.logger.syncLog(
          this.config.network,
          "Starting full historical sync"
        );
        await this.performFullSync();
      } else {
        // Check if we need to catch up on missed intents
        await this.checkAndCatchUp();
      }
    } catch (error) {
      this.logger.errorLog(
        this.config.network,
        "Failed to initialize state",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  private async checkAndCatchUp(): Promise<void> {
    try {
      // Get a larger batch of intents to find the true maximum intent ID from the network
      // We need to get enough intents to ensure we find the maximum
      const batchSize = Math.max(this.config.batchSize, 50); // At least 50 to find max
      const latestIntents = await this.client.queryIntents(batchSize, 0);

      if (latestIntents.length === 0) {
        this.logger.debug(
          `${this.config.network}: No intents available on network`
        );
        return;
      }

      // Find the maximum intent ID from the fetched intents
      // Since queryIntents uses reverse: true, the first intent should be the highest ID
      const networkMaxIntentId = latestIntents[0]?.id;

      if (!networkMaxIntentId) {
        this.logger.debug(`${this.config.network}: No valid intent ID found`);
        return;
      }

      this.logger.debug(
        `${this.config.network}: Network max intent ID: ${networkMaxIntentId}, Database max: ${this.lastIntentId}`
      );

      // Debug: Log the first few intents to see what we're getting
      this.logger.debug(
        `${this.config.network}: First 5 intents from network: ${latestIntents
          .slice(0, 5)
          .map((i) => i.id)
          .join(", ")}`
      );

      if (networkMaxIntentId > this.lastIntentId) {
        const gap = networkMaxIntentId - this.lastIntentId;
        this.logger.syncLog(
          this.config.network,
          `Detected gap: need to catch up ${gap} intents (from ${
            this.lastIntentId + 1
          } to ${networkMaxIntentId})`
        );

        // Perform gap sync to catch up
        await this.syncGap(this.lastIntentId + 1, networkMaxIntentId);

        // Update our last intent ID
        this.lastIntentId = networkMaxIntentId;

        this.logger.syncLog(
          this.config.network,
          `Catch-up completed. Now synced to intent ${networkMaxIntentId}`
        );
      } else {
        this.logger.debug(
          `${this.config.network}: Already up to date (last seen: ${this.lastIntentId}, network max: ${networkMaxIntentId})`
        );
      }
    } catch (error) {
      this.logger.errorLog(
        this.config.network,
        "Failed to check and catch up",
        error instanceof Error ? error : new Error(String(error))
      );
      // Don't throw here - we can continue with normal polling
    }
  }

  private async poll(): Promise<void> {
    try {
      this.logger.debug(
        `Polling ${this.config.network} for new intents from ID ${
          this.lastIntentId + 1
        }`
      );

      // Query from latest intents to catch up on any missed intents
      const batchSize = Math.max(this.config.batchSize, 50); // At least 50 to find max
      const intents = await this.client.queryIntents(batchSize, 0);

      if (intents.length === 0) {
        this.logger.debug(`No intents found for ${this.config.network}`);
        return;
      }

      // Find the maximum intent ID to determine our catch-up range
      // Since queryIntents uses reverse: true, the first intent should be the highest ID
      const maxIntentId = intents[0]?.id;

      if (!maxIntentId) {
        this.logger.debug(
          `${this.config.network}: No valid intent ID found in polling`
        );
        return;
      }

      // Filter for new intents (those we haven't seen yet)
      const newIntents = intents.filter(
        (intent) => intent.id > this.lastIntentId
      );

      if (newIntents.length === 0) {
        this.logger.debug(
          `No new intents since last poll for ${this.config.network} (last seen: ${this.lastIntentId}, max available: ${maxIntentId})`
        );
        // Update lastIntentId even if no new intents to prevent repeated queries
        this.lastIntentId = maxIntentId;
        return;
      }

      this.logger.networkLog(
        this.config.network,
        `Found ${newIntents.length} new intents (catching up from ${
          this.lastIntentId + 1
        } to ${maxIntentId})`,
        {
          intentIds: newIntents.map((i) => i.id),
          catchUpRange: `${this.lastIntentId + 1}-${maxIntentId}`,
        }
      );

      // Process new intents
      await this.processIntents(newIntents);

      // Update last processed intent ID to the maximum we've seen
      this.lastIntentId = maxIntentId;

      // Also fetch and process fills and deposits for these intents
      await this.processTransactions(newIntents);

      this.logger.networkLog(this.config.network, "Poll completed", {
        processedIntents: newIntents.length,
        newLastIntentId: this.lastIntentId,
        catchUpRange: `${this.lastIntentId - newIntents.length + 1}-${
          this.lastIntentId
        }`,
      });
    } catch (error) {
      this.logger.errorLog(
        this.config.network,
        "Polling failed",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private async processIntents(intents: Intent[]): Promise<void> {
    for (const intent of intents) {
      try {
        await this.intentRepo.upsertIntent(
          intent,
          this.config.network as NetworkType
        );
        this.processedIntents.add(intent.id);

        this.logger.intentLog(
          intent.id,
          this.config.network,
          "Intent processed",
          {
            status: intent.fulfilled
              ? "fulfilled"
              : intent.deposited
              ? "deposited"
              : "pending",
            user: intent.user,
          }
        );
      } catch (error) {
        this.logger.errorLog(
          this.config.network,
          `Failed to process intent ${intent.id}`,
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }

  private async processTransactions(intents: Intent[]): Promise<void> {
    try {
      // Get all transactions at once to avoid rate limiting
      const allFills = await this.client.queryFills();
      const allDeposits = await this.client.queryDeposits();

      // Filter transactions for the intents we're processing
      const intentIds = new Set(intents.map((i) => i.id));
      const relevantFills = allFills.filter((fill) =>
        intentIds.has(fill.intentId)
      );
      const relevantDeposits = allDeposits.filter((deposit) =>
        intentIds.has(deposit.intentId)
      );

      // Process fills in batch
      if (relevantFills.length > 0) {
        await this.fillRepo.upsertFillTransactions(
          relevantFills,
          this.config.network as NetworkType
        );
        this.logger.networkLog(
          this.config.network,
          `Processed ${relevantFills.length} fill transactions in batch`
        );
      }

      // Process deposits in batch
      if (relevantDeposits.length > 0) {
        await this.depositRepo.upsertDepositTransactions(
          relevantDeposits,
          this.config.network as NetworkType
        );
        this.logger.networkLog(
          this.config.network,
          `Processed ${relevantDeposits.length} deposit transactions in batch`
        );
      }
    } catch (error) {
      this.logger.errorLog(
        this.config.network,
        `Failed to process transactions batch`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private async processTransactionsFromCache(
    intents: Intent[],
    allFills: any[],
    allDeposits: any[]
  ): Promise<void> {
    try {
      // Filter transactions for the intents we're processing
      const intentIds = new Set(intents.map((i) => i.id));
      const relevantFills = allFills.filter((fill) =>
        intentIds.has(fill.intentId)
      );
      const relevantDeposits = allDeposits.filter((deposit) =>
        intentIds.has(deposit.intentId)
      );

      // Process fills in batch
      if (relevantFills.length > 0) {
        await this.fillRepo.upsertFillTransactions(
          relevantFills,
          this.config.network as NetworkType
        );
        this.logger.networkLog(
          this.config.network,
          `Processed ${relevantFills.length} fill transactions from cache`
        );
      }

      // Process deposits in batch
      if (relevantDeposits.length > 0) {
        await this.depositRepo.upsertDepositTransactions(
          relevantDeposits,
          this.config.network as NetworkType
        );
        this.logger.networkLog(
          this.config.network,
          `Processed ${relevantDeposits.length} deposit transactions from cache`
        );
      }
    } catch (error) {
      this.logger.errorLog(
        this.config.network,
        `Failed to process transactions from cache`,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private async performFullSync(): Promise<void> {
    try {
      this.logger.syncLog(this.config.network, "Starting full historical sync");

      // Fetch all transactions once at the beginning to avoid rate limiting
      this.logger.syncLog(this.config.network, "Fetching all transactions...");
      const [allFills, allDeposits] = await Promise.all([
        this.client.queryFills(),
        this.client.queryDeposits(),
      ]);
      this.logger.syncLog(
        this.config.network,
        `Fetched ${allFills.length} fills and ${allDeposits.length} deposits`
      );

      let offset = 0;
      let hasMore = true;
      let totalProcessed = 0;

      while (hasMore) {
        // Fetch intents in batches with rate limiting
        const intents = await this.client.queryIntents(
          this.config.batchSize,
          offset
        );

        if (intents.length === 0) {
          hasMore = false;
          break;
        }

        // Process all intents
        await this.processIntents(intents);

        // Process transactions using the pre-fetched data
        await this.processTransactionsFromCache(intents, allFills, allDeposits);

        totalProcessed += intents.length;
        offset += this.config.batchSize;

        this.logger.syncLog(this.config.network, `Full sync progress`, {
          processed: totalProcessed,
          batchSize: intents.length,
          offset,
        });

        // Delay to avoid rate limiting
        await new Promise((resolve) =>
          setTimeout(resolve, this.config.syncDelayMs)
        );
      }

      this.logger.syncLog(
        this.config.network,
        "Full historical sync completed",
        {
          totalProcessed,
        }
      );
    } catch (error) {
      this.logger.errorLog(
        this.config.network,
        "Full sync failed",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  async syncGap(startId: number, endId: number): Promise<void> {
    try {
      this.logger.syncLog(this.config.network, "Syncing gap", {
        startId,
        endId,
      });

      // Check which intents are missing in the database
      const existingIntents = await this.intentRepo.getIntentsInRange(
        startId,
        endId,
        this.config.network as NetworkType
      );
      const existingIds = new Set(existingIntents.map((i) => i.id));

      // Find missing intent IDs
      const missingIds: number[] = [];
      for (let id = startId; id <= endId; id++) {
        if (!existingIds.has(id)) {
          missingIds.push(id);
        }
      }

      if (missingIds.length === 0) {
        this.logger.syncLog(this.config.network, "No missing intents in gap", {
          startId,
          endId,
        });
        return;
      }

      this.logger.syncLog(
        this.config.network,
        `Found ${missingIds.length} missing intents`,
        {
          missingIds: missingIds.slice(0, 10), // Log first 10 for brevity
        }
      );

      // Fetch all transactions once to avoid rate limiting
      const [allFills, allDeposits] = await Promise.all([
        this.client.queryFills(),
        this.client.queryDeposits(),
      ]);

      this.logger.syncLog(
        this.config.network,
        `Fetched ${allFills.length} fills and ${allDeposits.length} deposits for gap sync`
      );

      // Process missing intents in batches
      const batchSize = 10;
      for (let i = 0; i < missingIds.length; i += batchSize) {
        const batch = missingIds.slice(i, i + batchSize);

        for (const intentId of batch) {
          try {
            const intent = await this.client.queryIntent(intentId);
            if (intent) {
              await this.intentRepo.upsertIntent(
                intent,
                this.config.network as NetworkType
              );

              // Filter transactions for this intent
              const intentFills = allFills.filter(
                (fill) => fill.intentId === intentId
              );
              const intentDeposits = allDeposits.filter(
                (deposit) => deposit.intentId === intentId
              );

              if (intentFills.length > 0) {
                await this.fillRepo.upsertFillTransactions(
                  intentFills,
                  this.config.network as NetworkType
                );
              }
              if (intentDeposits.length > 0) {
                await this.depositRepo.upsertDepositTransactions(
                  intentDeposits,
                  this.config.network as NetworkType
                );
              }

              this.logger.intentLog(
                intentId,
                this.config.network,
                "Gap sync: intent processed",
                { progress: `${i + batch.length}/${missingIds.length}` }
              );
            }
          } catch (error) {
            this.logger.errorLog(
              this.config.network,
              `Failed to sync intent ${intentId}`,
              error instanceof Error ? error : new Error(String(error))
            );
          }
        }

        // Rate limiting delay between batches
        await new Promise((resolve) =>
          setTimeout(resolve, this.config.syncDelayMs)
        );
      }

      this.logger.syncLog(this.config.network, "Gap sync completed", {
        syncedIntents: missingIds.length,
      });
    } catch (error) {
      this.logger.errorLog(
        this.config.network,
        "Gap sync failed",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  getStatus(): {
    network: string;
    isRunning: boolean;
    lastIntentId: number;
    processedIntentsCount: number;
    intervalMs: number;
  } {
    return {
      network: this.config.network,
      isRunning: this.isRunning,
      lastIntentId: this.lastIntentId,
      processedIntentsCount: this.processedIntents.size,
      intervalMs: this.config.intervalMs,
    };
  }

  async getStats(): Promise<{
    network: string;
    intentCount: number;
    fillCount: number;
    depositCount: number;
    lastSync: Date;
  }> {
    const [intentCount, fillCount, depositCount] = await Promise.all([
      this.intentRepo.getIntentCount(this.config.network as NetworkType),
      this.fillRepo.getFillTransactionCount(this.config.network as NetworkType),
      this.depositRepo.getDepositTransactionCount(
        this.config.network as NetworkType
      ),
    ]);

    return {
      network: this.config.network,
      intentCount,
      fillCount,
      depositCount,
      lastSync: new Date(),
    };
  }

  /**
   * Sync all deposits and fills starting from the first intent
   * This method fetches all historical transactions and processes them
   */
  async syncAllTransactions(): Promise<void> {
    try {
      this.logger.syncLog(
        this.config.network,
        "Starting transaction sync from first intent"
      );

      // Get the first intent ID from the database
      const firstIntentId = await this.getFirstIntentId();
      if (firstIntentId === null) {
        this.logger.syncLog(
          this.config.network,
          "No intents found in database, skipping transaction sync"
        );
        return;
      }

      this.logger.syncLog(
        this.config.network,
        `First intent ID: ${firstIntentId}`
      );

      // Fetch all transactions using the improved pagination
      this.logger.syncLog(
        this.config.network,
        "Fetching all historical transactions..."
      );
      const [allFills, allDeposits] = await Promise.all([
        this.client.queryFills(),
        this.client.queryDeposits(),
      ]);

      this.logger.syncLog(
        this.config.network,
        `Fetched ${allFills.length} fills and ${allDeposits.length} deposits`
      );

      // Get all intent IDs from the database
      const allIntentIds = await this.getAllIntentIds();
      const intentIdSet = new Set(allIntentIds);

      this.logger.syncLog(
        this.config.network,
        `Processing transactions for ${allIntentIds.length} intents`
      );

      // Filter transactions to only include those for intents in our database
      const relevantFills = allFills.filter((fill) =>
        intentIdSet.has(fill.intentId)
      );
      const relevantDeposits = allDeposits.filter((deposit) =>
        intentIdSet.has(deposit.intentId)
      );

      this.logger.syncLog(
        this.config.network,
        `Found ${relevantFills.length} relevant fills and ${relevantDeposits.length} relevant deposits`
      );

      // Process fills in batches
      if (relevantFills.length > 0) {
        const batchSize = 1000; // Process in batches to avoid memory issues
        for (let i = 0; i < relevantFills.length; i += batchSize) {
          const batch = relevantFills.slice(i, i + batchSize);
          await this.fillRepo.upsertFillTransactions(
            batch,
            this.config.network as NetworkType
          );

          this.logger.syncLog(
            this.config.network,
            `Processed fill batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
              relevantFills.length / batchSize
            )} (${batch.length} fills)`
          );
        }
      }

      // Process deposits in batches
      if (relevantDeposits.length > 0) {
        const batchSize = 1000; // Process in batches to avoid memory issues
        for (let i = 0; i < relevantDeposits.length; i += batchSize) {
          const batch = relevantDeposits.slice(i, i + batchSize);
          await this.depositRepo.upsertDepositTransactions(
            batch,
            this.config.network as NetworkType
          );

          this.logger.syncLog(
            this.config.network,
            `Processed deposit batch ${
              Math.floor(i / batchSize) + 1
            }/${Math.ceil(relevantDeposits.length / batchSize)} (${
              batch.length
            } deposits)`
          );
        }
      }

      this.logger.syncLog(
        this.config.network,
        "Transaction sync completed successfully",
        {
          totalFills: relevantFills.length,
          totalDeposits: relevantDeposits.length,
        }
      );
    } catch (error) {
      this.logger.errorLog(
        this.config.network,
        "Transaction sync failed",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Get the first intent ID from the database
   */
  private async getFirstIntentId(): Promise<number | null> {
    try {
      const result = await this.intentRepo.getMinIntentId(
        this.config.network as NetworkType
      );
      return result;
    } catch (error) {
      this.logger.errorLog(
        this.config.network,
        "Failed to get first intent ID",
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }
  }

  /**
   * Get all intent IDs from the database
   */
  private async getAllIntentIds(): Promise<number[]> {
    try {
      const result = await this.intentRepo.getAllIntentIds(
        this.config.network as NetworkType
      );
      return result;
    } catch (error) {
      this.logger.errorLog(
        this.config.network,
        "Failed to get all intent IDs",
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }
}
