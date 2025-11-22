import { createConfig, http } from "wagmi";
import { ronin, zeroGMainnet, base, baseSepolia } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";

// Get from https://cloud.walletconnect.com
const WALLETCONNECT_PROJECT_ID =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "";

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia, ronin, zeroGMainnet],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "onchain-pal" }),
    walletConnect({ projectId: WALLETCONNECT_PROJECT_ID }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
    [ronin.id]: http(),
    [zeroGMainnet.id]: http(),
  },
});

// Export chain list for UI usage
export const supportedChains = [base, baseSepolia, ronin, zeroGMainnet];
