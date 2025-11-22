import { WalletClient } from "viem";
import { gameContractConfig, publicClient } from "../contract";

// called by player
export const mintTrainerTx = async (walletClient: WalletClient) => {
  try {
    const { request } = await publicClient.simulateContract({
      ...gameContractConfig,
      functionName: "mintTrainer",
      args: [],
      account: walletClient.account!,
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Spawn trainer tx confirmed:", receipt);
  } catch (error) {
    console.error("Tx failed:", error);
  }
};

// called by player
export const deployPalTx = async (
  walletClient: WalletClient,
  tokenId: number,
  trainerTokenId: number
) => {
  try {
    const { request } = await publicClient.simulateContract({
      ...gameContractConfig,
      functionName: "deployPal",
      args: [BigInt(tokenId), BigInt(trainerTokenId)],
      account: walletClient.account!,
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Deploy pal tx confirmed:", receipt);
  } catch (error) {
    console.error("Tx failed:", error);
  }
};

// called by agent
export const leaveTx = async (walletClient: WalletClient, tokenId: number) => {
  try {
    const { request } = await publicClient.simulateContract({
      ...gameContractConfig,
      functionName: "leave",
      args: [BigInt(tokenId)],
      account: walletClient.account!,
    });

    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Leave tx confirmed:", receipt);
  } catch (error) {
    console.error("Tx failed:", error);
  }
};
