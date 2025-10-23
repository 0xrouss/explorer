import { ArcanaClient, NetworkName } from "./client";

const networks = ["CORAL", "FOLLY", "CERISE"];

const NETWORK = process.env.NETWORK || "CORAL";

const client = new ArcanaClient(NETWORK as NetworkName);

// Query cosmos transactions and extract intent IDs
const cosmosTransactions = await client["queryCosmosTransactions"](1500);

// Extract intent IDs from transactions
const intentIds = new Set<number>();

if (cosmosTransactions.result?.txs) {
  for (const tx of cosmosTransactions.result.txs) {
    try {
      const messages = client["decodeDoubleCheckTx"](tx.tx);

      for (const msg of messages) {
        if (msg.packet?.$case === "fillPacket" && msg.packet.value?.id) {
          intentIds.add(Number(msg.packet.value.id));
          if (Number(msg.packet.value.id) === 1439) {
            console.log("fillPacket", JSON.stringify(msg, null, 2));
          }
        }
        if (msg.packet?.$case === "depositPacket" && msg.packet.value?.id) {
          intentIds.add(Number(msg.packet.value.id));
          if (Number(msg.packet.value.id) === 1439) {
            console.log("depositPacket", JSON.stringify(msg, null, 2));
          }
        }
      }
    } catch (error) {
      // Skip failed transactions
    }
  }
}

console.log("Intent IDs found:");
console.log(Array.from(intentIds).sort((a, b) => a - b));
