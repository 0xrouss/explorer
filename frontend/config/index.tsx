import { cookieStorage, createStorage, http } from "@wagmi/core";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import {
  scroll,
  mainnet,
  polygon,
  arbitrum,
  optimism,
  bsc,
  avalanche,
  base,
  kaia,
  sophon,
  sepolia,
  optimismSepolia,
  polygonAmoy,
  arbitrumSepolia,
  baseSepolia,
  monadTestnet,
} from "@reown/appkit/networks";

// Get projectId from https://dashboard.reown.com
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

if (!projectId) {
  throw new Error("Project ID is not defined");
}

export const networks = [
  mainnet,
  polygon,
  arbitrum,
  avalanche,
  base,
  scroll,
  kaia,
  bsc,
  sophon,
  optimism,
  sepolia,
  optimismSepolia,
  polygonAmoy,
  arbitrumSepolia,
  baseSepolia,
  monadTestnet,
];

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  projectId,
  networks,
});

export const config = wagmiAdapter.wagmiConfig;
