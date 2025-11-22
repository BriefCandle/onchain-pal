/*
 * The MUD client code is built on top of viem
 * (https://viem.sh/docs/getting-started.html).
 * This line imports the functions we need from it.
 */
import { Type } from "@latticexyz/recs";
import { defineComponent } from "@latticexyz/recs";
import { world } from "./world";
import { Hex, PublicClient } from "viem";
import { publicClient } from "../contract/config";
import { syncGameMUD } from "../network";

export type NetworkComponents = ReturnType<typeof createNetworkComponents>;

const pathDataSchema = {
  fromX: Type.Number,
  fromY: Type.Number,
  toX: Type.Number,
  toY: Type.Number,
  lastUpdated: Type.Number,
  duration: Type.Number,
} as const;

const agentDataSchema = {
  owner: Type.String,
  agentType: Type.Number,
} as const;

const timeDataSchema = {
  lastDeadTime: Type.Number,
} as const;

const statsDataSchema = {
  health: Type.Number,
} as const;

const tokenDataSchema = {
  tokenId: Type.BigInt,
  ...statsDataSchema,
  ...pathDataSchema,
  ...agentDataSchema,
  ...timeDataSchema,
} as const;

export function createNetworkComponents() {
  const components = {
    // ------- game data -------
    TokenData: defineComponent(world, tokenDataSchema),
    // ------- game events -------
    PathUpdatedFlatEvent: defineComponent(world, {
      tokenId: Type.BigInt,
      ...pathDataSchema,
    }),
    AttackedEvent: defineComponent(world, {
      attackerTokenId: Type.BigInt,
      targetTokenId: Type.BigInt,
      inRange: Type.Boolean,
      defeated: Type.Boolean,
    }),
    SpawnedEvent: defineComponent(world, tokenDataSchema),
    CaptureAttemptedEvent: defineComponent(world, {
      attackerTokenId: Type.BigInt,
      targetTokenId: Type.BigInt,
      inRange: Type.Boolean,
    }),
    CaptureSettledEvent: defineComponent(world, {
      targetTokenId: Type.BigInt,
      playerAddress: Type.String,
      caught: Type.Boolean,
    }),
    DefeatedEvent: defineComponent(world, {
      tokenId: Type.BigInt,
      lastDeadTime: Type.Number,
    }),
    RevivedEvent: defineComponent(world, {
      tokenId: Type.BigInt,
      health: Type.Number,
    }),
  };
  return components;
}

export async function setupNetwork(gameAddress?: Hex) {
  //   /*
  //    * Sync on-chain state into RECS and keeps our client in sync.
  //    * Uses the MUD indexer if available, otherwise falls back
  //    * to the viem publicClient to make RPC calls to fetch MUD
  //    * events from the chain.
  //    */
  //   // const { components, latestBlock$, storedBlockLogs$, waitForTransaction } =
  //   //   await syncToRecs({
  //   //     world,
  //   //     config: mudConfig,
  //   //     address: networkConfig.worldAddress as Hex,
  //   //     publicClient,
  //   //     startBlock: BigInt(networkConfig.initialBlockNumber),
  //   //   });

  const components = createNetworkComponents();

  const gameEventUnwatch = await syncGameMUD(
    components,
    publicClient as PublicClient
  );

  return {
    components,
    world,
    unwatches: {
      gameEventUnwatch,
      // blockNumberUnwatch,
    },
  };
}

/*
 * Import our MUD config, which includes strong types for
 * our tables and other config options. We use this to generate
 * things like RECS components and get back strong types for them.
 *
 * See https://mud.dev/templates/typescript/contracts#mudconfigts
 * for the source of this information.
 */

export type SetupNetworkResult = Awaited<ReturnType<typeof setupNetwork>>;
