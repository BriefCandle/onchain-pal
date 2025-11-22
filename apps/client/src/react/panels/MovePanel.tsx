// display playerEntity (i.e., move to coord) & trainerEntity (what is to moved), their distance, and a move button

import { useComponentValue } from "@latticexyz/react";
import { moveTx, SOURCE } from "@onchain-pal/contract-client";
import { useMUD } from "../../MUDContext";
import { useCurrPositionMUD } from "../hooks/usePath";
import { adminClient } from "../actions/Move";

export function MovePanel() {
  const { components } = useMUD();
  const { PlayerEntityCoord, SelectedTrainer } = components;
  const coord = useComponentValue(PlayerEntityCoord, SOURCE);
  const trainerId = useComponentValue(SelectedTrainer, SOURCE)?.tokenId ?? 0;
  const trainerCoord = useCurrPositionMUD(components, trainerId);
  if (!trainerCoord || !coord) return null;

  const { x: fromX, y: fromY } = trainerCoord;
  const { x: toX, y: toY } = coord;

  const handleMove = async () => {
    if (!adminClient) return;
    await moveTx(adminClient, components, trainerId, coord);
  };

  return (
    <div className="absolute pointer-events-auto bottom-1/4 left-1/2 -translate-x-1/2 bg-gray-800 p-2 rounded-md z-100 border">
      <div className="flex flex-col space-y-1">
        <span>
          from ({fromX},{fromX}) to ({toX},{toY})
        </span>
        <button
          className="btn btn-primary bg-blue-500 text-white"
          onClick={async () => await handleMove()}
        >
          Move
        </button>
      </div>
    </div>
  );
}
