import "dotenv/config";

import { NetworkComponents, publicClient } from "@onchain-pal/contract-client";
import { setup } from "@onchain-pal/contract-client";
import express from "express";
import http from "http";
import { Hex, WatchEventReturnType } from "viem";
import {
  createAgentSystem,
  initializeChaosChain,
} from "./agent/createAgentSysten";

const app = express();

app.use(express.json());

const server = http.createServer(app); // Create a raw HTTP server

export let components: NetworkComponents | null = null;
// Store the current unwatch function to clean up previous event watchers
export let gameEventUnwatch: WatchEventReturnType | null = null;
// export let blockNumberUnwatch: { unwatch: () => void } | null = null;

// Function to clean up event watchers
export function cleanupEventWatchers() {
  if (gameEventUnwatch) {
    console.log("Cleaning up hero event watcher...");
    gameEventUnwatch();
    gameEventUnwatch = null;
  }

  // if (blockNumberUnwatch) {
  //   console.log("Cleaning up block number watcher...");
  //   blockNumberUnwatch.unwatch();
  //   blockNumberUnwatch = null;
  // }
}

server.listen(3001, async () => {
  console.log("backend server running on http://localhost:3001");

  // Initialize ChaosChain service before setting up agents
  initializeChaosChain();

  const setupResult = await setup();
  const {
    network: { unwatches },
    components,
  } = setupResult;
  gameEventUnwatch = unwatches.gameEventUnwatch;
  // blockNumberUnwatch = unwatches.blockNumberUnwatch;

  // start the agent after data sync is complete
  await new Promise((resolve) => setTimeout(resolve, 1000));
  createAgentSystem(components);
});
