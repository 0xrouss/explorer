import { dbManager } from "../client";
import type { NetworkType, EvmDepositEvent } from "@/types";

/**
 * Repository for EVM deposit event operations
 */
export class EvmDepositRepository {
  /**
   * Get EVM deposit events by intent ID
   */
  async getDepositEventsByIntentId(
    intentId: number,
    network: NetworkType
  ): Promise<EvmDepositEvent[]> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    return (await sql`
      SELECT * FROM evm_deposit_events 
      WHERE intent_id = ${intentId}
      ORDER BY block_number DESC, log_index DESC
    `) as EvmDepositEvent[];
  }

  /**
   * Get EVM deposit events by request hash
   */
  async getDepositEventsByRequestHash(
    requestHash: string,
    network: NetworkType
  ): Promise<EvmDepositEvent[]> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    return (await sql`
      SELECT * FROM evm_deposit_events 
      WHERE request_hash = ${requestHash}
      ORDER BY block_number DESC, log_index DESC
    `) as EvmDepositEvent[];
  }

  /**
   * Get EVM deposit events by chain ID
   */
  async getDepositEventsByChainId(
    chainId: number,
    network: NetworkType,
    limit = 100
  ): Promise<EvmDepositEvent[]> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    return (await sql`
      SELECT * FROM evm_deposit_events 
      WHERE chain_id = ${chainId}
      ORDER BY block_number DESC, log_index DESC
      LIMIT ${limit}
    `) as EvmDepositEvent[];
  }

  /**
   * Get EVM deposit events by from address
   */
  async getDepositEventsByFrom(
    fromAddress: string,
    network: NetworkType,
    limit = 100
  ): Promise<EvmDepositEvent[]> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    return (await sql`
      SELECT * FROM evm_deposit_events 
      WHERE from_address = ${fromAddress.toLowerCase()}
      ORDER BY block_number DESC, log_index DESC
      LIMIT ${limit}
    `) as EvmDepositEvent[];
  }

  /**
   * Get deposit event count
   */
  async getDepositEventCount(network: NetworkType): Promise<number> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    const result = (await sql`
      SELECT COUNT(*) as count FROM evm_deposit_events
    `) as Array<{ count: number }>;
    return Number(result[0]?.count || 0);
  }

  /**
   * Get deposit event count by chain
   */
  async getDepositEventCountByChain(
    chainId: number,
    network: NetworkType
  ): Promise<number> {
    const db = dbManager.getClient(network);
    const sql = db.getClient();

    const result = (await sql`
      SELECT COUNT(*) as count 
      FROM evm_deposit_events 
      WHERE chain_id = ${chainId}
    `) as Array<{ count: number }>;
    return Number(result[0]?.count || 0);
  }
}
