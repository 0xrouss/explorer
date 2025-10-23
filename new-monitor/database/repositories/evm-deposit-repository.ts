import type { DatabaseClient } from "../client";
import type { EvmDepositEventRow } from "../types";
import type { DepositEvent } from "../../evm/types";

/**
 * Repository for EVM deposit event operations
 */
export class EvmDepositRepository {
  constructor(private db: DatabaseClient) {}

  /**
   * Insert or update an EVM deposit event
   */
  async upsertDepositEvent(event: DepositEvent): Promise<void> {
    const sql = this.db.getClient();

    await sql`
      INSERT INTO evm_deposit_events (
        request_hash, chain_id, tx_hash, block_number,
        log_index, from_address, gas_refunded
      ) VALUES (
        ${event.requestHash},
        ${event.chainId},
        ${event.txHash},
        ${event.blockNumber.toString()},
        ${event.logIndex},
        ${event.from.toLowerCase()},
        ${event.gasRefunded}
      )
      ON CONFLICT (tx_hash, log_index) DO UPDATE SET
        request_hash = EXCLUDED.request_hash,
        chain_id = EXCLUDED.chain_id,
        block_number = EXCLUDED.block_number,
        from_address = EXCLUDED.from_address,
        gas_refunded = EXCLUDED.gas_refunded
    `;
  }

  /**
   * Batch insert or update deposit events
   */
  async upsertDepositEvents(events: DepositEvent[]): Promise<void> {
    if (events.length === 0) return;

    await this.db.transaction(async (tx) => {
      for (const event of events) {
        await tx`
          INSERT INTO evm_deposit_events (
            request_hash, chain_id, tx_hash, block_number,
            log_index, from_address, gas_refunded
          ) VALUES (
            ${event.requestHash},
            ${event.chainId},
            ${event.txHash},
            ${event.blockNumber.toString()},
            ${event.logIndex},
            ${event.from.toLowerCase()},
            ${event.gasRefunded}
          )
          ON CONFLICT (tx_hash, log_index) DO UPDATE SET
            request_hash = EXCLUDED.request_hash,
            chain_id = EXCLUDED.chain_id,
            block_number = EXCLUDED.block_number,
            from_address = EXCLUDED.from_address,
            gas_refunded = EXCLUDED.gas_refunded
        `;
      }
    });
  }

  /**
   * Get deposit events by request hash
   */
  async getDepositEventsByRequestHash(
    requestHash: string
  ): Promise<EvmDepositEventRow[]> {
    const sql = this.db.getClient();
    return (await sql`
      SELECT * FROM evm_deposit_events 
      WHERE request_hash = ${requestHash}
      ORDER BY block_number DESC, log_index DESC
    `) as EvmDepositEventRow[];
  }

  /**
   * Get deposit events by intent ID
   */
  async getDepositEventsByIntentId(
    intentId: number
  ): Promise<EvmDepositEventRow[]> {
    const sql = this.db.getClient();
    return (await sql`
      SELECT * FROM evm_deposit_events 
      WHERE intent_id = ${intentId}
      ORDER BY block_number DESC, log_index DESC
    `) as EvmDepositEventRow[];
  }

  /**
   * Get deposit events by chain ID
   */
  async getDepositEventsByChainId(
    chainId: number,
    limit = 100
  ): Promise<EvmDepositEventRow[]> {
    const sql = this.db.getClient();
    return (await sql`
      SELECT * FROM evm_deposit_events 
      WHERE chain_id = ${chainId}
      ORDER BY block_number DESC, log_index DESC
      LIMIT ${limit}
    `) as EvmDepositEventRow[];
  }

  /**
   * Get deposit events by from address
   */
  async getDepositEventsByFrom(
    fromAddress: string,
    limit = 100
  ): Promise<EvmDepositEventRow[]> {
    const sql = this.db.getClient();
    return (await sql`
      SELECT * FROM evm_deposit_events 
      WHERE from_address = ${fromAddress.toLowerCase()}
      ORDER BY block_number DESC, log_index DESC
      LIMIT ${limit}
    `) as EvmDepositEventRow[];
  }

  /**
   * Get the maximum block number synced for a chain
   */
  async getMaxBlockNumber(chainId: number): Promise<bigint> {
    const sql = this.db.getClient();
    const result = (await sql`
      SELECT MAX(block_number) as max_block 
      FROM evm_deposit_events 
      WHERE chain_id = ${chainId}
    `) as Array<{ max_block: string | null }>;

    const maxBlock = result[0]?.max_block;
    return maxBlock ? BigInt(maxBlock) : 0n;
  }

  /**
   * Get deposit event count
   */
  async getDepositEventCount(): Promise<number> {
    const sql = this.db.getClient();
    const result = (await sql`
      SELECT COUNT(*) as count FROM evm_deposit_events
    `) as Array<{ count: number }>;
    return Number(result[0]?.count || 0);
  }

  /**
   * Get deposit event count by chain
   */
  async getDepositEventCountByChain(chainId: number): Promise<number> {
    const sql = this.db.getClient();
    const result = (await sql`
      SELECT COUNT(*) as count 
      FROM evm_deposit_events 
      WHERE chain_id = ${chainId}
    `) as Array<{ count: number }>;
    return Number(result[0]?.count || 0);
  }

  /**
   * Get deposit events with null intent_id (unlinked events)
   */
  async getUnlinkedDepositEvents(limit = 1000): Promise<EvmDepositEventRow[]> {
    const sql = this.db.getClient();
    return (await sql`
      SELECT * FROM evm_deposit_events 
      WHERE intent_id IS NULL
      ORDER BY created_at DESC
      LIMIT ${limit}
    `) as EvmDepositEventRow[];
  }

  /**
   * Update intent_id for a deposit event
   */
  async updateIntentId(id: number, intentId: number): Promise<void> {
    const sql = this.db.getClient();
    await sql`
      UPDATE evm_deposit_events 
      SET intent_id = ${intentId}
      WHERE id = ${id}
    `;
  }

  /**
   * Get count of unlinked deposit events
   */
  async getUnlinkedDepositEventCount(): Promise<number> {
    const sql = this.db.getClient();
    const result = (await sql`
      SELECT COUNT(*) as count 
      FROM evm_deposit_events 
      WHERE intent_id IS NULL
    `) as Array<{ count: number }>;
    return Number(result[0]?.count || 0);
  }
}
