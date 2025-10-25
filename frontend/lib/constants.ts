import type { NetworkType } from "@/types";

export const NETWORKS: NetworkType[] = ["FULLY"];

export const NETWORK_CONFIG = {
  FULLY: {
    name: "Fully Network",
    color: "#4ECDC4",
    chainId: "fully-1",
    explorerUrl: "https://explorer.fully.network",
    rpcUrl: "https://rpc.fully.network",
  },
} as const;

export const STATUS_COLORS = {
  pending:
    "bg-[var(--status-warning)]/20 text-[var(--status-warning)] border-[var(--status-warning)]/30",
  deposited:
    "bg-[var(--status-info)]/20 text-[var(--status-info)] border-[var(--status-info)]/30",
  fulfilled:
    "bg-[var(--status-success)]/20 text-[var(--status-success)] border-[var(--status-success)]/30",
  refunded:
    "bg-[var(--status-error)]/20 text-[var(--status-error)] border-[var(--status-error)]/30",
  failed:
    "bg-[var(--text-muted)]/20 text-[var(--text-muted)] border-[var(--text-muted)]/30",
} as const;

export const STATUS_LABELS = {
  pending: "Pending",
  deposited: "Deposited",
  fulfilled: "Fulfilled",
  refunded: "Refunded",
  failed: "Failed",
} as const;

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
} as const;

export const SEARCH_TYPES = {
  INTENT_ID: "intent_id",
  SIGNATURE_ADDRESS: "signature_address",
  USER_ADDRESS: "user_address",
} as const;

export const TABLE_COLUMNS = {
  intents: [
    { key: "id", label: "Intent ID", sortable: true },
    { key: "user_address", label: "User", sortable: false },
    { key: "status", label: "Status", sortable: true },
    { key: "creation_block", label: "Block", sortable: true },
    {
      key: "destination_chain_id",
      label: "Destination Chain",
      sortable: false,
    },
    { key: "created_at", label: "Created", sortable: true },
  ],
  sources: [
    { key: "universe", label: "Universe" },
    { key: "chain_id", label: "Chain ID" },
    { key: "token_address", label: "Token Address" },
    { key: "value", label: "Value" },
    { key: "collection_fee_required", label: "Collection Fee" },
  ],
  destinations: [
    { key: "token_address", label: "Token Address" },
    { key: "value", label: "Value" },
  ],
  signatures: [
    { key: "universe", label: "Universe" },
    { key: "address", label: "Address" },
    { key: "hash", label: "Signature Hash" },
  ],
  fills: [
    { key: "cosmos_hash", label: "Cosmos Hash" },
    { key: "filler_address", label: "Filler" },
    { key: "evm_tx_hash", label: "EVM TX Hash" },
    { key: "chain_id", label: "Chain ID" },
    { key: "height", label: "Height" },
    { key: "created_at", label: "Created" },
  ],
  deposits: [
    { key: "cosmos_hash", label: "Cosmos Hash" },
    { key: "chain_id", label: "Chain ID" },
    { key: "universe", label: "Universe" },
    { key: "height", label: "Height" },
    { key: "gas_refunded", label: "Gas Refunded" },
    { key: "created_at", label: "Created" },
  ],
} as const;
