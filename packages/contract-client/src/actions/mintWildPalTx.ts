import { encodeFunctionData, WalletClient } from "viem";
import { gameContractConfig, publicClient } from "../contract";
import { EvmSmartAccount } from "@coinbase/cdp-sdk";

// called by player
export const mintWildPalTx = async (walletClient: WalletClient) => {
  try {
    const { request } = await publicClient.simulateContract({
      ...gameContractConfig,
      functionName: "mintWildPal",
      args: [],
      account: walletClient.account!,
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Mint wild pal tx confirmed:", receipt);
  } catch (error) {
    console.error("Tx failed:", error);
  }
};

export const mintWildPalTxWithSmartAccount = async (
  smartAccount: EvmSmartAccount
): Promise<void> => {
  const baseAccount = await smartAccount.useNetwork("base-sepolia");

  try {
    const calldata = encodeFunctionData({
      ...gameContractConfig,
      functionName: "mintWildPal",
      args: [],
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
  } catch (error: any) {
    console.error("Tx failed:", error);
    throw error; // re-throw for caller to handle
  }
};
