// display playerEntity (i.e., move to coord) & trainerEntity (what is to moved), their distance, and a move button

import { agentNFTContractConfig } from "@onchain-pal/contract-client";
import { useSendTransaction } from "../wallet/useSendTransaction";
import { Hex } from "viem";

export function MintPanel() {
  const { sendContractTransaction, isConnected } = useSendTransaction();

  const handleMint = async () => {
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
    <div className="absolute pointer-events-auto bottom-1/4 right-1/4 bg-gray-800 p-2 rounded-md z-100 border">
      <div className="flex flex-col space-y-1">
        <button
          className="btn btn-primary bg-blue-500 text-white"
          onClick={async () => await handleMint()}
          disabled={!isConnected}
        >
          Mint Trainer
        </button>
      </div>
    </div>
  );
}
