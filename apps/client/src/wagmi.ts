import { defineChain } from "viem";
import { http, createConfig } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import {
  coinbaseWallet,
  injected,
  metaMask,
  safe,
  walletConnect,
} from "wagmi/connectors";

export const localhost = /*#__PURE__*/ defineChain({
  id: 31_337,
  name: "Localhost",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
  },
});

export const baseSepolia = /*#__PURE__*/ defineChain({
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: { http: ["https://sepolia.base.org"] },
  },
  blockExplorers: {
    default: {
      name: "Base Sepolia Explorer",
      url: "https://sepolia.basescan.org",
    },
  },
});

export const baseMainnet = defineChain({
  id: 8453,
  name: "Base Mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: { http: ["https://mainnet.base.org"] },
  },
});

export const config = createConfig({
  // mainnet, sepolia,
  // chains: [baseSepolia],
  chains: [localhost],
  connectors: [
    coinbaseWallet(),
    // injected(),
    // metaMask(),
    // safe(),
    // walletConnect({ projectId: import.meta.env.VITE_WC_PROJECT_ID }),
  ],
  syncConnectedChain: true,
  transports: {
    // [mainnet.id]: http(),
    // [sepolia.id]: http(),
    [localhost.id]: http(),
    // [hyperTestnet.id]: http(),
    // [baseSepolia.id]: http("https://sepolia.base.org"),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
