import type { DatabaseClient } from "../client";
import type { Intent } from "../../client/client";
import type {
  IntentRow,
  IntentWithRelations,
  IntentSourceRow,
  IntentDestinationRow,
  IntentSignatureDataRow,
  FillTransactionRow,
  DepositTransactionRow,
  EvmFillEventRow,
  EvmDepositEventRow,
} from "../types";

/**
 * Repository for intent operations
 */
export class IntentRepository {
  constructor(private db: DatabaseClient) {}

  /**
   * Insert or update an intent with all related data
   */
  async upsertIntent(intent: Intent): Promise<void> {
    const sql = this.db.getClient();

    await this.db.transaction(async (tx) => {
      // Upsert main intent
      await tx`
        INSERT INTO intents (
          id, user_address, expiry, creation_block,
          destination_chain_id, destination_universe, nonce,
          deposited, fulfilled, refunded, fulfilled_by, fulfilled_at
        ) VALUES (
          ${intent.id},
          ${intent.user},
          ${intent.expiry},
          ${intent.creationBlock},
          ${intent.destinationChainID},
          ${intent.destinationUniverse},
          ${intent.nonce},
          ${intent.deposited},
          ${intent.fulfilled},
          ${intent.refunded},
          ${intent.fulfilledBy},
          ${intent.fulfilledAt}
        )
        ON CONFLICT (id) DO UPDATE SET
          deposited = EXCLUDED.deposited,
          fulfilled = EXCLUDED.fulfilled,
          refunded = EXCLUDED.refunded,
          fulfilled_by = EXCLUDED.fulfilled_by,
          fulfilled_at = EXCLUDED.fulfilled_at,
          updated_at = NOW()
      `;

      // Delete existing sources, destinations, and signatures
      await tx`DELETE FROM intent_sources WHERE intent_id = ${intent.id}`;
      await tx`DELETE FROM intent_destinations WHERE intent_id = ${intent.id}`;
      await tx`DELETE FROM intent_signature_data WHERE intent_id = ${intent.id}`;

      // Insert sources
      if (intent.sources.length > 0) {
        for (const source of intent.sources) {
          await tx`
            INSERT INTO intent_sources (
              intent_id, universe, chain_id, token_address,
              value, status, collection_fee_required
            ) VALUES (
              ${intent.id},
              ${source.universe},
              ${source.chainID},
              ${source.tokenAddress},
              ${source.value},
              ${source.status},
              ${source.collectionFeeRequired}
            )
          `;
        }
      }

      // Insert destinations
      if (intent.destinations.length > 0) {
        for (const destination of intent.destinations) {
          await tx`
            INSERT INTO intent_destinations (
              intent_id, token_address, value
            ) VALUES (
              ${intent.id},
              ${destination.tokenAddress},
              ${destination.value}
            )
          `;
        }
      }

      // Insert signature data
      if (intent.signatureData.length > 0) {
        for (const sig of intent.signatureData) {
          await tx`
            INSERT INTO intent_signature_data (
              intent_id, universe, address, signature, hash
            ) VALUES (
              ${intent.id},
              ${sig.universe},
              ${sig.address},
              ${sig.signature},
              ${sig.hash}
            )
          `;
        }
      }
    });
  }

  /**
   * Get intent by ID
   */
  async getIntentById(id: number): Promise<IntentRow | null> {
    const sql = this.db.getClient();
    const result = (await sql`
      SELECT * FROM intents WHERE id = ${id}
    `) as IntentRow[];
    return result[0] || null;
  }

  /**
   * Get intent with all related data
   */
  async getIntentWithRelations(
    id: number
  ): Promise<IntentWithRelations | null> {
    const sql = this.db.getClient();

    const intent = await this.getIntentById(id);
    if (!intent) return null;

    const [
      sources,
      destinations,
      signatureData,
      fills,
      deposits,
      evmFills,
      evmDeposits,
    ] = (await Promise.all([
      sql`SELECT * FROM intent_sources WHERE intent_id = ${id}`,
      sql`SELECT * FROM intent_destinations WHERE intent_id = ${id}`,
      sql`SELECT * FROM intent_signature_data WHERE intent_id = ${id}`,
      sql`SELECT * FROM fill_transactions WHERE intent_id = ${id}`,
      sql`SELECT * FROM deposit_transactions WHERE intent_id = ${id}`,
      sql`SELECT * FROM evm_fill_events WHERE intent_id = ${id}`,
      sql`SELECT * FROM evm_deposit_events WHERE intent_id = ${id}`,
    ])) as [
      IntentSourceRow[],
      IntentDestinationRow[],
      IntentSignatureDataRow[],
      FillTransactionRow[],
      DepositTransactionRow[],
      EvmFillEventRow[],
      EvmDepositEventRow[]
    ];

    return {
      ...intent,
      sources,
      destinations,
      signatureData,
      fills,
      deposits,
      evmFills,
      evmDeposits,
    };
  }

  /**
   * Get max intent ID
   */
  async getMaxIntentId(): Promise<number> {
    const sql = this.db.getClient();
    const result = (await sql`
      SELECT COALESCE(MAX(id), 0) as max_id FROM intents
    `) as Array<{ max_id: number }>;
    return Number(result[0]?.max_id || 0);
  }

  /**
   * Get intents in range
   */
  async getIntentsInRange(
    startId: number,
    endId: number
  ): Promise<IntentRow[]> {
    const sql = this.db.getClient();
    return (await sql`
      SELECT * FROM intents 
      WHERE id >= ${startId} AND id <= ${endId}
      ORDER BY id ASC
    `) as IntentRow[];
  }

  /**
   * Get intents by status
   */
  async getIntentsByStatus(
    pending = false,
    fulfilled = false,
    limit = 100,
    offset = 0
  ): Promise<IntentRow[]> {
    const sql = this.db.getClient();

    return (await sql`
      SELECT * FROM intents 
      WHERE 
        (${pending} = false OR (deposited = false AND fulfilled = false AND refunded = false))
        AND (${fulfilled} = false OR fulfilled = true)
      ORDER BY id DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `) as IntentRow[];
  }

  /**
   * Get all intent IDs
   */
  async getAllIntentIds(): Promise<number[]> {
    const sql = this.db.getClient();
    const result = (await sql`
      SELECT id FROM intents ORDER BY id ASC
    `) as Array<{ id: number }>;
    return result.map((row) => row.id);
  }

  /**
   * Get intent count
   */
  async getIntentCount(): Promise<number> {
    const sql = this.db.getClient();
    const result = (await sql`
      SELECT COUNT(*) as count FROM intents
    `) as Array<{ count: number }>;
    return Number(result[0]?.count || 0);
  }

  /**
   * Find intent ID by signature data hash (for linking EVM events)
   */
  async findIntentIdByHash(hash: string): Promise<number | null> {
    const sql = this.db.getClient();
    const result = (await sql`
      SELECT intent_id FROM intent_signature_data 
      WHERE hash = ${hash}
      LIMIT 1
    `) as Array<{ intent_id: number }>;
    return result[0]?.intent_id || null;
  }
}
