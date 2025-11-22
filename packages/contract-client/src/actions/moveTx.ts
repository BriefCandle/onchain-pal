import { Hex, WalletClient } from "viem";
import { publicClient, gameContractConfig } from "../contract";
import { Vector } from "../utils/";
import { getHeroTransactionQueue } from "../utils/parallelTransactionQueue";
import { NetworkComponents } from "../mud";

export const moveTx = async (
  walletClient: WalletClient,
  components: NetworkComponents,
  tokenId: number,
  toCoord: Vector
) => {
  try {
    const { request } = await publicClient.simulateContract({
      ...gameContractConfig,
      functionName: "move",
      args: [BigInt(tokenId), toCoord.x, toCoord.y],
      account: walletClient.account!,
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    // console.log("Tx confirmed:", receipt);
  } catch (error) {
    console.error("Tx failed:", error);
  }
};
