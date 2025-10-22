import { DatabaseClient } from "../client";
import {
  type DatabaseFillTransaction,
  type InsertFillTransaction,
  type NetworkType,
} from "../../types/database";
import { type FillTransaction } from "../../../client";

export class FillRepository {
  constructor(private db: DatabaseClient) {}

  async upsertFillTransaction(
    fill: FillTransaction,
    network: NetworkType
  ): Promise<void> {
    await this.db.query(
      `
      INSERT INTO fill_transactions (
        cosmos_hash, height, intent_id, filler_address, evm_tx_hash,
        chain_id, universe, network
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (cosmos_hash) DO NOTHING
    `,
      [
        fill.cosmosHash,
        fill.height,
        fill.intentId,
        fill.fillerAddress,
        fill.evmTxHash,
        fill.chainID,
        fill.universe,
        network,
      ]
    );
  }

  async upsertFillTransactions(
    fills: FillTransaction[],
    network: NetworkType
  ): Promise<void> {
    if (fills.length === 0) {
      return;
    }

    await this.db.transaction(async (client) => {
      for (const fill of fills) {
        await client.query(
          `
          INSERT INTO fill_transactions (
            cosmos_hash, height, intent_id, filler_address, evm_tx_hash,
            chain_id, universe, network
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (cosmos_hash) DO NOTHING
        `,
          [
            fill.cosmosHash,
            fill.height,
            fill.intentId,
            fill.fillerAddress,
            fill.evmTxHash,
            fill.chainID,
            fill.universe,
            network,
          ]
        );
      }
    });
  }

  async getFillTransaction(
    cosmosHash: string
  ): Promise<DatabaseFillTransaction | null> {
    const result = await this.db.query(
      "SELECT * FROM fill_transactions WHERE cosmos_hash = $1",
      [cosmosHash]
    );
    return result.rows[0] || null;
  }

  async getFillTransactionsByIntent(
    intentId: number
  ): Promise<DatabaseFillTransaction[]> {
    const result = await this.db.query(
      "SELECT * FROM fill_transactions WHERE intent_id = $1 ORDER BY created_at ASC",
      [intentId]
    );
    return result.rows;
  }

  async getFillTransactionsByNetwork(
    network: NetworkType,
    limit: number = 100,
    offset: number = 0
  ): Promise<DatabaseFillTransaction[]> {
    const result = await this.db.query(
      "SELECT * FROM fill_transactions WHERE network = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
      [network, limit, offset]
    );
    return result.rows;
  }

  async getFillTransactionsByFiller(
    fillerAddress: string,
    network?: NetworkType,
    limit: number = 100,
    offset: number = 0
  ): Promise<DatabaseFillTransaction[]> {
    let query = "SELECT * FROM fill_transactions WHERE filler_address = $1";
    const params: any[] = [fillerAddress];
    let paramIndex = 2;

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

  async getFillTransactionsInRange(
    startHeight: string,
    endHeight: string,
    network?: NetworkType
  ): Promise<DatabaseFillTransaction[]> {
    let query =
      "SELECT * FROM fill_transactions WHERE height BETWEEN $1 AND $2";
    const params: any[] = [startHeight, endHeight];

    if (network) {
      query += " AND network = $3";
      params.push(network);
    }

    query += " ORDER BY height ASC";

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async getFillTransactionCount(network?: NetworkType): Promise<number> {
    let query = "SELECT COUNT(*) as count FROM fill_transactions";
    const params: any[] = [];

    if (network) {
      query += " WHERE network = $1";
      params.push(network);
    }

    const result = await this.db.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async getFillTransactionCountByIntent(intentId: number): Promise<number> {
    const result = await this.db.query(
      "SELECT COUNT(*) as count FROM fill_transactions WHERE intent_id = $1",
      [intentId]
    );
    return parseInt(result.rows[0].count);
  }

  async getLatestFillTransaction(
    network?: NetworkType
  ): Promise<DatabaseFillTransaction | null> {
    let query = "SELECT * FROM fill_transactions";
    const params: any[] = [];

    if (network) {
      query += " WHERE network = $1";
      params.push(network);
    }

    query += " ORDER BY created_at DESC LIMIT 1";

    const result = await this.db.query(query, params);
    return result.rows[0] || null;
  }

  async getFillTransactionStats(network?: NetworkType): Promise<{
    totalFills: number;
    uniqueFillers: number;
    avgFillsPerIntent: number;
    latestFill: Date | null;
  }> {
    let baseQuery = "FROM fill_transactions";
    const params: any[] = [];

    if (network) {
      baseQuery += " WHERE network = $1";
      params.push(network);
    }

    const result = await this.db.query(
      `
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
        ${baseQuery}
      ) subquery
    `,
      params
    );

    const row = result.rows[0];
    return {
      totalFills: parseInt(row.total_fills) || 0,
      uniqueFillers: parseInt(row.unique_fillers) || 0,
      avgFillsPerIntent: parseFloat(row.avg_fills_per_intent) || 0,
      latestFill: row.latest_fill || null,
    };
  }
}
