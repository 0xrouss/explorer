// Database type definitions for the intent monitor system
export type NetworkType = "FULLY";
export type IntentStatus =
  | "pending"
  | "deposited"
  | "fulfilled"
  | "refunded"
  | "failed";

// Helper function to derive status from boolean fields
// Status priority: fulfilled > refunded > failed (expired) > deposited > pending
export function getIntentStatus(intent: {
  deposited: boolean;
  fulfilled: boolean;
  refunded: boolean;
  expiry: number;
}): IntentStatus {
  // Highest priority: fulfilled
  if (intent.fulfilled) return "fulfilled";

  // Second priority: refunded
  if (intent.refunded) return "refunded";

  // Third priority: failed (expired, not fulfilled, not refunded - deposited doesn't matter)
  const now = Math.floor(Date.now() / 1000);
  if (now > intent.expiry) return "failed";

  // Fourth priority: deposited (not expired)
  if (intent.deposited) return "deposited";

  // Default: pending
  return "pending";
}

export interface DatabaseIntent {
  id: number;
  user_address: string; // Changed from user_cosmos to match new schema
  deposited: boolean;
  fulfilled: boolean;
  refunded: boolean;
  creation_block: number;
  expiry: number;
  fulfilled_at: number;
  destination_chain_id: number;
  destination_universe: number;
  fulfilled_by: string | null;
  nonce: string;
  created_at: Date;
  updated_at: Date;
  // Computed fields for display purposes
  status?: IntentStatus;
  signature_address?: string | null; // Universe 0 signature address for table display
  sources?: DatabaseIntentSource[]; // Optional sources for table display
  destinations?: DatabaseIntentDestination[]; // Optional destinations for table display
  evmDeposits?: any[]; // Optional EVM deposits for table display
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

// Aliasfor compatibility with new schema naming
export type IntentSignatureDataRow = DatabaseIntentSignature;

export interface DatabaseFillTransaction {
  cosmos_hash: string;
  height: string;
  intent_id: number;
  filler_address: string;
  evm_tx_hash: string;
  chain_id: string;
  universe: number;
  created_at: Date;
}

export interface DatabaseDepositTransaction {
  cosmos_hash: string;
  height: string;
  intent_id: number;
  chain_id: string;
  universe: number;
  gas_refunded: boolean;
  created_at: Date;
}

// EVM Transaction types from new-monitor schema
export interface EvmFillEvent {
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

export interface EvmDepositEvent {
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

export interface IntentSummary {
  id: number;
  user_address: string;
  deposited: boolean;
  fulfilled: boolean;
  refunded: boolean;
  creation_block: number;
  expiry: number;
  fulfilled_at: number;
  destination_chain_id: number;
  destination_universe: number;
  fulfilled_by: string | null;
  nonce: string;
  created_at: Date;
  updated_at: Date;
  source_count: number;
  destination_count: number;
  signature_count: number;
  fill_count: number;
  deposit_count: number;
  status?: IntentStatus;
}

// API Response Types - matches repository structure
export interface IntentWithRelations {
  // Flat structure matching the repository
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
  // Relations
  sources: DatabaseIntentSource[];
  destinations: DatabaseIntentDestination[];
  signatureData: IntentSignatureDataRow[];
  fills: DatabaseFillTransaction[];
  deposits: DatabaseDepositTransaction[];
  // EVM Events
  evmFills: EvmFillEvent[];
  evmDeposits: EvmDepositEvent[];
  // Computed fields
  status?: IntentStatus;
}

export interface TransactionData {
  fills: DatabaseFillTransaction[];
  deposits: DatabaseDepositTransaction[];
  evmFills: EvmFillEvent[];
  evmDeposits: EvmDepositEvent[];
}

export interface UserStats {
  totalIntents: number;
  pendingIntents: number;
  depositedIntents: number;
  fulfilledIntents: number;
  refundedIntents: number;
  firstIntentDate: Date | null;
  lastIntentDate: Date | null;
}

export interface NetworkStats {
  totalIntents: number;
  pendingIntents: number;
  depositedIntents: number;
  fulfilledIntents: number;
  refundedIntents: number;
  totalFills: number;
  totalDeposits: number;
  uniqueUsers: number;
}

// Frontend-specific types
export interface SearchParams {
  network: NetworkType;
  page?: number;
  limit?: number;
  status?: IntentStatus | "all";
  search?: string; // Intent ID or signature address
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  data: T;
  pagination?: PaginationInfo;
  error?: string;
}

// Component props types
export interface NetworkSelectorProps {
  selectedNetwork: NetworkType;
  onNetworkChange: (network: NetworkType) => void;
}

export interface IntentTableProps {
  intents: DatabaseIntent[];
  isLoading?: boolean;
  onIntentClick?: (intentId: number, network: NetworkType) => void;
}

export interface StatusBadgeProps {
  status: IntentStatus;
  size?: "sm" | "md" | "lg";
}

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}
