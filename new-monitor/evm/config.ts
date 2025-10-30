/**
 * EVM Chain Configuration
 * Maps network names to their chain configurations and contract addresses
 */

import type { NetworkName } from "../client/client";
import {
  mainnet,
  optimism,
  polygon,
  arbitrum,
  avalanche,
  base,
  scroll,
  kaia,
  bsc,
  sophon,
  sepolia,
  optimismSepolia,
  polygonAmoy,
  arbitrumSepolia,
  baseSepolia,
  monadTestnet,
} from "viem/chains";

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  wsRpcUrl?: string;
  contractAddress: `0x${string}`;
  deploymentBlock: bigint; // Block where contract was deployed
  batchSize: number; // Number of blocks to fetch per batch
}

/**
 * Chain configurations for each Arcana network
 */
export const CHAIN_CONFIGS: Record<NetworkName, ChainConfig[]> = {
  CORAL: [
    // Mainnet chains for CORAL network
    {
      chainId: 1,
      name: "Ethereum",
      rpcUrl:
        process.env.ETH_RPC_URL ||
        mainnet.rpcUrls.default.http[0] ||
        "https://eth.merkle.io",
      wsRpcUrl: process.env.ETH_WS_URL,
      contractAddress: "0xbada557252d286e45a1ad73f32479062d4e2e86b",
      deploymentBlock: 22638037n,
      batchSize: 1000,
    },
    {
      chainId: 10,
      name: "Optimism",
      rpcUrl:
        process.env.OP_RPC_URL ||
        optimism.rpcUrls.default.http[0] ||
        "https://mainnet.optimism.io",
      wsRpcUrl: process.env.OP_WS_URL,
      contractAddress: "0xbada557252d286e45a1ad73f32479062d4e2e86b",
      deploymentBlock: 136761101n,
      batchSize: 2000,
    },
    {
      chainId: 137,
      name: "Polygon",
      rpcUrl:
        process.env.POLYGON_RPC_URL ||
        "https://polygon.drpc.org" ||
        "https://polygon-rpc.com",
      wsRpcUrl: process.env.POLYGON_WS_URL,
      contractAddress: "0xbada557252d286e45a1ad73f32479062d4e2e86b",
      deploymentBlock: 72390505n,
      batchSize: 1000,
    },
    {
      chainId: 42161,
      name: "Arbitrum",
      rpcUrl:
        process.env.ARB_RPC_URL ||
        arbitrum.rpcUrls.default.http[0] ||
        "https://arb1.arbitrum.io/rpc",
      wsRpcUrl: process.env.ARB_WS_URL,
      contractAddress: "0xbada557252d286e45a1ad73f32479062d4e2e86b",
      deploymentBlock: 344140700n,
      batchSize: 2000,
    },
    {
      chainId: 43114,
      name: "Avalanche",
      rpcUrl:
        process.env.AVAX_RPC_URL ||
        avalanche.rpcUrls.default.http[0] ||
        "https://api.avax.network/ext/bc/C/rpc",
      wsRpcUrl: process.env.AVAX_WS_URL,
      contractAddress: "0xbada557252d286e45a1ad73f32479062d4e2e86b",
      deploymentBlock: 63342869n,
      batchSize: 1000,
    },
    {
      chainId: 8453,
      name: "Base",
      rpcUrl:
        process.env.BASE_RPC_URL ||
        base.rpcUrls.default.http[0] ||
        "https://mainnet.base.org",
      wsRpcUrl: process.env.BASE_WS_URL,
      contractAddress: "0xbada557252d286e45a1ad73f32479062d4e2e86b",
      deploymentBlock: 31165948n,
      batchSize: 2000,
    },
    {
      chainId: 534352,
      name: "Scroll",
      rpcUrl:
        process.env.SCROLL_RPC_URL ||
        scroll.rpcUrls.default.http[0] ||
        "https://rpc.scroll.io",
      wsRpcUrl: process.env.SCROLL_WS_URL,
      contractAddress: "0xbada557252d286e45a1ad73f32479062d4e2e86b",
      deploymentBlock: 16240320n,
      batchSize: 1000,
    },
    {
      chainId: 8217,
      name: "Kaia",
      rpcUrl:
        process.env.KAIA_RPC_URL ||
        kaia.rpcUrls.default.http[0] ||
        "https://public-en.node.kaia.io",
      wsRpcUrl: process.env.KAIA_WS_URL,
      contractAddress: "0xbada557252d286e45a1ad73f32479062d4e2e86b",
      deploymentBlock: 187763965n,
      batchSize: 1000,
    },
    {
      chainId: 56,
      name: "BNB Chain",
      rpcUrl:
        process.env.BNB_RPC_URL ||
        bsc.rpcUrls.default.http[0] ||
        "https://bsc-dataseed.binance.org",
      wsRpcUrl: process.env.BNB_WS_URL,
      contractAddress: "0xbada557252d286e45a1ad73f32479062d4e2e86b",
      deploymentBlock: 54212157n,
      batchSize: 2000,
    },
    {
      chainId: 999,
      name: "HyperEVM",
      rpcUrl: process.env.HYPEREVM_RPC_URL || "https://rpc.hyperliquid.xyz/evm",
      wsRpcUrl: process.env.HYPEREVM_WS_URL,
      contractAddress: "0xbada557252d286e45a1ad73f32479062d4e2e86b",
      deploymentBlock: 5046389n,
      batchSize: 500,
    },
    {
      chainId: 50104,
      name: "Sophon",
      rpcUrl:
        process.env.SOPHON_RPC_URL ||
        "https://monad-testnet.drpc.org" ||
        "https://rpc.sophon.xyz",
      wsRpcUrl: process.env.SOPHON_WS_URL,
      contractAddress: "0xB61fAdeBccCb15823b64bf47829d32eeb4A08930",
      deploymentBlock: 14035974n,
      batchSize: 1000,
    },
  ],
  FOLLY: [
    // Testnet chains for FOLLY network
    {
      chainId: 11155111,
      name: "Sepolia",
      rpcUrl:
        process.env.SEPOLIA_RPC_URL ||
        sepolia.rpcUrls.default.http[0] ||
        "https://rpc.sepolia.org",
      wsRpcUrl: process.env.SEPOLIA_WS_URL,
      contractAddress: "0xf0111ede031a4377c34a4ad900f1e633e41055dc",
      deploymentBlock: 8693649n,
      batchSize: 10000,
    },
    {
      chainId: 11155420,
      name: "Optimism Sepolia",
      rpcUrl:
        process.env.OP_SEPOLIA_RPC_URL ||
        optimismSepolia.rpcUrls.default.http[0] ||
        "https://sepolia.optimism.io",
      wsRpcUrl: process.env.OP_SEPOLIA_WS_URL,
      contractAddress: "0xf0111ede031a4377c34a4ad900f1e633e41055dc",
      deploymentBlock: 29173735n,
      batchSize: 10000,
    },
    {
      chainId: 80002,
      name: "Polygon Amoy",
      rpcUrl:
        process.env.POLYGON_AMOY_RPC_URL ||
        polygonAmoy.rpcUrls.default.http[0] ||
        "https://rpc-amoy.polygon.technology",
      wsRpcUrl: process.env.POLYGON_AMOY_WS_URL,
      contractAddress: "0xf0111ede031a4377c34a4ad900f1e633e41055dc",
      deploymentBlock: 22952669n,
      batchSize: 2000,
    },
    {
      chainId: 421614,
      name: "Arbitrum Sepolia",
      rpcUrl:
        process.env.ARB_SEPOLIA_RPC_URL ||
        arbitrumSepolia.rpcUrls.default.http[0] ||
        "https://sepolia-rollup.arbitrum.io/rpc",
      wsRpcUrl: process.env.ARB_SEPOLIA_WS_URL,
      contractAddress: "0xf0111ede031a4377c34a4ad900f1e633e41055dc",
      deploymentBlock: 164399754n,
      batchSize: 10000,
    },
    {
      chainId: 84532,
      name: "Base Sepolia",
      rpcUrl:
        process.env.BASE_SEPOLIA_RPC_URL ||
        baseSepolia.rpcUrls.default.http[0] ||
        "https://sepolia.base.org",
      wsRpcUrl: process.env.BASE_SEPOLIA_WS_URL,
      contractAddress: "0xf0111ede031a4377c34a4ad900f1e633e41055dc",
      deploymentBlock: 27190885n,
      batchSize: 10000,
    },
    {
      chainId: 10143,
      name: "Monad Testnet",
      rpcUrl:
        process.env.MONAD_TESTNET_RPC_URL ||
        monadTestnet.rpcUrls.default.http[0] ||
        "https://testnet.monad.xyz/rpc",
      wsRpcUrl: process.env.MONAD_TESTNET_WS_URL,
      contractAddress: "0xf0111ede031a4377c34a4ad900f1e633e41055dc",
      deploymentBlock: 33387114n,
      batchSize: 1000,
    },
  ],
};

/**
 * Get chain configurations for a specific network
 */
export function getChainsForNetwork(network: NetworkName): ChainConfig[] {
  return CHAIN_CONFIGS[network];
}

/**
 * Get a specific chain configuration
 */
export function getChainConfig(
  network: NetworkName,
  chainId: number
): ChainConfig | undefined {
  return CHAIN_CONFIGS[network].find((chain) => chain.chainId === chainId);
}

/**
 * Event signatures for eth_getLogs
 * These are keccak256 hashes of the event signatures
 */
export const EVENT_SIGNATURES = {
  // Fill(bytes32 indexed requestHash, address from, address solver)
  FILL: "0x826812ae21abb45b54e584613b09ca3aedfa82eae504de6849b5aa1213a69885" as const,

  // Deposit(bytes32 indexed requestHash, address from, bool gasRefunded)
  DEPOSIT:
    "0xfeacca5bf3a19770c567bea5fc048a2c973d0cea3b34cc494bb78139ddc76592" as const,
};
