/**
 * EVM module exports
 */

export { EvmChainSyncer, createSyncersForNetwork } from "./syncer";
export {
  CHAIN_CONFIGS,
  getChainsForNetwork,
  getChainConfig,
  EVENT_SIGNATURES,
} from "./config";
export type { ChainConfig } from "./config";
export type {
  FillEvent,
  DepositEvent,
  SyncProgress,
  SyncResult,
} from "./types";
