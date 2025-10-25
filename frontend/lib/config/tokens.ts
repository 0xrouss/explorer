/**
 * Token configuration mapping token addresses to token names and decimals
 */

export interface TokenConfig {
  address: string;
  chainId: number;
  name: string;
  symbol: string;
  decimals: number;
  logoUrl?: string;
}

// Token configurations keyed by "chainId:address"
export const TOKEN_CONFIGS: Record<string, TokenConfig> = {
  // Sepolia Testnet Tokens
  "11155111:0x1c7d4b196cb0c7b01d743fbc6116a902379c7238": {
    address: "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
    chainId: 11155111,
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },

  "11155111:0x0000000000000000000000000000000000000000": {
    address: "0x0000000000000000000000000000000000000000",
    chainId: 11155111,
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },

  // Optimism Sepolia Testnet Tokens
  "11155420:0x5fd84259d66cd46123540766be93dfe6d43130d7": {
    address: "0x5fd84259d66cd46123540766be93dfe6d43130d7",
    chainId: 11155420,
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },

  "11155420:0x6462693c2f21ac0e517f12641d404895030f7426": {
    address: "0x6462693c2f21ac0e517f12641d404895030f7426",
    chainId: 11155420,
    name: "USDT",
    symbol: "USDT",
    decimals: 18,
  },

  "11155420:0x0000000000000000000000000000000000000000": {
    address: "0x0000000000000000000000000000000000000000",
    chainId: 11155420,
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },

  // Arbitrum Sepolia Testnet Tokens
  "421614:0xf954d4a5859b37de88a91bdbb8ad309056fb04b1": {
    address: "0xf954d4a5859b37de88a91bdbb8ad309056fb04b1",
    chainId: 421614,
    name: "USDT",
    symbol: "USDT",
    decimals: 18,
  },

  "421614:0x0000000000000000000000000000000000000000": {
    address: "0x0000000000000000000000000000000000000000",
    chainId: 421614,
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },

  "421614:0x75faf114eafb1bdbe2f0316df893fd58ce46aa4d": {
    address: "0x75faf114eafb1bdbe2f0316df893fd58ce46aa4d",
    chainId: 421614,
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },

  // Base Sepolia Testnet Tokens
  "84532:0x0000000000000000000000000000000000000000": {
    address: "0x0000000000000000000000000000000000000000",
    chainId: 84532,
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },

  "84532:0x036cbd53842c5426634e7929541ec2318f3dcf7e": {
    address: "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
    chainId: 84532,
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },

  // Polygon Amoy Testnet Tokens
  "80002:0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582": {
    address: "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582",
    chainId: 80002,
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },

  // Monad Testnet Tokens
  "10143:0xf817257fed379853cde0fa4f97ab987181b1e5ea": {
    address: "0xf817257fed379853cde0fa4f97ab987181b1e5ea",
    chainId: 10143,
    name: "USDC",
    symbol: "USDC",
    decimals: 6,
  },
};

/**
 * Normalize token address for lookup (lowercase, remove 0x prefix if needed)
 */
function normalizeAddress(address: string): string {
  if (!address) return "";
  const normalized = address.toLowerCase();
  return normalized.startsWith("0x") ? normalized : `0x${normalized}`;
}

/**
 * Create a composite key for token lookup (chainId:address)
 */
function createTokenKey(chainId: number, tokenAddress: string): string {
  const normalized = normalizeAddress(tokenAddress);
  return `${chainId}:${normalized}`;
}

/**
 * Get token configuration by chain ID and token address
 */
export function getTokenConfig(
  chainId: number,
  tokenAddress: string
): TokenConfig | null {
  const key = createTokenKey(chainId, tokenAddress);
  return TOKEN_CONFIGS[key] || null;
}

/**
 * Get token name by chain ID and token address
 */
export function getTokenName(chainId: number, tokenAddress: string): string {
  const config = getTokenConfig(chainId, tokenAddress);
  return config?.name || formatAddress(tokenAddress);
}

/**
 * Get token symbol by chain ID and token address
 */
export function getTokenSymbol(chainId: number, tokenAddress: string): string {
  const config = getTokenConfig(chainId, tokenAddress);
  return config?.symbol || "UNKNOWN";
}

/**
 * Get token decimals by chain ID and token address
 */
export function getTokenDecimals(
  chainId: number,
  tokenAddress: string
): number {
  const config = getTokenConfig(chainId, tokenAddress);
  return config?.decimals || 18; // Default to 18 decimals
}

/**
 * Format token address for display (truncated)
 */
function formatAddress(
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (!address || typeof address !== "string") {
    return "0x0000000000000000000000000000000000000000";
  }

  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format token value with proper decimals
 */
export function formatTokenValueWithDecimals(
  value: string | number,
  chainId: number,
  tokenAddress: string
): string {
  const decimals = getTokenDecimals(chainId, tokenAddress);
  const num = typeof value === "string" ? parseFloat(value) : value;

  // Always convert from wei/smallest unit to token units
  const converted = num / Math.pow(10, decimals);

  // Use toFixed with enough precision to handle very small numbers
  // Use a high precision (18) to ensure we capture all significant digits
  let result = converted.toFixed(18);

  // Remove trailing zeros but preserve significant digits
  result = result.replace(/\.?0+$/, "");

  // If the result is just a dot, return "0"
  if (result === "." || result === "") {
    return "0";
  }

  return result;
}

/**
 * Get token display name (name + symbol)
 */
export function getTokenDisplayName(
  chainId: number,
  tokenAddress: string
): string {
  const config = getTokenConfig(chainId, tokenAddress);
  if (config) {
    return `${config.name} (${config.symbol})`;
  }
  return formatAddress(tokenAddress);
}
