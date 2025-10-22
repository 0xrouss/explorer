import type { DatabaseClient } from "../client";
import type { FillTransaction } from "../../client/client";
import type { FillTransactionRow } from "../types";

/**
 * Repository for fill transaction operations
 */
export class FillRepository {
  constructor(private db: DatabaseClient) {}

  /**
   * Insert or update a fill transaction
   */
  async upsertFill(fill: FillTransaction): Promise<void> {
    const sql = this.db.getClient();

    await sql`
      INSERT INTO fill_transactions (
        cosmos_hash, height, intent_id, filler_address,
        evm_tx_hash, chain_id, universe
      ) VALUES (
        ${fill.cosmosHash},
        ${fill.height},
        ${fill.intentId},
        ${fill.fillerAddress},
        ${fill.evmTxHash},
        ${fill.chainID},
        ${fill.universe}
      )
      ON CONFLICT (cosmos_hash) DO UPDATE SET
        height = EXCLUDED.height,
        filler_address = EXCLUDED.filler_address,
        evm_tx_hash = EXCLUDED.evm_tx_hash,
        chain_id = EXCLUDED.chain_id,
        universe = EXCLUDED.universe
    `;
  }

  /**
   * Batch insert or update fill transactions
   */
  async upsertFills(fills: FillTransaction[]): Promise<void> {
    if (fills.length === 0) return;

    await this.db.transaction(async (tx) => {
      for (const fill of fills) {
        await tx`
          INSERT INTO fill_transactions (
            cosmos_hash, height, intent_id, filler_address,
            evm_tx_hash, chain_id, universe
          ) VALUES (
            ${fill.cosmosHash},
            ${fill.height},
            ${fill.intentId},
            ${fill.fillerAddress},
            ${fill.evmTxHash},
            ${fill.chainID},
            ${fill.universe}
          )
          ON CONFLICT (cosmos_hash) DO UPDATE SET
            height = EXCLUDED.height,
            filler_address = EXCLUDED.filler_address,
            evm_tx_hash = EXCLUDED.evm_tx_hash,
            chain_id = EXCLUDED.chain_id,
            universe = EXCLUDED.universe
        `;
      }
    });
  }

  /**
   * Get fills by intent ID
   */
  async getFillsByIntentId(intentId: number): Promise<FillTransactionRow[]> {
    const sql = this.db.getClient();
    return (await sql`
      SELECT * FROM fill_transactions 
      WHERE intent_id = ${intentId}
      ORDER BY created_at DESC
    `) as FillTransactionRow[];
  }

  /**
   * Get fill by cosmos hash
   */
  async getFillByHash(cosmosHash: string): Promise<FillTransactionRow | null> {
    const sql = this.db.getClient();
    const result = (await sql`
      SELECT * FROM fill_transactions 
      WHERE cosmos_hash = ${cosmosHash}
    `) as FillTransactionRow[];
    return result[0] || null;
  }

  /**
   * Get fill transaction count
   */
  async getFillCount(): Promise<number> {
    const sql = this.db.getClient();
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
    limit = 100
  ): Promise<FillTransactionRow[]> {
    const sql = this.db.getClient();
    return (await sql`
      SELECT * FROM fill_transactions 
      WHERE filler_address = ${fillerAddress}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `) as FillTransactionRow[];
  }
}
