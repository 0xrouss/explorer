import { DatabaseClient } from "../client";
import {
  type DatabaseDepositTransaction,
  type InsertDepositTransaction,
  type NetworkType,
} from "../../types/database";
import { type DepositTransaction } from "../../../client";

export class DepositRepository {
  constructor(private db: DatabaseClient) {}

  async upsertDepositTransaction(
    deposit: DepositTransaction,
    network: NetworkType
  ): Promise<void> {
    await this.db.query(
      `
      INSERT INTO deposit_transactions (
        cosmos_hash, height, intent_id, chain_id, universe, network, gas_refunded
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (cosmos_hash) DO NOTHING
    `,
      [
        deposit.cosmosHash,
        deposit.height,
        deposit.intentId,
        deposit.chainID,
        deposit.universe,
        network,
        deposit.gasRefunded,
      ]
    );
  }

  async upsertDepositTransactions(
    deposits: DepositTransaction[],
    network: NetworkType
  ): Promise<void> {
    if (deposits.length === 0) {
      return;
    }

    await this.db.transaction(async (client) => {
      for (const deposit of deposits) {
        await client.query(
          `
          INSERT INTO deposit_transactions (
            cosmos_hash, height, intent_id, chain_id, universe, network, gas_refunded
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (cosmos_hash) DO NOTHING
        `,
          [
            deposit.cosmosHash,
            deposit.height,
            deposit.intentId,
            deposit.chainID,
            deposit.universe,
            network,
            deposit.gasRefunded,
          ]
        );
      }
    });
  }

  async getDepositTransaction(
    cosmosHash: string
  ): Promise<DatabaseDepositTransaction | null> {
    const result = await this.db.query(
      "SELECT * FROM deposit_transactions WHERE cosmos_hash = $1",
      [cosmosHash]
    );
    return result.rows[0] || null;
  }

  async getDepositTransactionsByIntent(
    intentId: number
  ): Promise<DatabaseDepositTransaction[]> {
    const result = await this.db.query(
      "SELECT * FROM deposit_transactions WHERE intent_id = $1 ORDER BY created_at ASC",
      [intentId]
    );
    return result.rows;
  }

  async getDepositTransactionsByNetwork(
    network: NetworkType,
    limit: number = 100,
    offset: number = 0
  ): Promise<DatabaseDepositTransaction[]> {
    const result = await this.db.query(
      "SELECT * FROM deposit_transactions WHERE network = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [network, limit, offset]
    );
    return result.rows;
  }

  async getDepositTransactionsInRange(
    startHeight: string,
    endHeight: string,
    network?: NetworkType
  ): Promise<DatabaseDepositTransaction[]> {
    let query =
      "SELECT * FROM deposit_transactions WHERE height BETWEEN $1 AND $2";
    const params: any[] = [startHeight, endHeight];

    if (network) {
      query += " AND network = $3";
      params.push(network);
    }

    query += " ORDER BY height ASC";

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async getDepositTransactionCount(network?: NetworkType): Promise<number> {
    let query = "SELECT COUNT(*) as count FROM deposit_transactions";
    const params: any[] = [];

    if (network) {
      query += " WHERE network = $1";
      params.push(network);
    }

    const result = await this.db.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getDepositTransactionCountByIntent(intentId: number): Promise<number> {
    const result = await this.db.query(
      "SELECT COUNT(*) as count FROM deposit_transactions WHERE intent_id = $1",
      [intentId]
    );
    return parseInt(result.rows[0].count);
  }

  async getLatestDepositTransaction(
    network?: NetworkType
  ): Promise<DatabaseDepositTransaction | null> {
    let query = "SELECT * FROM deposit_transactions";
    const params: any[] = [];

    if (network) {
      query += " WHERE network = $1";
      params.push(network);
    }

    query += " ORDER BY created_at DESC LIMIT 1";

    const result = await this.db.query(query, params);
    return result.rows[0] || null;
  }

  async getDepositTransactionStats(network?: NetworkType): Promise<{
    totalDeposits: number;
    gasRefundedCount: number;
    avgDepositsPerIntent: number;
    latestDeposit: Date | null;
  }> {
    let baseQuery = "FROM deposit_transactions";
    const params: any[] = [];

    if (network) {
      baseQuery += " WHERE network = $1";
      params.push(network);
    }

    const result = await this.db.query(
      `
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
        ${baseQuery}
      ) subquery
    `,
      params
    );

    const row = result.rows[0];
    return {
      totalDeposits: parseInt(row.total_deposits) || 0,
      gasRefundedCount: parseInt(row.gas_refunded_count) || 0,
      avgDepositsPerIntent: parseFloat(row.avg_deposits_per_intent) || 0,
      latestDeposit: row.latest_deposit || null,
    };
  }

  async getDepositTransactionsWithGasRefunded(
    network?: NetworkType,
    limit: number = 100,
    offset: number = 0
  ): Promise<DatabaseDepositTransaction[]> {
    let query = "SELECT * FROM deposit_transactions WHERE gas_refunded = true";
    const params: any[] = [];
    let paramIndex = 1;

    if (network) {
      query += ` AND network = $${paramIndex}`;
      params.push(network);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${
      paramIndex + 1
    }`;
    params.push(limit, offset);

    const result = await this.db.query(query, params);
    return result.rows;
  }
}
