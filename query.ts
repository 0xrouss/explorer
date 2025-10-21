#!/usr/bin/env tsx

import fetch from "node-fetch";
import {
  QueryAllRequestForFundsRequest,
  QueryAllRequestForFundsResponse,
} from "./proto/definition.js";

// Network configurations
const NETWORKS = {
  CORAL: {
    name: "Coral (Testnet)",
    url: "https://grpcproxy-testnet.arcana.network",
  },
  FOLLY: {
    name: "Folly (Dev)",
    url: "https://grpc-folly.arcana.network",
  },
  CERISE: {
    name: "Cerise (Mainnet)",
    url: "https://mimosa-dash-grpc.arcana.network",
  },
} as const;

type NetworkName = keyof typeof NETWORKS;

// Formatting helpers
const toHex = (bytes: Uint8Array) => "0x" + Buffer.from(bytes).toString("hex");
const toNumber = (long: any) => Number(long.toString());
const toBigInt = (bytes: Uint8Array) => BigInt(toHex(bytes));
const bytesToNumber = (bytes: Uint8Array): number => {
  if (!bytes || bytes.length === 0) return 0;
  return Number(toBigInt(bytes));
};

// Clean address: remove leading zeros, keep last 20 bytes for EVM addresses
const cleanAddress = (hex: string): string => {
  if (!hex || hex === "0x") return "0x0000000000000000000000000000000000000000";

  // Remove 0x prefix
  const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;

  // If it's longer than 40 chars (20 bytes), take the last 40 chars
  if (cleaned.length > 40) {
    const address = cleaned.slice(-40);
    // If it's all zeros, return null or zero address
    if (address === "0".repeat(40)) {
      return "0x0000000000000000000000000000000000000000";
    }
    return "0x" + address;
  }

  // If it's all zeros, return zero address
  if (cleaned === "0".repeat(cleaned.length)) {
    return "0x0000000000000000000000000000000000000000";
  }

  return "0x" + cleaned;
};

// Format the response for readability
function formatResponse(response: any) {
  if (!response.requestForFunds) return response;

  return {
    ...response,
    requestForFunds: response.requestForFunds.map((intent: any) => ({
      id: toNumber(intent.id),
      user: intent.user,
      expiry: toNumber(intent.expiry),
      creationBlock: toNumber(intent.creationBlock),
      destinationChainID: bytesToNumber(intent.destinationChainID),
      destinationUniverse: intent.destinationUniverse,
      nonce: toHex(intent.nonce),
      deposited: intent.deposited,
      fulfilled: intent.fulfilled,
      refunded: intent.refunded,
      fulfilledBy: intent.fulfilledBy
        ? cleanAddress(toHex(intent.fulfilledBy))
        : null,
      fulfilledAt: toNumber(intent.fulfilledAt),
      sources: intent.sources.map((s: any) => ({
        universe: s.universe,
        chainID: bytesToNumber(s.chainID),
        tokenAddress: cleanAddress(toHex(s.tokenAddress)),
        value: toBigInt(s.value).toString(),
        status: s.status,
        collectionFeeRequired: s.collectionFeeRequired,
      })),
      destinations: intent.destinations.map((d: any) => ({
        tokenAddress: cleanAddress(toHex(d.tokenAddress)),
        value: toBigInt(d.value).toString(),
      })),
      signatureData: intent.signatureData.map((sig: any) => ({
        universe: sig.universe,
        address: cleanAddress(toHex(sig.address)),
        signature: toHex(sig.signature),
        hash: toHex(sig.hash),
      })),
    })),
    pagination: response.pagination
      ? {
          nextKey: toHex(response.pagination.nextKey),
          total: toNumber(response.pagination.total),
        }
      : null,
  };
}

async function queryIntents(network: NetworkName, limit: number) {
  const config = NETWORKS[network];
  const url = `${config.url}/xarchain.chainabstraction.Query/RequestForFundsAll`;

  // Create and encode request
  const request = QueryAllRequestForFundsRequest.fromPartial({
    pagination: { limit, offset: 0, reverse: true },
  });
  const requestBytes = QueryAllRequestForFundsRequest.encode(request).finish();

  // Frame request for grpc-web
  const frameLength = new Uint8Array(4);
  new DataView(frameLength.buffer).setUint32(0, requestBytes.length, false);
  const framedRequest = new Uint8Array([0x00, ...frameLength, ...requestBytes]);

  // Make HTTP call
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/grpc-web+proto",
      "X-Grpc-Web": "1",
    },
    body: framedRequest,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  // Decode response (skip 5-byte grpc-web header)
  const buffer = await response.arrayBuffer();
  const data = new Uint8Array(buffer).slice(5);
  return QueryAllRequestForFundsResponse.decode(data);
}

async function main() {
  const network: NetworkName = "CORAL";
  const limit = 1;

  console.log("🔍 Querying Arcana Intents\n");
  console.log(`Network: ${NETWORKS[network].name}`);
  console.log(`Limit: ${limit}\n`);

  try {
    const response = await queryIntents(network, limit);
    const formatted = formatResponse(response);

    console.log("Response:");
    console.log(JSON.stringify(formatted, null, 2));

    console.log("\n✅ Query completed");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
