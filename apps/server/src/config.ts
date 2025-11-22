import {
  createPublicClient,
  createWalletClient,
  erc20Abi,
  Hex,
  http,
  toHex,
  webSocket,
} from "viem";
import { baseSepolia, localhost } from "viem/chains";

// Custom chain definition to ensure correct chain ID
const customLocalhost = {
  ...localhost,
  id: 31337,
  name: "Localhost",
  network: "localhost",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
    public: { http: ["http://127.0.0.1:8545"] },
  },
};

import { privateKeyToAccount } from "viem/accounts";
const PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY as Hex;
if (!PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY environment variable is required");
}
const account = privateKeyToAccount(PRIVATE_KEY);

// Wallet client for sending transactions
export const walletClient = createWalletClient({
  // chain: customLocalhost,
  chain: baseSepolia,
  // transport: http("http://127.0.0.1:8545"),
  transport: http("https://sepolia.base.org"),
  account,
});

export const publicClient = createPublicClient({
  // chain: customLocalhost,
  chain: baseSepolia,
  // transport: http("http://127.0.0.1:8545"),
  transport: http("https://sepolia.base.org"),
});
