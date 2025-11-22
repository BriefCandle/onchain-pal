/*
 * This file sets up all the definitions required for a MUD client.
 */

import { Hex } from "viem";
import { createClientComponents } from "./createClientComponents";
// import { createSystemCalls } from "./createSystemCalls";
import { setupNetwork } from "@onchain-pal/contract-client/mud";

export type SetupResult = Awaited<ReturnType<typeof setup>>;

export async function setup(gameAddress?: Hex) {
  const network = await setupNetwork(gameAddress);
  const components = createClientComponents(network);
  // const systemCalls = createSystemCalls(network, components);

  return {
    network,
    components,
    // systemCalls,
  };
}
