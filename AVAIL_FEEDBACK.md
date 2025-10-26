1. Add contracts to the docs

CORAL:
Ethereum, Optimism, Polygon, Arbitrum, Avalanche, Base, Scroll, Kaia, Bnb, HyperEVM
0xbada557252d286e45a1ad73f32479062d4e2e86b

Sophon
0xB61fAdeBccCb15823b64bf47829d32eeb4A08930

FOLLY:
Optimism Sepolia, Polygon Amoy, Arbitrum Sepolia, Base Sepolia, Sepolia, Monad Testnet
0xf0111ede031a4377c34a4ad900f1e633e41055dc

2. Add command instructions to the quickstart

bun install @avail-project/nexus-widgets

3. Solve inconsistencies between NextJs 16 and the SDK

4. Explain more how Avail works underneath

5. Add Cosmos URL

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
CERISE: {
name: "Cerise (Mainnet)",
grpcUrl: "https://mimosa-dash-grpc.arcana.network",
cosmosUrl: "https://cosmos01-dev.arcana.network:26650",
},
} as const;

6. Explain why in cosmos the fills don't show sometimes because they are confirmed through vote extensions

7. Explorer lacks a lot of information and details, improve it or lets have a call ;)
