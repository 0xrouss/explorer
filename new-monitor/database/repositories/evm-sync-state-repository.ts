import type { DatabaseClient } from "../client";

/**
 * Repository to manage per-chain EVM sync cursor (last checked block)
 */
export class EvmSyncStateRepository {
  constructor(private db: DatabaseClient) {}

  async getLastCheckedBlock(chainId: number): Promise<bigint | null> {
    const sql = this.db.getClient();
    const rows = (await sql`
      SELECT last_checked_block
      FROM evm_sync_state
      WHERE chain_id = ${chainId}
      LIMIT 1
    `) as Array<{ last_checked_block: string | number | bigint }>;

    if (!rows || rows.length === 0) return null;
    const row = rows[0];
    if (row == null || (row as any).last_checked_block == null) return null;
    const value = row.last_checked_block as any;
    // Neon returns strings for BIGINT; normalize to bigint
    return typeof value === "bigint" ? value : BigInt(value);
  }

  async upsertLastCheckedBlock(
    chainId: number,
    lastCheckedBlock: bigint
  ): Promise<void> {
    const sql = this.db.getClient();
    await sql`
      INSERT INTO evm_sync_state (chain_id, last_checked_block)
      VALUES (${chainId}, ${lastCheckedBlock.toString()})
      ON CONFLICT (chain_id) DO UPDATE SET
        last_checked_block = EXCLUDED.last_checked_block,
        updated_at = NOW()
    `;
  }

  /**
   * Initialize/Backfill evm_sync_state from existing event tables.
   * For each chain present in evm_fill_events or evm_deposit_events, set
   * last_checked_block to the greater of the two tables' max block_number.
   * If a row already exists, keep the max(existing, computed).
   * Returns number of rows affected (best-effort).
   */
  async backfillFromExistingEvents(): Promise<number> {
    const sql = this.db.getClient();
    const result = (await sql`
      WITH chains AS (
        SELECT DISTINCT chain_id FROM evm_fill_events
        UNION
        SELECT DISTINCT chain_id FROM evm_deposit_events
      ),
      computed AS (
        SELECT
          c.chain_id,
          GREATEST(
            COALESCE((SELECT MAX(block_number) FROM evm_fill_events fe WHERE fe.chain_id = c.chain_id), 0),
            COALESCE((SELECT MAX(block_number) FROM evm_deposit_events de WHERE de.chain_id = c.chain_id), 0)
          ) AS last_checked_block
        FROM chains c
      )
      INSERT INTO evm_sync_state (chain_id, last_checked_block)
      SELECT chain_id, last_checked_block FROM computed
      ON CONFLICT (chain_id) DO UPDATE SET
        last_checked_block = GREATEST(evm_sync_state.last_checked_block, EXCLUDED.last_checked_block),
        updated_at = NOW()
      RETURNING 1;
    `) as Array<{ "1": number }>;

    return result?.length ?? 0;
  }
}
