import { dbManager } from "../client";
import type { NetworkType, EvmFillEvent } from "@/types";

/**
 * Repository for EVM fill event operations
 */
export class EvmFillRepository {
  /**
   * Get EVM fill events by intent ID
   */
  async getFillEventsByIntentId(
    intentId: number,
    network: NetworkType
  ): Promise<EvmFillEvent[]> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    return (await sql`
      SELECT * FROM evm_fill_events 
      WHERE intent_id = ${intentId}
      ORDER BY block_number DESC, log_index DESC
    `) as EvmFillEvent[];
  }

  /**
   * Get EVM fill events by request hash
   */
  async getFillEventsByRequestHash(
    requestHash: string,
    network: NetworkType
  ): Promise<EvmFillEvent[]> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    return (await sql`
      SELECT * FROM evm_fill_events 
      WHERE request_hash = ${requestHash}
      ORDER BY block_number DESC, log_index DESC
    `) as EvmFillEvent[];
  }

  /**
   * Get EVM fill events by chain ID
   */
  async getFillEventsByChainId(
    chainId: number,
    network: NetworkType,
    limit = 100
  ): Promise<EvmFillEvent[]> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    return (await sql`
      SELECT * FROM evm_fill_events 
      WHERE chain_id = ${chainId}
      ORDER BY block_number DESC, log_index DESC
      LIMIT ${limit}
    `) as EvmFillEvent[];
  }

  /**
   * Get EVM fill events by solver address
   */
  async getFillEventsBySolver(
    solverAddress: string,
    network: NetworkType,
    limit = 100
  ): Promise<EvmFillEvent[]> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    return (await sql`
      SELECT * FROM evm_fill_events 
      WHERE solver_address = ${solverAddress.toLowerCase()}
      ORDER BY block_number DESC, log_index DESC
      LIMIT ${limit}
    `) as EvmFillEvent[];
  }

  /**
   * Get fill event count
   */
  async getFillEventCount(network: NetworkType): Promise<number> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    const result = (await sql`
      SELECT COUNT(*) as count FROM evm_fill_events
    `) as Array<{ count: number }>;
    return Number(result[0]?.count || 0);
  }

  /**
   * Get fill event count by chain
   */
  async getFillEventCountByChain(
    chainId: number,
    network: NetworkType
  ): Promise<number> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    const result = (await sql`
      SELECT COUNT(*) as count 
      FROM evm_fill_events 
      WHERE chain_id = ${chainId}
    `) as Array<{ count: number }>;
    return Number(result[0]?.count || 0);
  }
}
