import { EvmSmartAccount } from "@coinbase/cdp-sdk";
import { gameContractConfig } from "../contract";
import { encodeFunctionData } from "viem";

export const talkTxWithSmartAccount = async (
  smartAccount: EvmSmartAccount,
  fromTokenId: number,
  toTokenId: number,
  message: string
): Promise<void> => {
  const baseAccount = await smartAccount.useNetwork("base-sepolia");

  try {
    const calldata = encodeFunctionData({
      ...gameContractConfig,
      functionName: "talk",
      args: [BigInt(fromTokenId), BigInt(toTokenId), message],
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
    console.log("Talk tx confirmed:", receipt);
  } catch (error: any) {
    console.error("Tx failed:", error);
    throw error; // re-throw for caller to handle
  }
};
