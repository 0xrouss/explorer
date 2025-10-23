import type { DatabaseClient } from "../client";
import type { EvmFillEventRow } from "../types";
import type { FillEvent } from "../../evm/types";

/**
 * Repository for EVM fill event operations
 */
export class EvmFillRepository {
  constructor(private db: DatabaseClient) {}

  /**
   * Insert or update an EVM fill event
   */
  async upsertFillEvent(event: FillEvent): Promise<void> {
    const sql = this.db.getClient();

    await sql`
      INSERT INTO evm_fill_events (
        request_hash, chain_id, tx_hash, block_number,
        log_index, from_address, solver_address
      ) VALUES (
        ${event.requestHash},
        ${event.chainId},
        ${event.txHash},
        ${event.blockNumber.toString()},
        ${event.logIndex},
        ${event.from.toLowerCase()},
        ${event.solver.toLowerCase()}
      )
      ON CONFLICT (tx_hash, log_index) DO UPDATE SET
        request_hash = EXCLUDED.request_hash,
        chain_id = EXCLUDED.chain_id,
        block_number = EXCLUDED.block_number,
        from_address = EXCLUDED.from_address,
        solver_address = EXCLUDED.solver_address
    `;
  }

  /**
   * Batch insert or update fill events
   */
  async upsertFillEvents(events: FillEvent[]): Promise<void> {
    if (events.length === 0) return;

    await this.db.transaction(async (tx) => {
      for (const event of events) {
        await tx`
          INSERT INTO evm_fill_events (
            request_hash, chain_id, tx_hash, block_number,
            log_index, from_address, solver_address
          ) VALUES (
            ${event.requestHash},
            ${event.chainId},
            ${event.txHash},
            ${event.blockNumber.toString()},
            ${event.logIndex},
            ${event.from.toLowerCase()},
            ${event.solver.toLowerCase()}
          )
          ON CONFLICT (tx_hash, log_index) DO UPDATE SET
            request_hash = EXCLUDED.request_hash,
            chain_id = EXCLUDED.chain_id,
            block_number = EXCLUDED.block_number,
            from_address = EXCLUDED.from_address,
            solver_address = EXCLUDED.solver_address
        `;
      }
    });
  }

  /**
   * Get fill events by request hash
   */
  async getFillEventsByRequestHash(
    requestHash: string
  ): Promise<EvmFillEventRow[]> {
    const sql = this.db.getClient();
    return (await sql`
      SELECT * FROM evm_fill_events 
      WHERE request_hash = ${requestHash}
      ORDER BY block_number DESC, log_index DESC
    `) as EvmFillEventRow[];
  }

  /**
   * Get fill events by intent ID
   */
  async getFillEventsByIntentId(intentId: number): Promise<EvmFillEventRow[]> {
    const sql = this.db.getClient();
    return (await sql`
      SELECT * FROM evm_fill_events 
      WHERE intent_id = ${intentId}
      ORDER BY block_number DESC, log_index DESC
    `) as EvmFillEventRow[];
  }

  /**
   * Get fill events by chain ID
   */
  async getFillEventsByChainId(
    chainId: number,
    limit = 100
  ): Promise<EvmFillEventRow[]> {
    const sql = this.db.getClient();
    return (await sql`
      SELECT * FROM evm_fill_events 
      WHERE chain_id = ${chainId}
      ORDER BY block_number DESC, log_index DESC
      LIMIT ${limit}
    `) as EvmFillEventRow[];
  }

  /**
   * Get fill events by solver address
   */
  async getFillEventsBySolver(
    solverAddress: string,
    limit = 100
  ): Promise<EvmFillEventRow[]> {
    const sql = this.db.getClient();
    return (await sql`
      SELECT * FROM evm_fill_events 
      WHERE solver_address = ${solverAddress.toLowerCase()}
      ORDER BY block_number DESC, log_index DESC
      LIMIT ${limit}
    `) as EvmFillEventRow[];
  }

  /**
   * Get the maximum block number synced for a chain
   */
  async getMaxBlockNumber(chainId: number): Promise<bigint> {
    const sql = this.db.getClient();
    const result = (await sql`
      SELECT MAX(block_number) as max_block 
      FROM evm_fill_events 
      WHERE chain_id = ${chainId}
    `) as Array<{ max_block: string | null }>;

    const maxBlock = result[0]?.max_block;
    return maxBlock ? BigInt(maxBlock) : 0n;
  }

  /**
   * Get fill event count
   */
  async getFillEventCount(): Promise<number> {
    const sql = this.db.getClient();
    const result = (await sql`
      SELECT COUNT(*) as count FROM evm_fill_events
    `) as Array<{ count: number }>;
    return Number(result[0]?.count || 0);
  }

  /**
   * Get fill event count by chain
   */
  async getFillEventCountByChain(chainId: number): Promise<number> {
    const sql = this.db.getClient();
    const result = (await sql`
      SELECT COUNT(*) as count 
      FROM evm_fill_events 
      WHERE chain_id = ${chainId}
    `) as Array<{ count: number }>;
    return Number(result[0]?.count || 0);
  }

  /**
   * Get fill events with null intent_id (unlinked events)
   */
  async getUnlinkedFillEvents(limit = 1000): Promise<EvmFillEventRow[]> {
    const sql = this.db.getClient();
    return (await sql`
      SELECT * FROM evm_fill_events 
      WHERE intent_id IS NULL
      ORDER BY created_at DESC
      LIMIT ${limit}
    `) as EvmFillEventRow[];
  }

  /**
   * Update intent_id for a fill event
   */
  async updateIntentId(id: number, intentId: number): Promise<void> {
    const sql = this.db.getClient();
    await sql`
      UPDATE evm_fill_events 
      SET intent_id = ${intentId}
      WHERE id = ${id}
    `;
  }

  /**
   * Get count of unlinked fill events
   */
  async getUnlinkedFillEventCount(): Promise<number> {
    const sql = this.db.getClient();
    const result = (await sql`
      SELECT COUNT(*) as count 
      FROM evm_fill_events 
      WHERE intent_id IS NULL
    `) as Array<{ count: number }>;
    return Number(result[0]?.count || 0);
  }
}
