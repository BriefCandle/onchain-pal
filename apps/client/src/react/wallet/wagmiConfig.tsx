import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";
import { createCDPEmbeddedWalletConnector } from "@coinbase/cdp-wagmi";
import type { Chain } from "viem";

// Get from https://cloud.walletconnect.com
const WALLETCONNECT_PROJECT_ID =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "";

// Define which chains each wallet type supports
export const CDP_SUPPORTED_CHAINS: Chain[] = [baseSepolia]; // CDP smart wallet - testnet only for now
export const EXTERNAL_SUPPORTED_CHAINS: Chain[] = [base, baseSepolia]; // External wallets - both networks

// All supported chains (union)
export const ALL_SUPPORTED_CHAINS: Chain[] = [base, baseSepolia];

export const CDP_PROJECT_ID = "084032fc-4a60-48b9-aab9-794fd3c2077d";

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    // CDP Embedded Wallet - handles social/email login
    createCDPEmbeddedWalletConnector({
      cdpConfig: {
        projectId: CDP_PROJECT_ID,
        ethereum: {
          createOnLogin: "smart",
        },
      },
      providerConfig: {
        chains: [base, baseSepolia],
        transports: {
          [base.id]: http(),
          [baseSepolia.id]: http(),
        },
      },
    }),
    // External wallets
    injected(),
    coinbaseWallet({ appName: "onchain-pal" }),
    walletConnect({ projectId: WALLETCONNECT_PROJECT_ID }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});

// Export chain list for UI usage
export const supportedChains = [base, baseSepolia];
