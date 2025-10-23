/**
 * Types for EVM event syncers
 */

export interface FillEvent {
  requestHash: `0x${string}`;
  from: `0x${string}`;
  solver: `0x${string}`;
  txHash: `0x${string}`;
  blockNumber: bigint;
  logIndex: number;
  chainId: number;
}

export interface DepositEvent {
  requestHash: `0x${string}`;
  from: `0x${string}`;
  gasRefunded: boolean;
  txHash: `0x${string}`;
  blockNumber: bigint;
  logIndex: number;
  chainId: number;
}

export interface SyncProgress {
  chainId: number;
  chainName: string;
  lastSyncedBlock: bigint;
  latestBlock: bigint;
}

export interface SyncResult {
  chainId: number;
  chainName: string;
  fillEvents: number;
  depositEvents: number;
  fromBlock: bigint;
  toBlock: bigint;
  success: boolean;
  error?: string;
}
