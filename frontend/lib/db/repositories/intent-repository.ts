import { dbManager } from "../client";
import type { NetworkType, EvmFillEvent, EvmDepositEvent } from "@/types";
import type {
  IntentRow,
  IntentWithRelations,
  IntentSourceRow,
  IntentDestinationRow,
  IntentSignatureDataRow,
  FillTransactionRow,
  DepositTransactionRow,
} from "../types";

/**
 * Repository for intent operations
 * Adapted from new-monitor architecture with Neon SQL
 * Updated to include EVM events
 */
export class IntentRepository {
  /**
   * Get intent by ID
   */
  async getIntentById(
    intentId: number,
    network: NetworkType
  ): Promise<IntentRow | null> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    const result = (await sql`
      SELECT * FROM intents WHERE id = ${intentId}
    `) as IntentRow[];

    return result[0] || null;
  }

  /**
   * Get intent with all related data
   */
  async getIntentWithRelations(
    intentId: number,
    network: NetworkType
  ): Promise<IntentWithRelations | null> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    const intent = await this.getIntentById(intentId, network);
    if (!intent) return null;

    const [
      sources,
      destinations,
      signatureData,
      fills,
      deposits,
      evmFills,
      evmDeposits,
    ] = (await Promise.all([
      sql`SELECT * FROM intent_sources WHERE intent_id = ${intentId}`,
      sql`SELECT * FROM intent_destinations WHERE intent_id = ${intentId}`,
      sql`SELECT * FROM intent_signature_data WHERE intent_id = ${intentId}`,
      sql`SELECT * FROM fill_transactions WHERE intent_id = ${intentId}`,
      sql`SELECT * FROM deposit_transactions WHERE intent_id = ${intentId}`,
      sql`SELECT * FROM evm_fill_events WHERE intent_id = ${intentId} ORDER BY block_number DESC, log_index DESC`,
      sql`SELECT * FROM evm_deposit_events WHERE intent_id = ${intentId} ORDER BY block_number DESC, log_index DESC`,
    ])) as [
      IntentSourceRow[],
      IntentDestinationRow[],
      IntentSignatureDataRow[],
      FillTransactionRow[],
      DepositTransactionRow[],
      EvmFillEvent[],
      EvmDepositEvent[]
    ];

    return {
      ...intent,
      sources,
      destinations,
      signatureData,
      fills,
      deposits,
      evmFills,
      evmDeposits,
    };
  }

  /**
   * Get intent sources
   */
  async getIntentSources(
    intentId: number,
    network: NetworkType
  ): Promise<IntentSourceRow[]> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    return (await sql`
      SELECT * FROM intent_sources WHERE intent_id = ${intentId} ORDER BY id
    `) as IntentSourceRow[];
  }

  /**
   * Get intent destinations
   */
  async getIntentDestinations(
    intentId: number,
    network: NetworkType
  ): Promise<IntentDestinationRow[]> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    return (await sql`
      SELECT * FROM intent_destinations WHERE intent_id = ${intentId} ORDER BY id
    `) as IntentDestinationRow[];
  }

  /**
   * Get destinations for multiple intents
   */
  async getDestinationsForIntents(
    intentIds: number[],
    network: NetworkType
  ): Promise<Map<number, IntentDestinationRow[]>> {
    if (intentIds.length === 0) {
      return new Map();
    }

    const db = dbManager.getClient(network);
    const sql = db.getClient();

    const destinations = (await sql`
      SELECT * FROM intent_destinations 
      WHERE intent_id = ANY(${intentIds}) 
      ORDER BY intent_id, id
    `) as IntentDestinationRow[];

    // Group destinations by intent_id
    const destinationsMap = new Map<number, IntentDestinationRow[]>();
    for (const destination of destinations) {
      if (!destinationsMap.has(destination.intent_id)) {
        destinationsMap.set(destination.intent_id, []);
      }
      destinationsMap.get(destination.intent_id)!.push(destination);
    }

    return destinationsMap;
  }

  /**
   * Get sources for multiple intents
   */
  async getSourcesForIntents(
    intentIds: number[],
    network: NetworkType
  ): Promise<Map<number, IntentSourceRow[]>> {
    if (intentIds.length === 0) {
      return new Map();
    }

    const db = dbManager.getClient(network);
    const sql = db.getClient();

    const sources = (await sql`
      SELECT * FROM intent_sources 
      WHERE intent_id = ANY(${intentIds}) 
      ORDER BY intent_id, id
    `) as IntentSourceRow[];

    // Group sources by intent_id
    const sourcesMap = new Map<number, IntentSourceRow[]>();
    for (const source of sources) {
      if (!sourcesMap.has(source.intent_id)) {
        sourcesMap.set(source.intent_id, []);
      }
      sourcesMap.get(source.intent_id)!.push(source);
    }

    return sourcesMap;
  }

  /**
   * Get EVM deposits for multiple intents
   */
  async getEvmDepositsForIntents(
    intentIds: number[],
    network: NetworkType
  ): Promise<Map<number, any[]>> {
    if (intentIds.length === 0) {
      return new Map();
    }

    const db = dbManager.getClient(network);
    const sql = db.getClient();

    const evmDeposits = (await sql`
      SELECT * FROM evm_deposit_events 
      WHERE intent_id = ANY(${intentIds}) 
      ORDER BY intent_id, created_at
    `) as any[];

    // Group EVM deposits by intent_id
    const evmDepositsMap = new Map<number, any[]>();
    for (const deposit of evmDeposits) {
      if (!evmDepositsMap.has(deposit.intent_id)) {
        evmDepositsMap.set(deposit.intent_id, []);
      }
      evmDepositsMap.get(deposit.intent_id)!.push(deposit);
    }

    return evmDepositsMap;
  }

  /**
   * Get intent signature data
   */
  async getIntentSignatureData(
    intentId: number,
    network: NetworkType
  ): Promise<IntentSignatureDataRow[]> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    return (await sql`
      SELECT * FROM intent_signature_data WHERE intent_id = ${intentId} ORDER BY id
    `) as IntentSignatureDataRow[];
  }

  /**
   * Get max intent ID
   */
  async getMaxIntentId(network: NetworkType): Promise<number> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    const result = (await sql`
      SELECT COALESCE(MAX(id), 0) as max_id FROM intents
    `) as Array<{ max_id: number }>;

    return Number(result[0]?.max_id || 0);
  }

  /**
   * Get intents in range
   */
  async getIntentsInRange(
    startId: number,
    endId: number,
    network: NetworkType
  ): Promise<IntentRow[]> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    return (await sql`
      SELECT * FROM intents 
      WHERE id >= ${startId} AND id <= ${endId}
      ORDER BY id ASC
    `) as IntentRow[];
  }

  /**
   * Get intents by status (using boolean flags)
   */
  async getIntentsByStatus(
    network: NetworkType,
    deposited?: boolean,
    fulfilled?: boolean,
    refunded?: boolean,
    limit = 100,
    offset = 0
  ): Promise<IntentRow[]> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    // Build query based on status flags
    if (deposited !== undefined) {
      return (await sql`
        SELECT * FROM intents 
        WHERE deposited = ${deposited}
        ORDER BY id DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `) as IntentRow[];
    }

    if (fulfilled !== undefined) {
      return (await sql`
        SELECT * FROM intents 
        WHERE fulfilled = ${fulfilled}
        ORDER BY id DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `) as IntentRow[];
    }

    if (refunded !== undefined) {
      return (await sql`
        SELECT * FROM intents 
        WHERE refunded = ${refunded}
        ORDER BY id DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `) as IntentRow[];
    }

    // Return all intents
    return (await sql`
      SELECT * FROM intents 
      ORDER BY id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `) as IntentRow[];
  }

  /**
   * Get intents by network with optional filtering
   */
  async getIntentsByNetwork(
    network: NetworkType,
    limit: number = 100,
    offset: number = 0,
    statusFilter?: {
      deposited?: boolean;
      fulfilled?: boolean;
      refunded?: boolean;
    }
  ): Promise<IntentRow[]> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    // If no filter, return all
    if (!statusFilter) {
      return (await sql`
        SELECT * FROM intents 
        ORDER BY id DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `) as IntentRow[];
    }

    // Build query with proper Neon syntax
    // Check which filters are defined
    const hasDeposited = statusFilter.deposited !== undefined;
    const hasFulfilled = statusFilter.fulfilled !== undefined;
    const hasRefunded = statusFilter.refunded !== undefined;

    // Build query based on what filters are present
    if (hasDeposited && hasFulfilled && hasRefunded) {
      return (await sql`
        SELECT * FROM intents 
        WHERE deposited = ${statusFilter.deposited}
          AND fulfilled = ${statusFilter.fulfilled}
          AND refunded = ${statusFilter.refunded}
        ORDER BY id DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `) as IntentRow[];
    } else if (hasDeposited && hasFulfilled) {
      return (await sql`
        SELECT * FROM intents 
        WHERE deposited = ${statusFilter.deposited}
          AND fulfilled = ${statusFilter.fulfilled}
        ORDER BY id DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `) as IntentRow[];
    } else if (hasDeposited && hasRefunded) {
      return (await sql`
        SELECT * FROM intents 
        WHERE deposited = ${statusFilter.deposited}
          AND refunded = ${statusFilter.refunded}
        ORDER BY id DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `) as IntentRow[];
    } else if (hasFulfilled && hasRefunded) {
      return (await sql`
        SELECT * FROM intents 
        WHERE fulfilled = ${statusFilter.fulfilled}
          AND refunded = ${statusFilter.refunded}
        ORDER BY id DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `) as IntentRow[];
    } else if (hasDeposited) {
      return (await sql`
        SELECT * FROM intents 
        WHERE deposited = ${statusFilter.deposited}
        ORDER BY id DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `) as IntentRow[];
    } else if (hasFulfilled) {
      return (await sql`
        SELECT * FROM intents 
        WHERE fulfilled = ${statusFilter.fulfilled}
        ORDER BY id DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `) as IntentRow[];
    } else if (hasRefunded) {
      return (await sql`
        SELECT * FROM intents 
        WHERE refunded = ${statusFilter.refunded}
        ORDER BY id DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `) as IntentRow[];
    }

    // Fallback to all if somehow nothing matched
    return (await sql`
      SELECT * FROM intents 
      ORDER BY id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `) as IntentRow[];
  }

  /**
   * Get intents by user address
   */
  async getIntentsByUser(
    userAddress: string,
    network: NetworkType,
    limit: number = 100,
    offset: number = 0
  ): Promise<IntentRow[]> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    return (await sql`
      SELECT * FROM intents 
      WHERE user_address = ${userAddress}
      ORDER BY id DESC 
      LIMIT ${limit} 
      OFFSET ${offset}
    `) as IntentRow[];
  }

  /**
   * Get intents by signature address
   */
  async getIntentsBySignatureAddress(
    signatureAddress: string,
    network: NetworkType,
    limit: number = 100,
    offset: number = 0
  ): Promise<IntentRow[]> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    return (await sql`
      SELECT DISTINCT i.*, s.address as signature_address
      FROM intents i
      JOIN intent_signature_data s ON i.id = s.intent_id
      WHERE s.address = ${signatureAddress}
      ORDER BY i.id DESC 
      LIMIT ${limit} 
      OFFSET ${offset}
    `) as IntentRow[];
  }

  /**
   * Get intent count by signature address
   */
  async getIntentCountBySignatureAddress(
    signatureAddress: string,
    network: NetworkType
  ): Promise<number> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    const result = (await sql`
      SELECT COUNT(DISTINCT i.id) as count
      FROM intents i
      JOIN intent_signature_data s ON i.id = s.intent_id
      WHERE s.address = ${signatureAddress}
    `) as Array<{ count: number }>;

    return Number(result[0]?.count || 0);
  }

  /**
   * Search intents by ID or signature address
   */
  async searchIntents(
    query: string,
    network: NetworkType,
    limit: number = 100,
    offset: number = 0
  ): Promise<IntentRow[]> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    // Try to parse as intent ID first
    const intentId = parseInt(query, 10);

    if (!isNaN(intentId)) {
      // Search by intent ID
      return (await sql`
        SELECT * FROM intents 
        WHERE id = ${intentId}
      `) as IntentRow[];
    } else {
      // Search by signature address
      return (await sql`
        SELECT DISTINCT i.*
        FROM intents i
        JOIN intent_signature_data s ON i.id = s.intent_id
        WHERE s.address = ${query}
        ORDER BY i.id DESC 
        LIMIT ${limit} 
        OFFSET ${offset}
      `) as IntentRow[];
    }
  }

  /**
   * Get intent count
   */
  async getIntentCount(
    network: NetworkType,
    statusFilter?: {
      deposited?: boolean;
      fulfilled?: boolean;
      refunded?: boolean;
    }
  ): Promise<number> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    if (!statusFilter) {
      const result = (await sql`
        SELECT COUNT(*) as count FROM intents
      `) as Array<{ count: number }>;
      return Number(result[0]?.count || 0);
    }

    // Build query with proper Neon syntax
    const hasDeposited = statusFilter.deposited !== undefined;
    const hasFulfilled = statusFilter.fulfilled !== undefined;
    const hasRefunded = statusFilter.refunded !== undefined;

    // Build query based on what filters are present
    let result: Array<{ count: number }>;

    if (hasDeposited && hasFulfilled && hasRefunded) {
      result = (await sql`
        SELECT COUNT(*) as count FROM intents 
        WHERE deposited = ${statusFilter.deposited}
          AND fulfilled = ${statusFilter.fulfilled}
          AND refunded = ${statusFilter.refunded}
      `) as Array<{ count: number }>;
    } else if (hasDeposited && hasFulfilled) {
      result = (await sql`
        SELECT COUNT(*) as count FROM intents 
        WHERE deposited = ${statusFilter.deposited}
          AND fulfilled = ${statusFilter.fulfilled}
      `) as Array<{ count: number }>;
    } else if (hasDeposited && hasRefunded) {
      result = (await sql`
        SELECT COUNT(*) as count FROM intents 
        WHERE deposited = ${statusFilter.deposited}
          AND refunded = ${statusFilter.refunded}
      `) as Array<{ count: number }>;
    } else if (hasFulfilled && hasRefunded) {
      result = (await sql`
        SELECT COUNT(*) as count FROM intents 
        WHERE fulfilled = ${statusFilter.fulfilled}
          AND refunded = ${statusFilter.refunded}
      `) as Array<{ count: number }>;
    } else if (hasDeposited) {
      result = (await sql`
        SELECT COUNT(*) as count FROM intents 
        WHERE deposited = ${statusFilter.deposited}
      `) as Array<{ count: number }>;
    } else if (hasFulfilled) {
      result = (await sql`
        SELECT COUNT(*) as count FROM intents 
        WHERE fulfilled = ${statusFilter.fulfilled}
      `) as Array<{ count: number }>;
    } else if (hasRefunded) {
      result = (await sql`
        SELECT COUNT(*) as count FROM intents 
        WHERE refunded = ${statusFilter.refunded}
      `) as Array<{ count: number }>;
    } else {
      result = (await sql`
        SELECT COUNT(*) as count FROM intents
      `) as Array<{ count: number }>;
    }

    return Number(result[0]?.count || 0);
  }

  /**
   * Get all intent IDs
   */
  async getAllIntentIds(network: NetworkType): Promise<number[]> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    const result = (await sql`
      SELECT id FROM intents ORDER BY id ASC
    `) as Array<{ id: number }>;

    return result.map((row) => row.id);
  }

  /**
   * Get signature addresses for multiple intents
   * Returns map of intent_id -> signature addresses
   */
  async getSignatureAddressesForIntents(
    intentIds: number[],
    network: NetworkType
  ): Promise<Map<number, string[]>> {
    if (intentIds.length === 0) return new Map();

    const db = dbManager.getClient(network);
    const sql = db.getClient();

    const result = (await sql`
      SELECT intent_id, universe, address
      FROM intent_signature_data
      WHERE intent_id = ANY(${intentIds})
      ORDER BY intent_id, universe
    `) as Array<{ intent_id: number; universe: number; address: string }>;

    const map = new Map<number, string[]>();
    for (const row of result) {
      if (!map.has(row.intent_id)) {
        map.set(row.intent_id, []);
      }
      map.get(row.intent_id)!.push(row.address);
    }

    return map;
  }

  /**
   * Get universe 0 signature address for multiple intents
   * Returns map of intent_id -> signature address (universe 0)
   */
  async getUniverse0SignaturesForIntents(
    intentIds: number[],
    network: NetworkType
  ): Promise<Map<number, string | null>> {
    if (intentIds.length === 0) return new Map();

    const db = dbManager.getClient(network);
    const sql = db.getClient();

    const result = (await sql`
      SELECT DISTINCT ON (intent_id) intent_id, address
      FROM intent_signature_data
      WHERE intent_id = ANY(${intentIds}) AND universe = 0
      ORDER BY intent_id
    `) as Array<{ intent_id: number; address: string }>;

    const map = new Map<number, string | null>();
    for (const id of intentIds) {
      map.set(id, null);
    }
    for (const row of result) {
      map.set(row.intent_id, row.address);
    }

    return map;
  }

  /**
   * Get network statistics
   */
  async getNetworkStats(network: NetworkType): Promise<{
    totalIntents: number;
    pendingIntents: number;
    depositedIntents: number;
    fulfilledIntents: number;
    refundedIntents: number;
    uniqueUsers: number;
  }> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    const result = (await sql`
      SELECT 
        COUNT(*) as total_intents,
        COUNT(CASE WHEN deposited = false AND fulfilled = false AND refunded = false THEN 1 END) as pending_intents,
        COUNT(CASE WHEN deposited = true THEN 1 END) as deposited_intents,
        COUNT(CASE WHEN fulfilled = true THEN 1 END) as fulfilled_intents,
        COUNT(CASE WHEN refunded = true THEN 1 END) as refunded_intents,
        COUNT(DISTINCT user_address) as unique_users
      FROM intents
    `) as Array<{
      total_intents: number;
      pending_intents: number;
      deposited_intents: number;
      fulfilled_intents: number;
      refunded_intents: number;
      unique_users: number;
    }>;

    const row = result[0];
    return {
      totalIntents: Number(row?.total_intents || 0),
      pendingIntents: Number(row?.pending_intents || 0),
      depositedIntents: Number(row?.deposited_intents || 0),
      fulfilledIntents: Number(row?.fulfilled_intents || 0),
      refundedIntents: Number(row?.refunded_intents || 0),
      uniqueUsers: Number(row?.unique_users || 0),
    };
  }

  /**
   * Get user statistics by signature address
   */
  async getUserStats(
    signatureAddress: string,
    network: NetworkType
  ): Promise<{
    totalIntents: number;
    pendingIntents: number;
    depositedIntents: number;
    fulfilledIntents: number;
    refundedIntents: number;
    firstIntentDate: Date | null;
    lastIntentDate: Date | null;
  }> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    const result = (await sql`
      SELECT 
        COUNT(DISTINCT i.id) as total_intents,
        COUNT(DISTINCT CASE WHEN i.deposited = false AND i.fulfilled = false AND i.refunded = false THEN i.id END) as pending_intents,
        COUNT(DISTINCT CASE WHEN i.deposited = true THEN i.id END) as deposited_intents,
        COUNT(DISTINCT CASE WHEN i.fulfilled = true THEN i.id END) as fulfilled_intents,
        COUNT(DISTINCT CASE WHEN i.refunded = true THEN i.id END) as refunded_intents,
        MIN(i.created_at) as first_intent_date,
        MAX(i.created_at) as last_intent_date
      FROM intents i
      JOIN intent_signature_data s ON i.id = s.intent_id
      WHERE s.address = ${signatureAddress}
    `) as Array<{
      total_intents: number;
      pending_intents: number;
      deposited_intents: number;
      fulfilled_intents: number;
      refunded_intents: number;
      first_intent_date: Date | null;
      last_intent_date: Date | null;
    }>;

    const row = result[0];
    return {
      totalIntents: Number(row?.total_intents || 0),
      pendingIntents: Number(row?.pending_intents || 0),
      depositedIntents: Number(row?.deposited_intents || 0),
      fulfilledIntents: Number(row?.fulfilled_intents || 0),
      refundedIntents: Number(row?.refunded_intents || 0),
      firstIntentDate: row?.first_intent_date || null,
      lastIntentDate: row?.last_intent_date || null,
    };
  }
}
