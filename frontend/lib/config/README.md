# Configuration Files

This directory contains configuration files for the frontend to display human-readable names instead of IDs and addresses.

## Chain Configuration (`chains.ts`)

The chain configuration maps chain IDs to human-readable chain names. You can add new chains by adding entries to the `CHAIN_CONFIGS` object.

### Example:

```typescript
export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  1: {
    id: 1,
    name: "Ethereum",
    shortName: "ETH",
    explorerUrl: "https://etherscan.io",
  },
  // Add your custom chains here
  999: {
    id: 999,
    name: "My Custom Chain",
    shortName: "MCC",
    explorerUrl: "https://explorer.my-custom-chain.com",
  },
};
```

## Token Configuration (`tokens.ts`)

The token configuration maps token addresses to human-readable names and decimal information. You can add new tokens by adding entries to the `TOKEN_CONFIGS` object.

### Example:

```typescript
export const TOKEN_CONFIGS: Record<string, TokenConfig> = {
  "0x0000000000000000000000000000000000000000": {
    address: "0x0000000000000000000000000000000000000000",
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
    coingeckoId: "ethereum",
  },
  // Add your custom tokens here
  "0x1234567890123456789012345678901234567890": {
    address: "0x1234567890123456789012345678901234567890",
    name: "My Custom Token",
    symbol: "MCT",
    decimals: 6,
    coingeckoId: "my-custom-token",
  },
};
```

## Usage

The configuration files are automatically imported and used by the formatters. The frontend will:

1. **Chain IDs**: Display chain names instead of numeric IDs (e.g., "Ethereum" instead of "1")
2. **Token Addresses**: Display token names and symbols instead of addresses (e.g., "USDC (USDC)" instead of "0xa0b86a33e6c0c0c0c0c0c0c0c0c0c0c0c0c0c0c0")
3. **Token Values**: Format values with proper decimal places based on the token's decimal configuration

## Adding New Configurations

To add new chains or tokens:

1. Open the appropriate configuration file (`chains.ts` or `tokens.ts`)
2. Add your new configuration to the respective object
3. The changes will be automatically reflected in the frontend

## Notes

- Token addresses are case-insensitive and will be normalized automatically
- If a chain ID or token address is not found in the configuration, it will fall back to displaying the original ID/address
- The configuration supports optional fields like `explorerUrl`, `logoUrl`, and `coingeckoId` for enhanced functionality
