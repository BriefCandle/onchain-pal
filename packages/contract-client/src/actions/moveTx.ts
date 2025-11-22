import { Hex, WalletClient, encodeFunctionData } from "viem";
import { publicClient, gameContractConfig } from "../contract";
import { Vector } from "../utils/";
import { getHeroTransactionQueue } from "../utils/parallelTransactionQueue";
import { NetworkComponents } from "../mud";
import { EvmSmartAccount } from "@coinbase/cdp-sdk";

export const moveTx = async (
  walletClient: WalletClient,
  components: NetworkComponents,
  tokenId: number,
  toCoord: Vector,
  message: string
) => {
  try {
    const { request } = await publicClient.simulateContract({
      ...gameContractConfig,
      functionName: "move",
      args: [BigInt(tokenId), toCoord.x, toCoord.y, message],
      account: walletClient.account!,
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    // console.log("Tx confirmed:", receipt);
  } catch (error) {
    console.error("Tx failed:", error);
  }
};

export const moveTxWithSmartAccount = async (
  smartAccount: EvmSmartAccount,
  tokenId: number,
  toCoord: Vector
): Promise<void> => {
  const baseAccount = await smartAccount.useNetwork("base-sepolia");

  try {
    // 1. Encode the function call
    const calldata = encodeFunctionData({
      abi: gameContractConfig.abi,
      functionName: "move",
      args: [BigInt(tokenId), BigInt(toCoord.x), BigInt(toCoord.y)],
    });

    // 3. Send via UserOperation
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

    // 4. Wait for the transaction to be mined
    const receipt = await baseAccount.waitForUserOperation(userOpHash);

    console.log("Move successful! Tx:", receipt.status);
  } catch (error: any) {
    console.error("Tx failed:", error);
    throw error; // re-throw for caller to handle
  }
};
