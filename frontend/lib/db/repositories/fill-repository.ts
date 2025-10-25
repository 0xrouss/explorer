import { dbManager } from "../client";
import type { NetworkType } from "@/types";
import type { FillTransactionRow } from "../types";

/**
 * Repository for fill transaction operations
 * Adapted from new-monitor architecture with Neon SQL
 */
export class FillRepository {
  /**
   * Get fills by intent ID
   */
  async getFillsByIntentId(
    intentId: number,
    network: NetworkType
  ): Promise<FillTransactionRow[]> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    return (await sql`
      SELECT * FROM fill_transactions 
      WHERE intent_id = ${intentId}
      ORDER BY created_at DESC
    `) as FillTransactionRow[];
  }

  /**
   * Get fill by cosmos hash
   */
  async getFillByHash(
    cosmosHash: string,
    network: NetworkType
  ): Promise<FillTransactionRow | null> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    const result = (await sql`
      SELECT * FROM fill_transactions 
      WHERE cosmos_hash = ${cosmosHash}
    `) as FillTransactionRow[];

    return result[0] || null;
  }

  /**
   * Get fill transaction count
   */
  async getFillCount(network: NetworkType): Promise<number> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    const result = (await sql`
      SELECT COUNT(*) as count FROM fill_transactions
    `) as Array<{ count: number }>;

    return Number(result[0]?.count || 0);
  }

  /**
   * Get fills by filler address
   */
  async getFillsByFillerAddress(
    fillerAddress: string,
    network: NetworkType,
    limit = 100,
    offset = 0
  ): Promise<FillTransactionRow[]> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    return (await sql`
      SELECT * FROM fill_transactions 
      WHERE filler_address = ${fillerAddress}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `) as FillTransactionRow[];
  }

  /**
   * Get fill transaction statistics
   */
  async getFillTransactionStats(network: NetworkType): Promise<{
    totalFills: number;
    uniqueFillers: number;
    avgFillsPerIntent: number;
    latestFill: Date | null;
  }> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    const result = (await sql`
      SELECT 
        COUNT(*) as total_fills,
        COUNT(DISTINCT filler_address) as unique_fillers,
        AVG(fills_per_intent) as avg_fills_per_intent,
        MAX(created_at) as latest_fill
      FROM (
        SELECT 
          filler_address,
          intent_id,
          created_at,
          COUNT(*) OVER (PARTITION BY intent_id) as fills_per_intent
        FROM fill_transactions
      ) subquery
    `) as Array<{
      total_fills: number;
      unique_fillers: number;
      avg_fills_per_intent: number;
      latest_fill: Date | null;
    }>;

    const row = result[0];
    return {
      totalFills: Number(row?.total_fills || 0),
      uniqueFillers: Number(row?.unique_fillers || 0),
      avgFillsPerIntent: parseFloat(String(row?.avg_fills_per_intent || 0)),
      latestFill: row?.latest_fill || null,
    };
  }

  /**
   * Get latest fill transactions
   */
  async getLatestFills(
    network: NetworkType,
    limit: number = 20
  ): Promise<FillTransactionRow[]> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    return (await sql`
      SELECT * FROM fill_transactions 
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `) as FillTransactionRow[];
  }
}
