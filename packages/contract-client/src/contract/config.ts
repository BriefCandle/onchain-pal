import {
  Abi,
  createPublicClient,
  createWalletClient,
  defineChain,
  Hex,
  http,
} from "viem";
import { baseSepolia } from "viem/chains";

import { abi as gameAbi } from "@onchain-pal/contract/GameV1.sol/GameV1.json";
import { abi as agentNFTAbi } from "@onchain-pal/contract/AgentNFT.sol/AgentNFT.json";
import { privateKeyToAccount } from "viem/accounts";
import { abi as rngProviderAbi } from "@onchain-pal/contract/RNGProvider.sol/RNGProvider.json";

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

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http("https://sepolia.base.org"),
});

// anvil local
export const RNG_PROVIDER_ADDRESS =
  "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
export const AGENT_NFT_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
export const GAME_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

// // base sepolia--test1

export const gameContractConfig = {
  address: GAME_ADDRESS,
  abi: gameAbi as Abi,
} as const;

export const agentNFTContractConfig = {
  address: AGENT_NFT_ADDRESS,
  abi: agentNFTAbi as Abi,
} as const;

export const rngProviderContractConfig = {
  address: RNG_PROVIDER_ADDRESS,
  abi: rngProviderAbi as Abi,
} as const;
