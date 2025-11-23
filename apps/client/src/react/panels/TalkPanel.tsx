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
import { useState } from "react";

export function TalkPanel() {
  const { components } = useMUD();
  const { HoveredTarget, SelectedTrainer } = components;
  const targetId = useComponentValue(HoveredTarget, TARGET)?.tokenId ?? 0;
  const trainerId = useComponentValue(SelectedTrainer, SOURCE)?.tokenId ?? 0;
  const trainerCoord = useCurrPositionMUD(components, trainerId);
  const { sendContractTransaction, isConnected } = useSendTransaction();

  const [message, setMessage] = useState("");

  if (!trainerCoord || !targetId) return null;

  // TODO: add in range check

  const handleTalk = async () => {
    if (!isConnected) return;
    try {
      await sendContractTransaction({
        address: gameContractConfig.address as Hex,
        abi: gameContractConfig.abi,
        functionName: "talk",
        args: [BigInt(trainerId), BigInt(targetId), message],
      });
    } catch (error) {
      console.error("Attack tx failed:", error);
    }
  };

  return (
    // <div className="absolute pointer-events-auto bottom-1/4 left-1/3 -translate-x-1/3 bg-gray-800 p-2 rounded-md z-100 border">
    <div>
      <div className="flex flex-col space-y-1">
        <input
          type="text"
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          className="btn btn-primary bg-blue-500 text-white"
          onClick={async () => await handleTalk()}
          disabled={!isConnected}
        >
          Talk
        </button>
      </div>
    </div>
  );
}
