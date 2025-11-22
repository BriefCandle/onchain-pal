// display playerEntity (i.e., move to coord) & trainerEntity (what is to moved), their distance, and a move button

import { useComponentValue } from "@latticexyz/react";
import {
  gameContractConfig,
  SOURCE,
  TARGET,
} from "@onchain-pal/contract-client";
import { useMUD } from "../../MUDContext";
import { useCurrPositionMUD } from "../hooks/usePath";
import { useSendTransaction } from "../wallet/useSendTransaction";
import { Hex } from "viem";

export function CatchPanel() {
  const { components } = useMUD();
  const { HoveredTarget, SelectedTrainer } = components;
  const targetId = useComponentValue(HoveredTarget, TARGET)?.tokenId ?? 0;
  const trainerId = useComponentValue(SelectedTrainer, SOURCE)?.tokenId ?? 0;
  const trainerCoord = useCurrPositionMUD(components, trainerId);
  const { sendContractTransaction, isConnected } = useSendTransaction();

  if (!trainerCoord || !targetId) return null;

  // TODO: add in range check

  const handleCatch = async () => {
    if (!isConnected) return;
    try {
      await sendContractTransaction({
        address: gameContractConfig.address as Hex,
        abi: gameContractConfig.abi,
        functionName: "attemptCapture",
        args: [BigInt(trainerId), BigInt(targetId)],
      });
    } catch (error) {
      console.error("Catch tx failed:", error);
    }
  };

  return (
    // <div className="absolute pointer-events-auto bottom-1/4 left-2/3 -translate-x-2/3 bg-gray-800 p-2 rounded-md z-100 border">
    <div>
      <div className="flex flex-col space-y-1">
        <span>target #{targetId}</span>
        <button
          className="btn btn-primary bg-blue-500 text-white"
          onClick={async () => await handleCatch()}
          disabled={!isConnected}
        >
          Catch
        </button>
      </div>
    </div>
  );
}
