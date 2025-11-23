import {
  Abi,
  createPublicClient,
  createWalletClient,
  defineChain,
  Hex,
  http,
} from "viem";
import { baseSepolia, polygon } from "viem/chains";

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

// export const publicClient = createPublicClient({
//   chain: baseSepolia,
//   transport: http("https://sepolia.base.org"),
// });

export const publicClient = createPublicClient({
  chain: polygon,
  transport: http("https://polygon-mainnet.g.alchemy.com/v2/demo"),
});

// export const publicClient = createPublicClient({
//   chain: localhost,
//   transport: http("http://127.0.0.1:8545"),
// });

// Only create adminWallet in Node.js environment (browsers shouldn't have private keys)
// Note: dotenv should be loaded by the consuming application (e.g., server) before importing this module
let adminWallet: ReturnType<typeof createWalletClient> | undefined;

if (
  typeof process !== "undefined" &&
  process.env &&
  process.env.ADMIN_PRIVATE_KEY
) {
  const PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY as Hex;
  const account = privateKeyToAccount(PRIVATE_KEY);

  adminWallet = createWalletClient({
    // chain: localhost,
    // chain: baseSepolia,
    chain: polygon,
    // transport: http("http://127.0.0.1:8545"),
    // transport: http("https://sepolia.base.org"),
    transport: http("https://polygon-mainnet.g.alchemy.com/v2/demo"),
    account,
  });
}

export { adminWallet };

// // anvil local
// export const RNG_PROVIDER_ADDRESS =
//   "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
// export const AGENT_NFT_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
// export const GAME_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

// // // base sepolia--test1
// export const RNG_PROVIDER_ADDRESS =
//   "0x6712619ef89c8aCF5d6407b4b57c807f05c29252";
// export const AGENT_NFT_ADDRESS = "0xe0a3f19BeD468a3cF938162A91ea60d2E898Eb13";
// export const GAME_ADDRESS = "0xA93b3dFde75492f1C159875b8C28C1C015DF0021";

// // polygon mainnet
export const RNG_PROVIDER_ADDRESS =
  "0x54211D10AB38474590E4420893BEF194dDcE0867";
export const AGENT_NFT_ADDRESS = "0x6826c398c13Ef3588ad8A01546aBD9AB2DF98906";
export const GAME_ADDRESS = "0xac15D5D08faB1F1f93F896c9217B8372dE595d94";

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
