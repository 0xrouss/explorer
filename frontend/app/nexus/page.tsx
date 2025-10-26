"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import {
  BridgeButton,
  TransferButton,
  BridgeAndExecuteButton,
  useNexus,
  TOKEN_CONTRACT_ADDRESSES,
  TOKEN_METADATA,
} from "@avail-project/nexus-widgets";
import { parseUnits } from "viem";
import { Header } from "@/components/Header";

// Component to bridge the user's wallet provider
function WalletBridge() {
  const { connector, isConnected } = useAccount();
  const { setProvider } = useNexus();

  useEffect(() => {
    if (isConnected && connector?.getProvider) {
      connector.getProvider().then((provider) => {
        setProvider(provider as any);
      });
    }
  }, [isConnected, connector, setProvider]);

  return null;
}

export default function NexusPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Wallet bridge component */}
      <WalletBridge />

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-text-primary mb-2">
            Nexus Cross-Chain Widgets
          </h2>
          <p className="text-text-secondary">
            Interactive widgets for cross-chain transactions, bridging, and DeFi
            interactions
          </p>
        </div>

        {/* Widget Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bridge Button Widget */}
          <div className="bg-card-bg border border-card-border shadow-lg rounded-lg overflow-hidden">
            <div className="px-6 py-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-text-primary">
                  Bridge Tokens
                </h3>
                <div className="h-1 w-12 bg-gradient-to-r from-accent-blue to-accent-purple rounded-full"></div>
              </div>
              <p className="text-sm text-text-secondary mb-6">
                Bridge USDC from any chain to Sepolia. The amount and
                destination chain are pre-filled and locked.
              </p>
              <BridgeButton
                prefill={{ chainId: 11155111, token: "USDC", amount: "1" }}
              >
                {({ onClick, isLoading }) => (
                  <button
                    onClick={onClick}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-accent-blue to-blue-600 hover:from-accent-blue hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    {isLoading ? "Bridging…" : "Bridge 1 USDC → Sepolia"}
                  </button>
                )}
              </BridgeButton>
            </div>
          </div>

          {/* Transfer Button Widget */}
          <div className="bg-card-bg border border-card-border shadow-lg rounded-lg overflow-hidden">
            <div className="px-6 py-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-text-primary">
                  Transfer Tokens
                </h3>
                <div className="h-1 w-12 bg-gradient-to-r from-accent-green to-green-600 rounded-full"></div>
              </div>
              <p className="text-sm text-text-secondary mb-6">
                Send USDC to any address. Automatically optimizes for direct
                transfer when possible.
              </p>
              <TransferButton
                prefill={{
                  chainId: 42161,
                  token: "USDC",
                  amount: "50",
                  recipient:
                    "0x742d35Cc6634C0532925a3b8D4C9db96c4b4Db45" as `0x${string}`,
                }}
              >
                {({ onClick, isLoading }) => (
                  <button
                    onClick={onClick}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-accent-green to-green-600 hover:from-accent-green hover:to-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    {isLoading ? "Transferring…" : "Transfer 50 USDC"}
                  </button>
                )}
              </TransferButton>
            </div>
          </div>

          {/* Bridge and Execute Widget - Aave Supply */}
          <div className="bg-card-bg border border-card-border shadow-lg rounded-lg overflow-hidden lg:col-span-2">
            <div className="px-6 py-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-text-primary">
                  Bridge & Execute - Aave Supply
                </h3>
                <div className="h-1 w-12 bg-gradient-to-r from-accent-purple to-purple-600 rounded-full"></div>
              </div>
              <p className="text-sm text-text-secondary mb-6">
                Bridge USDT and automatically supply it to Aave on the
                destination chain in a single transaction.
              </p>
              <BridgeAndExecuteButton
                contractAddress={
                  "0x794a61358D6845594F94dc1DB02A252b5b4814aD" as `0x${string}`
                }
                contractAbi={
                  [
                    {
                      name: "supply",
                      type: "function",
                      stateMutability: "nonpayable",
                      inputs: [
                        { name: "asset", type: "address" },
                        { name: "amount", type: "uint256" },
                        { name: "onBehalfOf", type: "address" },
                        { name: "referralCode", type: "uint16" },
                      ],
                      outputs: [],
                    },
                  ] as const
                }
                functionName="supply"
                buildFunctionParams={(token, amount, chainId, user) => {
                  const decimals = TOKEN_METADATA[token].decimals;
                  const amountWei = parseUnits(amount, decimals);
                  const tokenAddr =
                    TOKEN_CONTRACT_ADDRESSES[token][
                      chainId as keyof (typeof TOKEN_CONTRACT_ADDRESSES)[typeof token]
                    ];
                  return {
                    functionParams: [tokenAddr, amountWei, user, 0],
                  };
                }}
                prefill={{
                  toChainId: 42161,
                  token: "USDT",
                }}
              >
                {({ onClick, isLoading, disabled }) => (
                  <button
                    onClick={onClick}
                    disabled={isLoading || disabled}
                    className="w-full bg-gradient-to-r from-accent-purple to-purple-600 hover:from-accent-purple hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    {isLoading
                      ? "Processing…"
                      : disabled
                      ? "Connect Wallet"
                      : "Bridge & Supply to Aave"}
                  </button>
                )}
              </BridgeAndExecuteButton>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-card-bg border border-card-border shadow-lg rounded-lg overflow-hidden lg:col-span-2">
            <div className="px-6 py-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-text-primary">
                  About Nexus Widgets
                </h3>
                <div className="h-1 w-12 bg-gradient-to-r from-accent-yellow to-yellow-600 rounded-full"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-text-primary mb-2">
                    🔗 Bridge Button
                  </h4>
                  <p className="text-sm text-text-secondary">
                    Bridge tokens between different chains with pre-filled
                    parameters that are locked to ensure the correct flow.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary mb-2">
                    💸 Transfer Button
                  </h4>
                  <p className="text-sm text-text-secondary">
                    Send tokens to any address with automatic optimization for
                    direct transfers when possible.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary mb-2">
                    🔄 Bridge & Execute
                  </h4>
                  <p className="text-sm text-text-secondary">
                    Combine bridging with smart contract execution for seamless
                    cross-chain DeFi interactions.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-text-primary mb-2">
                    🛡️ Secure & Reliable
                  </h4>
                  <p className="text-sm text-text-secondary">
                    All widgets include built-in error handling, loading states,
                    and transaction simulations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
