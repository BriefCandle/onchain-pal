// display playerEntity (i.e., move to coord) & trainerEntity (what is to moved), their distance, and a move button

import { useComponentValue } from "@latticexyz/react";
import { attackTx, moveTx, SOURCE, TARGET } from "@onchain-pal/contract-client";
import { useMUD } from "../../MUDContext";
import { useCurrPositionMUD } from "../hooks/usePath";
import { adminClient } from "../actions/Move";

export function AttackPanel() {
  const { components } = useMUD();
  const { HoveredTarget, SelectedTrainer } = components;
  const targetId = useComponentValue(HoveredTarget, TARGET)?.tokenId ?? 0;
  const trainerId = useComponentValue(SelectedTrainer, SOURCE)?.tokenId ?? 0;
  const trainerCoord = useCurrPositionMUD(components, trainerId);
  if (!trainerCoord || !targetId) return null;

  // TODO: add in range check

  const handleAttack = async () => {
    if (!adminClient) return;
    await attackTx(adminClient, components, trainerId, targetId);
  };

  return (
    // <div className="absolute pointer-events-auto bottom-1/4 left-1/3 -translate-x-1/3 bg-gray-800 p-2 rounded-md z-100 border">
    <div>
      <div className="flex flex-col space-y-1">
        <span>target #{targetId}</span>
        <button
          className="btn btn-primary bg-blue-500 text-white"
          onClick={async () => await handleAttack()}
        >
          Attack
        </button>
      </div>
    </div>
  );
}
