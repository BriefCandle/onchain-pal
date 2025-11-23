import "dotenv/config";

import {
  adminWallet,
  gameContractConfig,
  moveTx,
  publicClient,
  watchRNGRequestedEvents,
  startRNGKeyManagement,
} from "@onchain-pal/contract-client";
import express from "express";
import http from "http";

const app = express();

app.use(express.json());

const server = http.createServer(app); // Create a raw HTTP server

const PORT = process.env.PORT || 3003;
server.listen(PORT, async () => {
  console.log(`backend server running on http://localhost:${PORT}`);

  // monitor current proxy for its startGameBlock;
  const unwatch = watchRNGRequestedEvents(
    publicClient as any,
    adminWallet as any
  );
  console.log("✅ watching RNGRequested events");

  // Start RNG key management (commit and reveal keys every day)
  const stopKeyManagement = startRNGKeyManagement(
    publicClient as any,
    adminWallet as any,
    60 * 60 * 1000 // 1 hour interval
  );
  console.log("✅ started RNG key management");

  process.on("SIGINT", () => {
    unwatch();
    stopKeyManagement();
    process.exit(0);
  });
});
