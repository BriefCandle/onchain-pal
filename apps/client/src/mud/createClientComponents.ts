/*
 * Creates components for use by the client.
 *
 * By default it returns the components from setupNetwork.ts, those which are
 * automatically inferred from the mud.config.ts table definitions.
 *
 * However, you can add or override components here as needed. This
 * lets you add user defined components, which may or may not have
 * an onchain component.
 */

import { Type, defineComponent } from "@latticexyz/recs";
import { type SetupNetworkResult } from "@onchain-pal/contract-client/mud";
import { world } from "@onchain-pal/contract-client/mud";

export type ClientComponents = ReturnType<typeof createClientComponents>;

export function createClientComponents({ components }: SetupNetworkResult) {
  return {
    ...components,
    // unused; setupPlayerLockTick()
    SelectedEntity: defineComponent(world, {
      tokenId: Type.Number,
    }),
    // TARGET->;
    HoveredTarget: defineComponent(world, {
      tokenId: Type.Number,
    }),
    // SOURCE->;
    SelectedTrainer: defineComponent(world, {
      tokenId: Type.Number,
    }),
    // SOURCE->; for communicate between noa layer & react layer
    PlayerEntityCoord: defineComponent(world, {
      x: Type.Number,
      y: Type.Number,
    }),
    // TARGET ->
    EventLog: defineComponent(world, {
      heroId: Type.Number,
      coordId: Type.Number,
      eventText: Type.String,
      eventType: Type.String,
      tx: Type.String,
    }),
  };
}
