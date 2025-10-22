import type { DatabaseClient } from "../client";
import type { DepositTransaction } from "../../client/client";
import type { DepositTransactionRow } from "../types";

/**
 * Repository for deposit transaction operations
 */
export class DepositRepository {
  constructor(private db: DatabaseClient) {}

  /**
   * Insert or update a deposit transaction
   */
  async upsertDeposit(deposit: DepositTransaction): Promise<void> {
    const sql = this.db.getClient();

    await sql`
      INSERT INTO deposit_transactions (
        cosmos_hash, height, intent_id, chain_id, universe, gas_refunded
      ) VALUES (
        ${deposit.cosmosHash},
        ${deposit.height},
        ${deposit.intentId},
        ${deposit.chainID},
        ${deposit.universe},
        ${deposit.gasRefunded}
      )
      ON CONFLICT (cosmos_hash) DO UPDATE SET
        height = EXCLUDED.height,
        chain_id = EXCLUDED.chain_id,
        universe = EXCLUDED.universe,
        gas_refunded = EXCLUDED.gas_refunded
    `;
  }

  /**
   * Batch insert or update deposit transactions
   */
  async upsertDeposits(deposits: DepositTransaction[]): Promise<void> {
    if (deposits.length === 0) return;

    await this.db.transaction(async (tx) => {
      for (const deposit of deposits) {
        await tx`
          INSERT INTO deposit_transactions (
            cosmos_hash, height, intent_id, chain_id, universe, gas_refunded
          ) VALUES (
            ${deposit.cosmosHash},
            ${deposit.height},
            ${deposit.intentId},
            ${deposit.chainID},
            ${deposit.universe},
            ${deposit.gasRefunded}
          )
          ON CONFLICT (cosmos_hash) DO UPDATE SET
            height = EXCLUDED.height,
            chain_id = EXCLUDED.chain_id,
            universe = EXCLUDED.universe,
            gas_refunded = EXCLUDED.gas_refunded
        `;
      }
    });
  }

  /**
   * Get deposits by intent ID
   */
  async getDepositsByIntentId(intentId: number): Promise<DepositTransactionRow[]> {
    const sql = this.db.getClient();
    return (await sql`
      SELECT * FROM deposit_transactions 
      WHERE intent_id = ${intentId}
      ORDER BY created_at DESC
    `) as DepositTransactionRow[];
  }

  /**
   * Get deposit by cosmos hash
   */
  async getDepositByHash(cosmosHash: string): Promise<DepositTransactionRow | null> {
    const sql = this.db.getClient();
    const result = (await sql`
      SELECT * FROM deposit_transactions 
      WHERE cosmos_hash = ${cosmosHash}
    `) as DepositTransactionRow[];
    return result[0] || null;
  }

  /**
   * Get deposit transaction count
   */
  async getDepositCount(): Promise<number> {
    const sql = this.db.getClient();
    const result = (await sql`
      SELECT COUNT(*) as count FROM deposit_transactions
    `) as Array<{ count: number }>;
    return Number(result[0]?.count || 0);
  }
}

