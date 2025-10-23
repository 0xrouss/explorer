/**
 * Database Migration Script
 * Creates evm_fill_events and evm_deposit_events tables
 */

import { DatabaseClient } from "./database/client";

async function runMigration() {
  console.log("🔄 Running database migration...\n");

  const client = new DatabaseClient(process.env.DATABASE_URL!);
  await client.connect();
  const sql = client.getClient();

  try {
    // Create evm_fill_events table
    console.log("Creating evm_fill_events table...");
    await sql`
      CREATE TABLE IF NOT EXISTS evm_fill_events (
        id SERIAL PRIMARY KEY,
        request_hash VARCHAR(66) NOT NULL,
        intent_id BIGINT REFERENCES intents(id) ON DELETE CASCADE,
        chain_id BIGINT NOT NULL,
        tx_hash VARCHAR(66) NOT NULL,
        block_number BIGINT NOT NULL,
        log_index INTEGER NOT NULL,
        from_address VARCHAR(42) NOT NULL,
        solver_address VARCHAR(42) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(tx_hash, log_index)
      )
    `;

    // Create indexes for evm_fill_events
    console.log("Creating indexes for evm_fill_events...");
    await sql`CREATE INDEX IF NOT EXISTS idx_evm_fill_events_request_hash ON evm_fill_events(request_hash)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_evm_fill_events_intent_id ON evm_fill_events(intent_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_evm_fill_events_chain_id ON evm_fill_events(chain_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_evm_fill_events_tx_hash ON evm_fill_events(tx_hash)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_evm_fill_events_block_number ON evm_fill_events(block_number)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_evm_fill_events_from_address ON evm_fill_events(from_address)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_evm_fill_events_solver_address ON evm_fill_events(solver_address)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_evm_fill_events_created_at ON evm_fill_events(created_at)`;

    // Create evm_deposit_events table
    console.log("\nCreating evm_deposit_events table...");
    await sql`
      CREATE TABLE IF NOT EXISTS evm_deposit_events (
        id SERIAL PRIMARY KEY,
        request_hash VARCHAR(66) NOT NULL,
        intent_id BIGINT REFERENCES intents(id) ON DELETE CASCADE,
        chain_id BIGINT NOT NULL,
        tx_hash VARCHAR(66) NOT NULL,
        block_number BIGINT NOT NULL,
        log_index INTEGER NOT NULL,
        from_address VARCHAR(42) NOT NULL,
        gas_refunded BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(tx_hash, log_index)
      )
    `;

    // Create indexes for evm_deposit_events
    console.log("Creating indexes for evm_deposit_events...");
    await sql`CREATE INDEX IF NOT EXISTS idx_evm_deposit_events_request_hash ON evm_deposit_events(request_hash)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_evm_deposit_events_intent_id ON evm_deposit_events(intent_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_evm_deposit_events_chain_id ON evm_deposit_events(chain_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_evm_deposit_events_tx_hash ON evm_deposit_events(tx_hash)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_evm_deposit_events_block_number ON evm_deposit_events(block_number)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_evm_deposit_events_from_address ON evm_deposit_events(from_address)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_evm_deposit_events_created_at ON evm_deposit_events(created_at)`;

    console.log("\n✅ Migration completed successfully!\n");

    // Show table info
    const fillCount = await sql`SELECT COUNT(*) as count FROM evm_fill_events`;
    const depositCount =
      await sql`SELECT COUNT(*) as count FROM evm_deposit_events`;

    console.log("Table Status:");
    console.log(`  evm_fill_events:    ${fillCount[0].count} rows`);
    console.log(`  evm_deposit_events: ${depositCount[0].count} rows\n`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
