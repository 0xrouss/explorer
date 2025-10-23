/**
 * Database types matching the schema
 */

export interface IntentRow {
  id: number;
  user_address: string;
  expiry: number;
  creation_block: number;
  destination_chain_id: number;
  destination_universe: number;
  nonce: string;
  deposited: boolean;
  fulfilled: boolean;
  refunded: boolean;
  fulfilled_by: string | null;
  fulfilled_at: number;
  created_at: Date;
  updated_at: Date;
}

export interface IntentSourceRow {
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

export interface IntentDestinationRow {
  id: number;
  intent_id: number;
  token_address: string;
  value: string;
  created_at: Date;
}

export interface IntentSignatureDataRow {
  id: number;
  intent_id: number;
  universe: number;
  address: string;
  signature: string;
  hash: string;
  created_at: Date;
}

export interface FillTransactionRow {
  cosmos_hash: string;
  height: string;
  intent_id: number;
  filler_address: string;
  evm_tx_hash: string;
  chain_id: string;
  universe: number;
  created_at: Date;
}

export interface DepositTransactionRow {
  cosmos_hash: string;
  height: string;
  intent_id: number;
  chain_id: string;
  universe: number;
  gas_refunded: boolean;
  created_at: Date;
}

export interface EvmFillEventRow {
  id: number;
  request_hash: string;
  intent_id: number | null;
  chain_id: number;
  tx_hash: string;
  block_number: number;
  log_index: number;
  from_address: string;
  solver_address: string;
  created_at: Date;
}

export interface EvmDepositEventRow {
  id: number;
  request_hash: string;
  intent_id: number | null;
  chain_id: number;
  tx_hash: string;
  block_number: number;
  log_index: number;
  from_address: string;
  gas_refunded: boolean;
  created_at: Date;
}

/**
 * Full intent with all related data
 */
export interface IntentWithRelations extends IntentRow {
  sources: IntentSourceRow[];
  destinations: IntentDestinationRow[];
  signatureData: IntentSignatureDataRow[];
  fills: FillTransactionRow[];
  deposits: DepositTransactionRow[];
  evmFills: EvmFillEventRow[];
  evmDeposits: EvmDepositEventRow[];
}
