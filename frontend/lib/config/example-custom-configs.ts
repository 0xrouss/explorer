/**
 * Example custom configurations
 * Copy these to the main config files to add your own chains and tokens
 */

// Example custom chain configurations
export const EXAMPLE_CUSTOM_CHAINS = {
  999: {
    id: 999,
    name: "My Custom Chain",
    shortName: "MCC",
    explorerUrl: "https://explorer.my-custom-chain.com",
  },
  888: {
    id: 888,
    name: "Test Network",
    shortName: "TEST",
    explorerUrl: "https://testnet-explorer.example.com",
  },
};

// Example custom token configurations
export const EXAMPLE_CUSTOM_TOKENS = {
  "0x1234567890123456789012345678901234567890": {
    address: "0x1234567890123456789012345678901234567890",
    name: "My Custom Token",
    symbol: "MCT",
    decimals: 6,
    logoUrl: "https://example.com/logo.png",
    coingeckoId: "my-custom-token",
  },
  "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd": {
    address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    name: "Test Token",
    symbol: "TEST",
    decimals: 18,
  },
  // Example for a token with 8 decimals (like WBTC)
  "0x9876543210987654321098765432109876543210": {
    address: "0x9876543210987654321098765432109876543210",
    name: "My Bitcoin Token",
    symbol: "MBTC",
    decimals: 8,
  },
};

/**
 * Instructions for adding custom configurations:
 *
 * 1. For chains:
 *    - Open `/lib/config/chains.ts`
 *    - Add your chain configurations to the `CHAIN_CONFIGS` object
 *    - Use the examples above as a template
 *
 * 2. For tokens:
 *    - Open `/lib/config/tokens.ts`
 *    - Add your token configurations to the `TOKEN_CONFIGS` object
 *    - Use the examples above as a template
 *
 * 3. Important notes:
 *    - Token addresses should be lowercase
 *    - Decimals determine how token values are formatted
 *    - Common decimal values: 18 (ETH, most ERC-20), 6 (USDC), 8 (WBTC)
 *    - The frontend will automatically use these configurations
 */
