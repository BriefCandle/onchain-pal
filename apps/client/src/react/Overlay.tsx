import { useMUD } from "../MUDContext";
// import { Entity, getComponentValue, Has } from "@latticexyz/recs";
// import { useComponentValue, useEntityQuery } from "@latticexyz/react";
// import { AccountPanel } from "./panels/AccountPanel";
import React, { useRef, useEffect, useState } from "react";
import { MoveButton } from "./actions/Move";
import { SpawnTrainerButton } from "./actions/SpawnTrainer";
import { EntitiesPanel } from "./panels/EntitiesPanel";
import { MovePanel } from "./panels/MovePanel";
import { HoeverEntityPanel } from "./panels/HoveredEntityPanel";
// import { AttackPanel } from "./panels/AttackPanel";
// import { CatchPanel } from "./panels/CatchPanel";
import { MintPanel } from "./panels/MintPanel";
// import { HeroDetailPanel } from "./panels/HeroDetailPanel";
//   import { EventLogsPanel } from "./panels/EventLogsPanel";
// import { MintHeroPanel } from "./panels/MintHeroPanel";
// import { ConnectButton } from "./panels/AccountPanel";

export function Overlay() {
  const { components } = useMUD();

  const { SelectedEntity, PathUpdatedFlatEvent, TokenData, PlayerEntityCoord } =
    components;

  // const source = useComponentValue(SelectedHero, SOURCE)?.tokenId;

  // // testing
  // const playerCoord = useComponentValue(PlayerEntityCoord, SOURCE);
  // console.log("playerCoord", playerCoord);
  // const tests = useEntityQuery([Has(PathUpdatedFlatEvent)]);
  // tests.forEach((test) => {
  //   console.log("test", test, getComponentValue(PathUpdatedFlatEvent, test));
  // });

  // console.log(
  //   "tokenId: 1",
  //   getComponentValue(TokenMonData, 1n.toString() as Entity)
  // );
  // console.log("source", source);
  // console.log("safe zone", getHeroSafeZoneContext(components));

  return (
    <div className="absolute inset-0 pointer-events-none text-white overflow-hidden">
      <div className="relative h-full w-full">
        {/* {source !== undefined && (
          <div className="absolute pointer-events-auto top-2 left-2">
            <HeroPanel heroId={source} isSource={true} />
          </div>
        )}
        {target !== undefined && (
          <div className="absolute pointer-events-auto top-1/2 left-2">
            <HeroPanel heroId={target} isSource={false} />
          </div>
        )} */}
        <NoPropagation>
          <div className="absolute pointer-events-auto top-1 left-1 z-50 flex flex-col items-start bg-gray-500 p-2 rounded-md">
            {/* <EntitiesPanel /> */}
            {/* <MoveButton /> */}
            {/* <AttemptCaptureButton /> */}
            {/* <SpawnTrainerButton /> */}
            {/* <LeaveButton /> */}
          </div>
          {/* <HeroDetailPanel /> */}
          {/* <MintHeroPanel /> */}
          {/* <MobileControls /> */}
          {/* <EventLogsPanel /> */}
          {/* <HeroListPanel /> */}
          {/* <HeroEventsPanel /> */}
          <MintPanel />
          <MovePanel />
          <HoeverEntityPanel />
          {/* <AttackPanel /> */}
          {/* <CatchPanel /> */}
          {/* <MintPanel /> */}
        </NoPropagation>
      </div>
    </div>
  );
}

export function NoPropagation({ children }: { children: React.ReactNode }) {
  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
