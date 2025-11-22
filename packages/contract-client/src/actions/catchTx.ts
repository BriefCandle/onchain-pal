import { encodeFunctionData, Hex, WalletClient } from "viem";
import { publicClient, gameContractConfig } from "../contract";
import { ClientComponents } from "../mud/createClientComponents";
import { Vector } from "../utils";
import { getHeroTransactionQueue } from "../utils/parallelTransactionQueue";
import { EvmSmartAccount } from "@coinbase/cdp-sdk";

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

export const catchTxWithSmartAccount = async (
  smartAccount: EvmSmartAccount,
  tokenId: number,
  targetTokenId: number
): Promise<void> => {
  const baseAccount = await smartAccount.useNetwork("base-sepolia");

  try {
    const calldata = encodeFunctionData({
      ...gameContractConfig,
      functionName: "attemptCapture",
      args: [BigInt(tokenId), BigInt(targetTokenId)],
    });
    const userOpHash = await baseAccount.sendUserOperation({
      calls: [
        {
          to: gameContractConfig.address,
          value: 0n,
          data: calldata,
        },
      ],
    });
    console.log("UserOperation sent:", userOpHash);
    const receipt = await baseAccount.waitForUserOperation(userOpHash);
    console.log("Catch tx confirmed", receipt);
  } catch (error: any) {
    console.error("Tx failed:", error);
    throw error; // re-throw for caller to handle
  }
};
