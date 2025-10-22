// Database type definitions for the intent monitor system

export type NetworkType = "CORAL" | "FOLLY" | "CERISE";
export type IntentStatus = "pending" | "deposited" | "fulfilled" | "refunded";

export interface DatabaseIntent {
  id: number;
  user_cosmos: string;
  status: IntentStatus;
  deposited: boolean;
  fulfilled: boolean;
  refunded: boolean;
  creation_block: number;
  expiry: number;
  fulfilled_at: number | null;
  destination_chain_id: number;
  destination_universe: number;
  fulfilled_by: string | null;
  nonce: string;
  network: NetworkType;
  created_at: Date;
  updated_at: Date;
}

export interface DatabaseIntentSource {
  id: number;
  intent_id: number;
  universe: number;
  chain_id: number;
  token_address: string;
  value: string;
  status: number;
  collection_fee_required: number;
  created_at: Date;
}

export interface DatabaseIntentDestination {
  id: number;
  intent_id: number;
  token_address: string;
  value: string;
  created_at: Date;
}

export interface DatabaseIntentSignature {
  id: number;
  intent_id: number;
  universe: number;
  address: string;
  signature: string;
  hash: string;
  created_at: Date;
}

export interface DatabaseFillTransaction {
  cosmos_hash: string;
  height: string;
  intent_id: number;
  filler_address: string;
  evm_tx_hash: string;
  chain_id: string;
  universe: number;
  network: NetworkType;
  created_at: Date;
}

export interface DatabaseDepositTransaction {
  cosmos_hash: string;
  height: string;
  intent_id: number;
  chain_id: string;
  universe: number;
  network: NetworkType;
  gas_refunded: boolean;
  created_at: Date;
}

export interface IntentSummary {
  id: number;
  user_cosmos: string;
  status: IntentStatus;
  deposited: boolean;
  fulfilled: boolean;
  refunded: boolean;
  creation_block: number;
  expiry: number;
  fulfilled_at: number | null;
  destination_chain_id: number;
  destination_universe: number;
  fulfilled_by: string | null;
  network: NetworkType;
  created_at: Date;
  updated_at: Date;
  source_count: number;
  destination_count: number;
  signature_count: number;
  fill_count: number;
  deposit_count: number;
}

// Insert types (without auto-generated fields)
export type InsertIntent = Omit<DatabaseIntent, "created_at" | "updated_at">;
export type InsertIntentSource = Omit<
  DatabaseIntentSource,
  "id" | "created_at"
>;
export type InsertIntentDestination = Omit<
  DatabaseIntentDestination,
  "id" | "created_at"
>;
export type InsertIntentSignature = Omit<
  DatabaseIntentSignature,
  "id" | "created_at"
>;
export type InsertFillTransaction = Omit<DatabaseFillTransaction, "created_at">;
export type InsertDepositTransaction = Omit<
  DatabaseDepositTransaction,
  "created_at"
>;

// Update types (partial with optional fields)
export type UpdateIntent = Partial<
  Pick<
    DatabaseIntent,
    | "status"
    | "deposited"
    | "fulfilled"
    | "refunded"
    | "fulfilled_at"
    | "fulfilled_by"
  >
>;

// Sync state tracking
export interface SyncState {
  network: NetworkType;
  last_intent_id: number;
  last_block_height: number;
  last_sync_at: Date;
  is_syncing: boolean;
}

// Monitor configuration
export interface MonitorConfig {
  databaseUrl: string;
  networks: {
    CORAL: boolean;
    FOLLY: boolean;
    CERISE: boolean;
  };
  intervalMs: number;
  logLevel: string;
  fullSync: boolean;
}
