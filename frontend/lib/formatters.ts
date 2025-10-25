import type { NetworkType } from "@/types";
import { getChainName, getChainShortName } from "@/lib/config/chains";
import {
  getTokenName,
  getTokenSymbol,
  getTokenDecimals,
  formatTokenValueWithDecimals,
  getTokenDisplayName,
} from "@/lib/config/tokens";

/**
 * Format a timestamp to a readable date string
 */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

/**
 * Format a timestamp to a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  } else {
    return formatDate(d);
  }
}

/**
 * Format a large number with appropriate units (K, M, B)
 */
export function formatNumber(num: number | string): string {
  const n = typeof num === "string" ? parseFloat(num) : num;

  if (n >= 1e9) {
    return (n / 1e9).toFixed(1) + "B";
  } else if (n >= 1e6) {
    return (n / 1e6).toFixed(1) + "M";
  } else if (n >= 1e3) {
    return (n / 1e3).toFixed(1) + "K";
  }

  return n.toString();
}

/**
 * Format an address by truncating the middle part
 */
export function formatAddress(
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format a token value with appropriate decimal places
 */
export function formatTokenValue(
  value: string | number,
  decimals: number = 18
): string {
  const num = typeof value === "string" ? parseFloat(value) : value;

  // Handle very large numbers by converting from wei
  if (num >= 1e18) {
    const formatted = (num / Math.pow(10, decimals)).toFixed(6);
    // Remove trailing zeros
    return parseFloat(formatted).toString();
  }

  return num.toFixed(6);
}

/**
 * Format a token value with smart decimal precision
 */
export function formatTokenValueSmart(
  value: string | number,
  chainId?: number,
  tokenAddress?: string
): string {
  const num = typeof value === "string" ? parseFloat(value) : value;

  if (num === 0) return "0";

  // Get token decimals from configuration
  let decimals = 18; // Default fallback
  if (chainId && tokenAddress) {
    try {
      decimals = getTokenDecimals(chainId, tokenAddress);
    } catch {
      decimals = 18;
    }
  }

  // Always convert from smallest unit (wei/smallest unit) to token units
  // The value is likely in the smallest unit, so we need to divide by 10^decimals
  const actualValue = num / Math.pow(10, decimals);

  // For very small numbers, use scientific notation
  if (actualValue < 0.000001 && actualValue > 0) {
    return actualValue.toExponential(2);
  }

  // For normal numbers, use appropriate precision
  if (actualValue >= 1000) {
    return actualValue.toFixed(2);
  } else if (actualValue >= 1) {
    return actualValue.toFixed(4);
  } else if (actualValue >= 0.01) {
    return actualValue.toFixed(6);
  } else {
    return actualValue.toFixed(8);
  }
}

/**
 * Format a block number or timestamp to human readable format
 */
export function formatBlockOrTimestamp(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;

  // If it's a very large number, it's likely a block number
  if (num > 1000000000) {
    return formatNumber(num);
  }

  // If it's a reasonable timestamp, format as date
  if (num > 1000000000 && num < 2000000000) {
    return formatDate(new Date(num * 1000));
  }

  return num.toString();
}

/**
 * Format expiry time with relative time
 */
export function formatExpiryTime(expiry: string | number): string {
  const num = typeof expiry === "string" ? parseFloat(expiry) : expiry;
  const now = Date.now() / 1000;
  const expiryTime = num;

  if (expiryTime <= now) {
    return "Expired";
  }

  const diffInSeconds = expiryTime - now;
  const diffInDays = Math.floor(diffInSeconds / 86400);
  const diffInHours = Math.floor((diffInSeconds % 86400) / 3600);

  if (diffInDays > 0) {
    return `Expires in ${diffInDays} day${diffInDays > 1 ? "s" : ""}`;
  } else if (diffInHours > 0) {
    return `Expires in ${diffInHours} hour${diffInHours > 1 ? "s" : ""}`;
  } else {
    const diffInMinutes = Math.floor((diffInSeconds % 3600) / 60);
    return `Expires in ${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""}`;
  }
}

/**
 * Format a token value with proper decimals based on token address
 */
export function formatTokenValueByAddress(
  value: string | number,
  chainId: number,
  tokenAddress: string
): string {
  return formatTokenValueWithDecimals(value, chainId, tokenAddress);
}

/**
 * Format a chain ID to show chain name
 */
export function formatChainId(chainId: number): string {
  return getChainName(chainId);
}

/**
 * Format a chain ID to show short chain name
 */
export function formatChainIdShort(chainId: number): string {
  return getChainShortName(chainId);
}

/**
 * Format a token address to show token name
 */
export function formatTokenAddress(
  chainId: number,
  tokenAddress: string
): string {
  return getTokenName(chainId, tokenAddress);
}

/**
 * Format a token address to show token display name (name + symbol)
 */
export function formatTokenAddressDisplay(
  chainId: number,
  tokenAddress: string
): string {
  return getTokenDisplayName(chainId, tokenAddress);
}

/**
 * Format a block number
 */
export function formatBlockNumber(blockNumber: number | string): string {
  const num =
    typeof blockNumber === "string" ? parseInt(blockNumber) : blockNumber;
  return num.toLocaleString();
}

/**
 * Format a transaction hash for display
 */
export function formatTxHash(
  hash: string,
  startChars: number = 8,
  endChars: number = 6
): string {
  if (hash.length <= startChars + endChars) {
    return hash;
  }
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

/**
 * Get the network color for styling
 */
export function getNetworkColor(network: NetworkType): string {
  const colors = {
    CORAL: "#FF6B6B",
    FOLLY: "#4ECDC4",
    CERISE: "#45B7D1",
    FULLY: "#9B59B6",
  };
  return colors[network];
}

/**
 * Validate if a string is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate if a string is a valid intent ID (numeric)
 */
export function isValidIntentId(id: string): boolean {
  return /^\d+$/.test(id);
}

/**
 * Determine if a search query is an intent ID or address
 */
export function getSearchType(
  query: string
): "intent_id" | "signature_address" | "unknown" {
  if (isValidIntentId(query)) {
    return "intent_id";
  } else if (isValidAddress(query)) {
    return "signature_address";
  }
  return "unknown";
}

/**
 * Format a signature hash for display
 */
export function formatSignatureHash(hash: string): string {
  return formatTxHash(hash, 8, 8);
}

/**
 * Get status display properties
 */
export function getStatusDisplay(status: string) {
  const statusMap = {
    pending: { label: "Pending", color: "yellow" },
    deposited: { label: "Deposited", color: "blue" },
    fulfilled: { label: "Fulfilled", color: "green" },
    refunded: { label: "Refunded", color: "red" },
  };

  return (
    statusMap[status as keyof typeof statusMap] || {
      label: status,
      color: "gray",
    }
  );
}

/**
 * Get chain explorer URL for a transaction hash
 */
export function getChainExplorerUrl(chainId: number, txHash: string): string {
  const explorerUrls: Record<number, string> = {
    // Ethereum Sepolia
    11155111: "https://sepolia.etherscan.io/tx/",
    // Optimism Sepolia
    11155420: "https://sepolia-optimism.etherscan.io/tx/",
    // Base Sepolia
    84532: "https://sepolia.basescan.org/tx/",
    // Polygon Mumbai
    80001: "https://mumbai.polygonscan.com/tx/",
    // Arbitrum Sepolia
    421614: "https://sepolia.arbiscan.io/tx/",
    // Avalanche Fuji
    43113: "https://testnet.snowtrace.io/tx/",
    // BSC Testnet
    97: "https://testnet.bscscan.com/tx/",
  };

  const baseUrl = explorerUrls[chainId];
  if (!baseUrl) {
    // Fallback to a generic explorer or return empty string
    return "";
  }

  return `${baseUrl}${txHash}`;
}

/**
 * Get chain explorer URL for an address
 */
export function getChainExplorerAddressUrl(
  chainId: number,
  address: string
): string {
  const explorerUrls: Record<number, string> = {
    // Ethereum Sepolia
    11155111: "https://sepolia.etherscan.io/address/",
    // Optimism Sepolia
    11155420: "https://sepolia-optimism.etherscan.io/address/",
    // Base Sepolia
    84532: "https://sepolia.basescan.org/address/",
    // Polygon Mumbai
    80001: "https://mumbai.polygonscan.com/address/",
    // Arbitrum Sepolia
    421614: "https://sepolia.arbiscan.io/address/",
    // Avalanche Fuji
    43113: "https://testnet.snowtrace.io/address/",
    // BSC Testnet
    97: "https://testnet.bscscan.com/address/",
  };

  const baseUrl = explorerUrls[chainId];
  if (!baseUrl) {
    return "";
  }

  return `${baseUrl}${address}`;
}
