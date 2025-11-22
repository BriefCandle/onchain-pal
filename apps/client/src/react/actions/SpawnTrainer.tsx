import { Hex } from "viem";
import { agentNFTContractConfig } from "@onchain-pal/contract-client";
import { useSendTransaction } from "../wallet/useSendTransaction";

export function SpawnTrainerButton() {
  const { sendContractTransaction, isConnected } = useSendTransaction();

  const handleMintTrainer = async () => {
    if (!isConnected) return;
    try {
      await sendContractTransaction({
        address: agentNFTContractConfig.address as Hex,
        abi: agentNFTContractConfig.abi,
        functionName: "mintTrainer",
        args: [],
      });
    } catch (error) {
      console.error("Mint trainer tx failed:", error);
    }
  };

  return (
    <div className="flex flex-col m-2 border-2">
      <button
        className="btn btn-primary bg-blue-500 text-white"
        onClick={async () => await handleMintTrainer()}
        disabled={!isConnected}
      >
        Mint Trainer
      </button>
    </div>
  );
}
