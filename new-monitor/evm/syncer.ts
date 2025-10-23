/**
 * EVM Event Syncer
 * Fetches Fill and Deposit events from EVM chains using Viem and eth_getLogs
 */

import {
  createPublicClient,
  http,
  type PublicClient,
  type Log,
  decodeEventLog,
  parseAbiItem,
} from "viem";
import type { ChainConfig } from "./config";
import type { FillEvent, DepositEvent, SyncResult } from "./types";

// Event ABIs
const FILL_EVENT_ABI = parseAbiItem(
  "event Fill(bytes32 indexed requestHash, address from, address solver)"
);

const DEPOSIT_EVENT_ABI = parseAbiItem(
  "event Deposit(bytes32 indexed requestHash, address from, bool gasRefunded)"
);

/**
 * Syncer for a single EVM chain
 * Handles fetching Fill and Deposit events from the Nexus contract
 */
export class EvmChainSyncer {
  private client: PublicClient;
  private chainConfig: ChainConfig;
  private readonly BATCH_DELAY_MS = 100; // 100ms delay between batches to avoid rate limits

  constructor(chainConfig: ChainConfig) {
    this.chainConfig = chainConfig;
    this.client = createPublicClient({
      transport: http(chainConfig.rpcUrl, {
        timeout: 30000, // 30 second timeout
        retryCount: 5, // Retry up to 5 times
        retryDelay: 2000, // 2 second delay between retries (exponential backoff handled by Viem)
      }),
    });
  }

  /**
   * Get batch size for this chain
   */
  private getBatchSize(): bigint {
    return BigInt(this.chainConfig.batchSize);
  }

  /**
   * Sleep utility for batch delays
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get the current block number
   */
  async getCurrentBlockNumber(): Promise<bigint> {
    return await this.client.getBlockNumber();
  }

  /**
   * Fetch Fill events from the chain with automatic batching
   */
  async fetchFillEvents(
    fromBlock: bigint,
    toBlock: bigint
  ): Promise<FillEvent[]> {
    try {
      const allEvents: FillEvent[] = [];
      let currentFrom = fromBlock;

      // Process in batches based on chain's batchSize config
      while (currentFrom <= toBlock) {
        const batchSize = this.getBatchSize();
        const currentTo =
          currentFrom + batchSize - 1n > toBlock
            ? toBlock
            : currentFrom + batchSize - 1n;

        const logs = await this.client.getLogs({
          address: this.chainConfig.contractAddress,
          event: FILL_EVENT_ABI,
          fromBlock: currentFrom,
          toBlock: currentTo,
        });

        const events = logs.map((log) => this.parseFillEvent(log));
        allEvents.push(...events);

        currentFrom = currentTo + 1n;

        // Add delay between batches to avoid rate limits
        if (currentFrom <= toBlock) {
          await this.sleep(this.BATCH_DELAY_MS);
        }
      }

      return allEvents;
    } catch (error) {
      console.error(
        `[${this.chainConfig.name}] Error fetching fill events:`,
        error
      );
      throw error;
    }
  }

  /**
   * Fetch Deposit events from the chain with automatic batching
   */
  async fetchDepositEvents(
    fromBlock: bigint,
    toBlock: bigint
  ): Promise<DepositEvent[]> {
    try {
      const allEvents: DepositEvent[] = [];
      let currentFrom = fromBlock;

      // Process in batches based on chain's batchSize config
      while (currentFrom <= toBlock) {
        const batchSize = this.getBatchSize();
        const currentTo =
          currentFrom + batchSize - 1n > toBlock
            ? toBlock
            : currentFrom + batchSize - 1n;

        const logs = await this.client.getLogs({
          address: this.chainConfig.contractAddress,
          event: DEPOSIT_EVENT_ABI,
          fromBlock: currentFrom,
          toBlock: currentTo,
        });

        const events = logs.map((log) => this.parseDepositEvent(log));
        allEvents.push(...events);

        currentFrom = currentTo + 1n;

        // Add delay between batches to avoid rate limits
        if (currentFrom <= toBlock) {
          await this.sleep(this.BATCH_DELAY_MS);
        }
      }

      return allEvents;
    } catch (error) {
      console.error(
        `[${this.chainConfig.name}] Error fetching deposit events:`,
        error
      );
      throw error;
    }
  }

  /**
   * Fetch both Fill and Deposit events in parallel
   */
  async fetchAllEvents(
    fromBlock: bigint,
    toBlock: bigint
  ): Promise<{ fills: FillEvent[]; deposits: DepositEvent[] }> {
    const [fills, deposits] = await Promise.all([
      this.fetchFillEvents(fromBlock, toBlock),
      this.fetchDepositEvents(fromBlock, toBlock),
    ]);

    return { fills, deposits };
  }

