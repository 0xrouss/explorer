import {
  QueryAllRequestForFundsRequest,
  QueryAllRequestForFundsResponse,
} from "../proto/definition.js";
import { MsgDoubleCheckTx } from "../proto/definition.js";
import { decodeTxRaw } from "@cosmjs/proto-signing";

// Network configurations
const NETWORKS = {
  CORAL: {
    name: "Coral (Testnet)",
    grpcUrl: "https://grpcproxy-testnet.arcana.network",
    cosmosUrl: "https://cosmos01-testnet.arcana.network:26650",
  },
  FOLLY: {
    name: "Folly (Dev)",
    grpcUrl: "https://grpc-folly.arcana.network",
    cosmosUrl: "https://cosmos04-dev.arcana.network:26650",
  },
} as const;

export type NetworkName = keyof typeof NETWORKS;

// Types
export interface Intent {
  id: number;
  user: string;
  expiry: number;
  creationBlock: number;
  destinationChainID: number;
  destinationUniverse: number;
  nonce: string;
  deposited: boolean;
  fulfilled: boolean;
  refunded: boolean;
  fulfilledBy: string | null;
  fulfilledAt: number;
  sources: Array<{
    universe: number;
    chainID: number;
    tokenAddress: string;
    value: string;
    status: number;
    collectionFeeRequired: number;
  }>;
  destinations: Array<{
    tokenAddress: string;
    value: string;
  }>;
  signatureData: Array<{
    universe: number;
    address: string;
    signature: string;
    hash: string;
  }>;
}

export interface FillTransaction {
  cosmosHash: string;
  height: string;
  intentId: number;
  fillerAddress: string;
  evmTxHash: string;
  chainID: string;
  universe: number;
}

export interface DepositTransaction {
  cosmosHash: string;
  height: string;
  intentId: number;
  chainID: string;
  universe: number;
  gasRefunded: boolean;
}

// Formatting helpers
const toHex = (bytes: Uint8Array) => "0x" + Buffer.from(bytes).toString("hex");
const toNumber = (long: any) => Number(long.toString());
const toBigInt = (bytes: Uint8Array) => BigInt(toHex(bytes));
const bytesToNumber = (bytes: Uint8Array): number => {
  if (!bytes || bytes.length === 0) return 0;
  return Number(toBigInt(bytes));
};

const cleanAddress = (hex: string): string => {
  if (!hex || hex === "0x") return "0x0000000000000000000000000000000000000000";
  const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (cleaned.length > 40) {
    const address = cleaned.slice(-40);
    if (address === "0".repeat(40)) {
      return "0x0000000000000000000000000000000000000000";
    }
    return "0x" + address;
  }
  if (cleaned === "0".repeat(cleaned.length)) {
    return "0x0000000000000000000000000000000000000000";
  }
  return "0x" + cleaned;
};

export class ArcanaClient {
  private network: NetworkName;
  private grpcUrl: string;
  private cosmosUrl: string;

  constructor(network: NetworkName = "CORAL") {
    this.network = network;
    const config = NETWORKS[network];
    this.grpcUrl = config.grpcUrl;
    this.cosmosUrl = config.cosmosUrl;
  }

