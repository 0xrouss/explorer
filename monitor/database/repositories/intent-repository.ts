import { DatabaseClient } from "../client";
import type {
  DatabaseIntent,
  DatabaseIntentSource,
  DatabaseIntentDestination,
  DatabaseIntentSignature,
  InsertIntent,
  InsertIntentSource,
  InsertIntentDestination,
  InsertIntentSignature,
  UpdateIntent,
  NetworkType,
} from "../../types/database";
import type { Intent } from "../../../client";

export class IntentRepository {
  constructor(private db: DatabaseClient) {}

  async upsertIntent(intent: Intent, network: NetworkType): Promise<void> {
    await this.db.transaction(async (client) => {
      // Determine status based on intent flags
      let status: "pending" | "deposited" | "fulfilled" | "refunded" =
        "pending";
      if (intent.refunded) {
        status = "refunded";
      } else if (intent.fulfilled) {
        status = "fulfilled";
      } else if (intent.deposited) {
        status = "deposited";
      }

      // Upsert main intent record
      await client.query(
        `
        INSERT INTO intents (
          id, user_cosmos, status, deposited, fulfilled, refunded,
          creation_block, expiry, fulfilled_at, destination_chain_id,
          destination_universe, fulfilled_by, nonce, network
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          deposited = EXCLUDED.deposited,
          fulfilled = EXCLUDED.fulfilled,
          refunded = EXCLUDED.refunded,
          fulfilled_at = EXCLUDED.fulfilled_at,
          fulfilled_by = EXCLUDED.fulfilled_by,
          updated_at = NOW()
      `,
        [
          intent.id,
          intent.user,
          status,
          intent.deposited,
          intent.fulfilled,
          intent.refunded,
          intent.creationBlock,
          intent.expiry,
          intent.fulfilledAt || null,
          intent.destinationChainID,
          intent.destinationUniverse,
          intent.fulfilledBy,
          intent.nonce,
          network,
        ]
      );

      // Delete existing related records
      await client.query("DELETE FROM intent_sources WHERE intent_id = $1", [
        intent.id,
      ]);
      await client.query(
        "DELETE FROM intent_destinations WHERE intent_id = $1",
        [intent.id]
      );
      await client.query("DELETE FROM intent_signatures WHERE intent_id = $1", [
        intent.id,
      ]);

      // Insert sources
      for (const source of intent.sources) {
        await client.query(
          `
          INSERT INTO intent_sources (
            intent_id, universe, chain_id, token_address, value, status, collection_fee_required
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
          [
            intent.id,
            source.universe,
            source.chainID,
            source.tokenAddress,
            source.value,
            source.status,
            source.collectionFeeRequired,
          ]
        );
      }

      // Insert destinations
      for (const destination of intent.destinations) {
        await client.query(
          `
          INSERT INTO intent_destinations (intent_id, token_address, value)
          VALUES ($1, $2, $3)
        `,
          [intent.id, destination.tokenAddress, destination.value]
        );
      }

      // Insert signatures
      for (const signature of intent.signatureData) {
        await client.query(
          `
          INSERT INTO intent_signatures (
            intent_id, universe, address, signature, hash
          ) VALUES ($1, $2, $3, $4, $5)
        `,
          [
            intent.id,
            signature.universe,
            signature.address,
            signature.signature,
            signature.hash,
          ]
        );
      }
    });
  }

  async getIntent(intentId: number): Promise<DatabaseIntent | null> {
    const result = await this.db.query("SELECT * FROM intents WHERE id = $1", [
      intentId,
    ]);
    return result.rows[0] || null;
  }

  async getIntentWithRelations(intentId: number): Promise<{
    intent: DatabaseIntent;
    sources: DatabaseIntentSource[];
    destinations: DatabaseIntentDestination[];
    signatures: DatabaseIntentSignature[];
  } | null> {
    const intent = await this.getIntent(intentId);
    if (!intent) {
      return null;
    }

    const [sources, destinations, signatures] = await Promise.all([
      this.getIntentSources(intentId),
      this.getIntentDestinations(intentId),
      this.getIntentSignatures(intentId),
    ]);

    return { intent, sources, destinations, signatures };
  }

  async getIntentSources(intentId: number): Promise<DatabaseIntentSource[]> {
    const result = await this.db.query(
      "SELECT * FROM intent_sources WHERE intent_id = $1 ORDER BY id",
      [intentId]
    );
    return result.rows;
  }

  async getIntentDestinations(
    intentId: number
  ): Promise<DatabaseIntentDestination[]> {
    const result = await this.db.query(
      "SELECT * FROM intent_destinations WHERE intent_id = $1 ORDER BY id",
      [intentId]
    );
    return result.rows;
  }

  async getIntentSignatures(
    intentId: number
  ): Promise<DatabaseIntentSignature[]> {
    const result = await this.db.query(
      "SELECT * FROM intent_signatures WHERE intent_id = $1 ORDER BY id",
      [intentId]
    );
    return result.rows;
  }

  async getIntentsByNetwork(
    network: NetworkType,
    limit: number = 100,
    offset: number = 0
  ): Promise<DatabaseIntent[]> {
    const result = await this.db.query(
      "SELECT * FROM intents WHERE network = $1 ORDER BY id DESC LIMIT $2 OFFSET $3",
      [network, limit, offset]
    );
    return result.rows;
  }

  async getIntentsByUser(
    userCosmos: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<DatabaseIntent[]> {
    const result = await this.db.query(
      "SELECT * FROM intents WHERE user_cosmos = $1 ORDER BY id DESC LIMIT $2 OFFSET $3",
      [userCosmos, limit, offset]
    );
    return result.rows;
  }

  async getIntentsByStatus(
    status: string,
    network?: NetworkType,
    limit: number = 100,
    offset: number = 0
  ): Promise<DatabaseIntent[]> {
    let query = "SELECT * FROM intents WHERE status = $1";
    const params: any[] = [status];
    let paramIndex = 2;

    if (network) {
      query += ` AND network = $${paramIndex}`;
      params.push(network);
      paramIndex++;
    }

    query += ` ORDER BY id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async getIntentsInRange(
    startId: number,
    endId: number,
    network?: NetworkType
  ): Promise<DatabaseIntent[]> {
    let query = "SELECT * FROM intents WHERE id BETWEEN $1 AND $2";
    const params: any[] = [startId, endId];

    if (network) {
      query += " AND network = $3";
      params.push(network);
    }

    query += " ORDER BY id ASC";

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async getMaxIntentId(network?: NetworkType): Promise<number | null> {
    let query = "SELECT MAX(id) as max_id FROM intents";
    const params: any[] = [];

    if (network) {
      query += " WHERE network = $1";
      params.push(network);
    }

    const result = await this.db.query(query, params);
    const maxId = result.rows[0]?.max_id;

    // Convert to number if it exists
    if (maxId === null || maxId === undefined) {
      return null;
    }

    return parseInt(maxId, 10);
  }

  async getIntentCount(network?: NetworkType): Promise<number> {
    let query = "SELECT COUNT(*) as count FROM intents";
    const params: any[] = [];

    if (network) {
      query += " WHERE network = $1";
      params.push(network);
    }

    const result = await this.db.query(query, params);
    return parseInt(result.rows[0].count);
  }

  async updateIntentStatus(
    intentId: number,
    updates: UpdateIntent
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return; // Nothing to update
    }

    values.push(intentId);
    const query = `UPDATE intents SET ${fields.join(
      ", "
    )}, updated_at = NOW() WHERE id = $${paramIndex}`;

    await this.db.query(query, values);
  }

  async getIntentSummary(intentId: number): Promise<any> {
    const result = await this.db.query(
      "SELECT * FROM intent_summary WHERE id = $1",
      [intentId]
    );
    return result.rows[0] || null;
  }
}