  /**
   * Fetch and process events in batches with callbacks for incremental storage
   * This allows saving progress after each batch instead of waiting for all batches to complete
   */
  async fetchAndProcessBatches(
    fromBlock: bigint,
    toBlock: bigint,
    onBatchComplete: (
      fills: FillEvent[],
      deposits: DepositEvent[]
    ) => Promise<void>
  ): Promise<{ totalFills: number; totalDeposits: number }> {
    let totalFills = 0;
    let totalDeposits = 0;
    let currentFrom = fromBlock;

    // Process in batches based on chain's batchSize config
    while (currentFrom <= toBlock) {
      const batchSize = this.getBatchSize();
      const currentTo =
        currentFrom + batchSize - 1n > toBlock
          ? toBlock
          : currentFrom + batchSize - 1n;

      // Fetch fill and deposit events for this batch in parallel
      const [fillLogs, depositLogs] = await Promise.all([
        this.client.getLogs({
          address: this.chainConfig.contractAddress,
          event: FILL_EVENT_ABI,
          fromBlock: currentFrom,
          toBlock: currentTo,
        }),
        this.client.getLogs({
          address: this.chainConfig.contractAddress,
          event: DEPOSIT_EVENT_ABI,
          fromBlock: currentFrom,
          toBlock: currentTo,
        }),
      ]);

      // Parse events
      const fills = fillLogs.map((log) => this.parseFillEvent(log));
      const deposits = depositLogs.map((log) => this.parseDepositEvent(log));

      // Call the callback to store this batch immediately
      if (fills.length > 0 || deposits.length > 0) {
        await onBatchComplete(fills, deposits);
      }

      totalFills += fills.length;
      totalDeposits += deposits.length;

      currentFrom = currentTo + 1n;

      // Add delay between batches to avoid rate limits
      if (currentFrom <= toBlock) {
        await this.sleep(this.BATCH_DELAY_MS);
      }
    }

    return { totalFills, totalDeposits };
  }

  /**
   * Sync events from a block range and return the results
   */
  async syncBlockRange(
    fromBlock: bigint,
    toBlock: bigint
  ): Promise<SyncResult> {
    try {
      console.log(
        `[${this.chainConfig.name}] Syncing blocks ${fromBlock} to ${toBlock}...`
      );

      const { fills, deposits } = await this.fetchAllEvents(fromBlock, toBlock);

      console.log(
        `[${this.chainConfig.name}] Found ${fills.length} fills, ${deposits.length} deposits`
      );

      return {
        chainId: this.chainConfig.chainId,
        chainName: this.chainConfig.name,
        fillEvents: fills.length,
        depositEvents: deposits.length,
        fromBlock,
        toBlock,
        success: true,
      };
    } catch (error) {
      console.error(
        `[${this.chainConfig.name}] Error syncing block range:`,
        error
      );
      return {
        chainId: this.chainConfig.chainId,
        chainName: this.chainConfig.name,
        fillEvents: 0,
        depositEvents: 0,
        fromBlock,
        toBlock,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Parse a Fill event log
   */
  private parseFillEvent(log: Log): FillEvent {
    const decoded = decodeEventLog({
      abi: [FILL_EVENT_ABI],
      data: log.data,
      topics: log.topics,
    });

    return {
      requestHash: decoded.args.requestHash as `0x${string}`,
      from: decoded.args.from as `0x${string}`,
      solver: decoded.args.solver as `0x${string}`,
      txHash: log.transactionHash!,
      blockNumber: log.blockNumber!,
      logIndex: log.logIndex!,
      chainId: this.chainConfig.chainId,
    };
  }

  /**
   * Parse a Deposit event log
   */
  private parseDepositEvent(log: Log): DepositEvent {
    const decoded = decodeEventLog({
      abi: [DEPOSIT_EVENT_ABI],
      data: log.data,
      topics: log.topics,
    });

    return {
      requestHash: decoded.args.requestHash as `0x${string}`,
      from: decoded.args.from as `0x${string}`,
      gasRefunded: decoded.args.gasRefunded as boolean,
      txHash: log.transactionHash!,
      blockNumber: log.blockNumber!,
      logIndex: log.logIndex!,
      chainId: this.chainConfig.chainId,
    };
  }

  /**
   * Get chain configuration
   */
  getChainConfig(): ChainConfig {
    return this.chainConfig;
  }

  /**
   * Get the Viem client
   */
  getClient(): PublicClient {
    return this.client;
  }
}

/**
 * Create syncers for all chains in a network
 */
export function createSyncersForNetwork(
  chainConfigs: ChainConfig[]
): Map<number, EvmChainSyncer> {
  const syncers = new Map<number, EvmChainSyncer>();

  for (const config of chainConfigs) {
    const syncer = new EvmChainSyncer(config);
    syncers.set(config.chainId, syncer);
  }

  return syncers;
}
