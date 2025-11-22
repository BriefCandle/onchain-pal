import { Hex, WalletClient } from "viem";
import { publicClient, gameContractConfig } from "../contract";
import { ClientComponents } from "../mud/createClientComponents";
import { Vector } from "../utils";
import { getHeroTransactionQueue } from "../utils/parallelTransactionQueue";

export const catchTx = async (
  walletClient: WalletClient,
  components: ClientComponents,
  tokenId: number,
  targetTokenId: number
) => {
  try {
    const { request } = await publicClient.simulateContract({
      ...gameContractConfig,
      functionName: "attemptCapture",
      args: [BigInt(tokenId), BigInt(targetTokenId)],
      account: walletClient.account!,
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    // console.log("Tx confirmed:", receipt);
  } catch (error) {
    console.error("Tx failed:", error);
  }
};
