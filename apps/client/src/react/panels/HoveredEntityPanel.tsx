// display playerEntity (i.e., move to coord) & trainerEntity (what is to moved), their distance, and a move button

import { useComponentValue } from "@latticexyz/react";
import { AgentType, SOURCE, TARGET } from "@onchain-pal/contract-client";
import { useMUD } from "../../MUDContext";
import { useCurrPositionMUD } from "../hooks/usePath";
import { Entity } from "@latticexyz/recs";
import { AttackPanel } from "./AttackPanel";
import { CatchPanel } from "./CatchPanel";
import { TalkPanel } from "./TalkPanel";

export function HoeverEntityPanel() {
  const { components } = useMUD();
  const { HoveredTarget, SelectedTrainer, TokenData } = components;
  const targetId = useComponentValue(HoveredTarget, TARGET)?.tokenId ?? 0;
  const targetData = useComponentValue(
    TokenData,
    targetId.toString() as Entity
  );
  const trainerId = useComponentValue(SelectedTrainer, SOURCE)?.tokenId ?? 0;
  const trainerCoord = useCurrPositionMUD(components, trainerId);
  if (!trainerCoord || !targetId || !targetData) return null;

  // TODO: add in range check

  return (
    <div className="absolute pointer-events-auto bottom-3 right-2  bg-gray-800 p-2 rounded-md z-100 border">
      <div className="flex flex-col space-y-1">
        <span>agent #{targetId}</span>
        <span>
          {targetData.agentType === AgentType.PAL ? "PAL" : "TRAINER"}
        </span>
        <AttackPanel />
        <CatchPanel />
        <TalkPanel />
      </div>
    </div>
  );
}
