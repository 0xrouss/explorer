/**
 * Chain configuration mapping chain IDs to chain names
 */

export interface ChainConfig {
  id: number;
  name: string;
  shortName?: string;
  explorerUrl?: string;
  rpcUrl?: string;
}

export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  // Ethereum Sepolia Testnet
  11155111: {
    id: 11155111,
    name: "Ethereum Sepolia",
    shortName: "Sepolia",
    explorerUrl: "https://sepolia.etherscan.io",
  },

  // Polygon Mumbai Testnet
  80002: {
    id: 80002,
    name: "Polygon Amoy",
    shortName: "Amoy",
    explorerUrl: "https://amoy.polygonscan.com",
  },

  // Arbitrum Sepolia
  421614: {
    id: 421614,
    name: "Arbitrum Sepolia",
    shortName: "ARB Sepolia",
    explorerUrl: "https://sepolia.arbiscan.io",
  },

  // Optimism Sepolia
  11155420: {
    id: 11155420,
    name: "Optimism Sepolia",
    shortName: "OP Sepolia",
    explorerUrl: "https://sepolia-optimism.etherscan.io",
  },

  // Base Sepolia
  84532: {
    id: 84532,
    name: "Base Sepolia",
    shortName: "Base Sepolia",
    explorerUrl: "https://sepolia.basescan.org",
  },

  // Monad Testnet
  10143: {
    id: 10143,
    name: "Monad Testnet",
    shortName: "Monad Testnet",
    explorerUrl: "https://monad-testnet.socialscan.io/",
  },
};

/**
 * Get chain configuration by chain ID
 */
export function getChainConfig(chainId: number): ChainConfig | null {
  return CHAIN_CONFIGS[chainId] || null;
}

/**
 * Get chain name by chain ID
 */
export function getChainName(chainId: number): string {
  const config = getChainConfig(chainId);
  return config?.name || `Chain ${chainId}`;
}

/**
 * Get chain short name by chain ID
 */
export function getChainShortName(chainId: number): string {
  const config = getChainConfig(chainId);
  return config?.shortName || config?.name || `Chain ${chainId}`;
}

/**
 * Get explorer URL for a chain
 */
export function getChainExplorerUrl(chainId: number): string | null {
  const config = getChainConfig(chainId);
  return config?.explorerUrl || null;
}
