import { dbManager } from "../client";
import type { NetworkType } from "@/types";
import type { DepositTransactionRow } from "../types";

/**
 * Repository for deposit transaction operations
 * Adapted from new-monitor architecture with Neon SQL
 */
export class DepositRepository {
  /**
   * Get deposits by intent ID
   */
  async getDepositsByIntentId(
    intentId: number,
    network: NetworkType
  ): Promise<DepositTransactionRow[]> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    return (await sql`
      SELECT * FROM deposit_transactions 
      WHERE intent_id = ${intentId}
      ORDER BY created_at DESC
    `) as DepositTransactionRow[];
  }

  /**
   * Get deposit by cosmos hash
   */
  async getDepositByHash(
    cosmosHash: string,
    network: NetworkType
  ): Promise<DepositTransactionRow | null> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    const result = (await sql`
      SELECT * FROM deposit_transactions 
      WHERE cosmos_hash = ${cosmosHash}
    `) as DepositTransactionRow[];

    return result[0] || null;
  }

  /**
   * Get deposit transaction count
   */
  async getDepositCount(network: NetworkType): Promise<number> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    const result = (await sql`
      SELECT COUNT(*) as count FROM deposit_transactions
    `) as Array<{ count: number }>;

    return Number(result[0]?.count || 0);
  }

  /**
   * Get deposit transaction statistics
   */
  async getDepositTransactionStats(network: NetworkType): Promise<{
    totalDeposits: number;
    gasRefundedCount: number;
    avgDepositsPerIntent: number;
    latestDeposit: Date | null;
  }> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    const result = (await sql`
      SELECT 
        COUNT(*) as total_deposits,
        COUNT(CASE WHEN gas_refunded = true THEN 1 END) as gas_refunded_count,
        AVG(deposits_per_intent) as avg_deposits_per_intent,
        MAX(created_at) as latest_deposit
      FROM (
        SELECT 
          intent_id,
          created_at,
          gas_refunded,
          COUNT(*) OVER (PARTITION BY intent_id) as deposits_per_intent
        FROM deposit_transactions
      ) subquery
    `) as Array<{
      total_deposits: number;
      gas_refunded_count: number;
      avg_deposits_per_intent: number;
      latest_deposit: Date | null;
    }>;

    const row = result[0];
    return {
      totalDeposits: Number(row?.total_deposits || 0),
      gasRefundedCount: Number(row?.gas_refunded_count || 0),
      avgDepositsPerIntent: parseFloat(
        String(row?.avg_deposits_per_intent || 0)
      ),
      latestDeposit: row?.latest_deposit || null,
    };
  }

  /**
   * Get latest deposit transactions
   */
  async getLatestDeposits(
    network: NetworkType,
    limit: number = 20
  ): Promise<DepositTransactionRow[]> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    return (await sql`
      SELECT * FROM deposit_transactions 
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `) as DepositTransactionRow[];
  }

  /**
   * Get transactions by intent (combined fills and deposits)
   */
  async getTransactionsByIntent(
    intentId: number,
    network: NetworkType
  ): Promise<{
    deposits: DepositTransactionRow[];
  }> {
    const deposits = await this.getDepositsByIntentId(intentId, network);
    return { deposits };
  }
}