  /**
   * Query intents from the Arcana network
   */
  async queryIntents(
    limit: number = 10,
    offset: number = 0
  ): Promise<Intent[]> {
    const url = `${this.grpcUrl}/xarchain.chainabstraction.Query/RequestForFundsAll`;

    // Create and encode request
    const request = QueryAllRequestForFundsRequest.fromPartial({
      pagination: { limit, offset, reverse: true },
    });
    const requestBytes =
      QueryAllRequestForFundsRequest.encode(request).finish();

    // Frame request for grpc-web
    const frameLength = new Uint8Array(4);
    new DataView(frameLength.buffer).setUint32(0, requestBytes.length, false);
    const framedRequest = new Uint8Array([
      0x00,
      ...frameLength,
      ...requestBytes,
    ]);

    // Make HTTP call
    const response = await Bun.fetch(url, {
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
    const decoded = QueryAllRequestForFundsResponse.decode(data);

    // Format intents
    return this.formatIntents(decoded);
  }

  /**
   * Query a single intent by ID
   * Searches through batches of intents until found
   */
  async queryIntent(intentId: number): Promise<Intent | null> {
    const batchSize = 1000;
    let offset = 0;
    const maxAttempts = 20; // Search up to 20000 intents (20 * 1000)

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const intents = await this.queryIntents(batchSize, offset);

      if (intents.length === 0) {
        // No more intents to search
        return null;
      }

      // Check if we found the intent
      const found = intents.find((i) => i.id === intentId);
      if (found) {
        return found;
      }

      // Since intents are in reverse order (newest first),
      // if the last intent in this batch has a higher ID than we're looking for,
      // the intent doesn't exist
      const lastIntent = intents[intents.length - 1];
      if (lastIntent && lastIntent.id < intentId) {
        // We've passed the ID we're looking for
        return null;
      }

      offset += batchSize;
    }

    return null;
  }

  /**
   * Query fill transactions from Cosmos chain
   */
  async queryFills(
    intentId?: number,
    limit: number = 10000
  ): Promise<FillTransaction[]> {
    const result = await this.queryCosmosTransactions(limit);

    if (!result.result?.txs) {
      return [];
    }

    const fills: FillTransaction[] = [];

    for (const tx of result.result.txs) {
      try {
        const messages = this.decodeDoubleCheckTx(tx.tx);

        for (const msg of messages) {
          if (msg.packet?.$case === "fillPacket" && msg.packet.value) {
            const packetIntentId = Number(msg.packet.value.id || 0);

            // Filter by intent ID if provided
            if (intentId !== undefined && packetIntentId !== intentId) {
              continue;
            }

            fills.push({
              cosmosHash: tx.hash,
              height: tx.height,
              intentId: packetIntentId,
              fillerAddress: msg.packet.value.fillerAddress
                ? cleanAddress(toHex(msg.packet.value.fillerAddress))
                : "",
              evmTxHash: msg.packet.value.transactionHash
                ? toHex(msg.packet.value.transactionHash)
                : "",
              chainID: bytesToNumber(msg.txChainID).toString(),
              universe: msg.txUniverse,
            });
          }
        }
      } catch (error) {
        // Skip failed transactions
      }
    }

    return fills;
  }

  /**
   * Query deposit transactions from Cosmos chain
   */
  async queryDeposits(
    intentId?: number,
    limit: number = 10000
  ): Promise<DepositTransaction[]> {
    const result = await this.queryCosmosTransactions(limit);

    if (!result.result?.txs) {
      return [];
    }

    const deposits: DepositTransaction[] = [];

    for (const tx of result.result.txs) {
      try {
        const messages = this.decodeDoubleCheckTx(tx.tx);

        for (const msg of messages) {
          if (msg.packet?.$case === "depositPacket" && msg.packet.value) {
            const packetIntentId = Number(msg.packet.value.id || 0);

            // Filter by intent ID if provided
            if (intentId !== undefined && packetIntentId !== intentId) {
              continue;
            }

            deposits.push({
              cosmosHash: tx.hash,
              height: tx.height,
              intentId: packetIntentId,
              chainID: bytesToNumber(msg.txChainID).toString(),
              universe: msg.txUniverse,
              gasRefunded: msg.packet.value.gasRefunded || false,
            });
          }
        }
      } catch (error) {
        // Skip failed transactions
      }
    }

    return deposits;
  }

  /**
   * Query all transactions (fills and deposits) for an intent
   */
  async queryIntentTransactions(intentId: number) {
    const [fills, deposits] = await Promise.all([
      this.queryFills(intentId),
      this.queryDeposits(intentId),
    ]);

    return {
      fills,
      deposits,
    };
  }

  // Private helper methods

  private async queryCosmosTransactions(limit: number = 10000) {
    const rpcUrl = `${this.cosmosUrl}/`;
    const allTxs: any[] = [];
    let page = 1;
    let hasMore = true;
    const perPage = Math.min(limit, 100); // Use smaller page size for better performance

    while (hasMore && allTxs.length < limit) {
      const body = {
        jsonrpc: "2.0",
        id: 1,
        method: "tx_search",
        params: {
          query: "message.action='/xarchain.chainabstraction.MsgDoubleCheckTx'",
          prove: false,
          page: page.toString(),
          per_page: perPage.toString(),
          order_by: "desc",
        },
      };

      const response = await Bun.fetch(rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (
        !(result as any)?.result?.txs ||
        (result as any)?.result?.txs?.length === 0
      ) {
        hasMore = false;
        break;
      }

      allTxs.push(...(result as any)?.result?.txs);

      // Check if we've reached the total count or got fewer results than requested
      if ((result as any)?.result?.txs?.length < perPage) {
        hasMore = false;
      }

      page++;

      // Safety check to prevent infinite loops
      if (page > 1000) {
        console.warn("Reached maximum page limit (1000), stopping pagination");
        break;
      }
    }

    return {
      result: {
        txs: allTxs.slice(0, limit), // Ensure we don't exceed the requested limit
      },
    };
  }

  private decodeDoubleCheckTx(txBase64: string): any[] {
    try {
      const txBytes = Buffer.from(txBase64, "base64");
      const decodedTx = decodeTxRaw(txBytes);
      const messages: any[] = [];

      for (const msg of decodedTx.body.messages) {
        if (msg.typeUrl === "/xarchain.chainabstraction.MsgDoubleCheckTx") {
          const doubleCheckMsg = MsgDoubleCheckTx.decode(msg.value);
          messages.push(doubleCheckMsg);
        }
      }

      return messages;
    } catch (error) {
      return [];
    }
  }

  private formatIntents(response: any): Intent[] {
    if (!response.requestForFunds) return [];

    return response.requestForFunds.map((intent: any) => ({
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
    }));
  }

  // Getters
  getNetwork(): NetworkName {
    return this.network;
  }

  getGrpcUrl(): string {
    return this.grpcUrl;
  }

  getCosmosUrl(): string {
    return this.cosmosUrl;
  }
}
