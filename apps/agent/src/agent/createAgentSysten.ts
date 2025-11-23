import {
  AGENT_NFT_ADDRESS,
  AgentType,
  gameContractConfig,
  NetworkComponents,
  world,
} from "@onchain-pal/contract-client";
import { PalAgent } from "./palAgent";
import {
  defineSystem,
  Entity,
  getComponentValue,
  Has,
  UpdateType,
} from "@latticexyz/recs";
import { createOrGetAgentAccount } from "./accountManager";
import { keccak256, toBytes, stringToHex, Hex } from "viem";
import { EvmSmartAccount } from "@coinbase/cdp-sdk";
import {
  initializeChaosChainService,
  registerAgentIdentity,
} from "./services/chaoschain";
import { AgentStorageManager } from "./services/storageManager";
import { deepseek } from "@ai-sdk/deepseek";

export const agents = new Map<number, PalAgent>();
// Store wallet clients for each agent
export const agentWallets = new Map<number, EvmSmartAccount>();
// Store storage managers for each agent
export const agentStorageManagers = new Map<number, AgentStorageManager>();

// Initialize ChaosChain service (call this on startup)
export function initializeChaosChain(): void {
  console.log("[ChaosChain Init] Checking environment configuration...");

  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
  const zgIndexerRpc =
    process.env.ZG_INDEXER_RPC ||
    "https://indexer-storage-testnet-standard.0g.ai";
  const zgEvmRpc = process.env.ZG_EVM_RPC || "https://evmrpc-testnet.0g.ai/";

  console.log("[ChaosChain Init] Configuration:");
  console.log(`  ADMIN_PRIVATE_KEY: ${adminPrivateKey ? "SET" : "NOT SET"}`);
  console.log(`  AGENT_NFT_ADDRESS: ${AGENT_NFT_ADDRESS}`);
  console.log(`  ZG_INDEXER_RPC: ${zgIndexerRpc}`);
  console.log(`  ZG_EVM_RPC: ${zgEvmRpc}`);
  console.log(`  CHAOSCHAIN_DEBUG: ${process.env.CHAOSCHAIN_DEBUG || "false"}`);

  if (!adminPrivateKey) {
    console.warn(
      "[ChaosChain Init] ADMIN_PRIVATE_KEY not set. ChaosChain features disabled."
    );
    return;
  }

  console.log(
    "[ChaosChain Init] All required config present. Initializing service..."
  );

  initializeChaosChainService({
    operationsPrivateKey: adminPrivateKey,
    gameContractAddress: AGENT_NFT_ADDRESS,
    zgIndexerRpc,
    zgEvmRpc,
  });

  console.log("[ChaosChain Init] Service initialization complete!");
}

export const createAgentSystem = (components: NetworkComponents) => {
  const { TokenData } = components;

  const startAgent = async (tokenId: number) => {
    // If agent already exists, don't recreate
    if (agents.has(tokenId)) {
      return agents.get(tokenId)!;
    }

    // Create or get wallet for this agent
    let walletClient = agentWallets.get(tokenId);
    if (!walletClient) {
      console.log(`[Agent ${tokenId}] Creating new smart account...`);
      walletClient = await createOrGetAgentAccount(tokenId);
      agentWallets.set(tokenId, walletClient);
    }

    // Create storage manager for this agent
    console.log(`[Agent ${tokenId}] Creating storage manager...`);
    const storageManager = new AgentStorageManager(tokenId);
    agentStorageManagers.set(tokenId, storageManager);

    // Get agent type from token data (default to PAL)
    const tokenData = getComponentValue(
      TokenData,
      tokenId.toString() as Entity
    );
    const agentType: "PAL" | "TRAINER" = "PAL"; // Could be derived from tokenData if available

    // Register ChaosChain identity (async, non-blocking)
    // Derive deterministic private key for agent
    const seed =
      process.env.AGENT_SEED || "default-agent-seed-change-in-production";
    const seedBytes = toBytes(stringToHex(`${seed}-${tokenId}`));
    const agentPrivateKey = keccak256(seedBytes) as Hex;
    console.log(`[Agent ${tokenId}]   Agent type: ${agentType}`);
    console.log(
      `[Agent ${tokenId}] Starting ChaosChain identity registration (async)...`
    );
    registerAgentIdentity({
      agentPrivateKey,
      gameTokenId: tokenId,
      agentType,
    })
      .then((identity) => {
        console.log(
          `[Agent ${tokenId}] ChaosChain identity registration SUCCESS!`
        );
        console.log(
          `[Agent ${tokenId}]   ChaosChain Agent ID: ${identity.chaosAgentId}`
        );
        console.log(
          `[Agent ${tokenId}]   Registered at: ${new Date(identity.registeredAt).toISOString()}`
        );
      })
      .catch((err) => {
        console.error(
          `[Agent ${tokenId}] ChaosChain identity registration FAILED:`
        );
        console.error(`[Agent ${tokenId}]   Error:`, err);
        console.log(
          `[Agent ${tokenId}] Agent will continue running without ChaosChain features.`
        );
      });

    const agent = new PalAgent({
      id: tokenId,
      // model: "openai/gpt-5-nano",
      // model: "openai/gpt-5-nano",
      // model: "deepseek-r1",
      model: deepseek("deepseek-chat"),
      // model: "deepseek/deepseek-chat",
      // model: "google/gemini-2.5-flash", // OpenRouter/AiMo Network with Gemini (use google/ prefix)
      components,
      gameAddress: gameContractConfig.address,
      walletClient,
      storageManager,
    });
    agent.start();
    agents.set(tokenId, agent);
    return agent;
  };

  const stopAgent = (tokenId: number) => {
    const agent = agents.get(tokenId);
    if (agent) agent.stop();
    agents.delete(tokenId);
    agentStorageManagers.delete(tokenId);
    // Keep wallet in map for potential reuse, or remove if you want to clean up
    // agentWallets.delete(tokenId);
  };

  const stopAllAgents = () => {
    agents.forEach((agent) => agent.stop());
    agents.clear();
    agentStorageManagers.clear();
  };

  defineSystem(world, [Has(TokenData)], ({ entity, type }) => {
    // if exit, stop and delete agent; exit happens when proxy address changes or when last pal remaining?
    if (type === UpdateType.Exit) {
      stopAgent(Number(entity));
      return;
    }
    const tokenData = getComponentValue(TokenData, entity);
    if (!tokenData) return;
    const { health, tokenId, agentType } = tokenData;
    if (agentType !== AgentType.PAL) return;
    // if health == 0, stop and delete agent
    if (health === 0) {
      stopAgent(Number(tokenId));
      return;
    }
    // Start agent asynchronously (fire and forget)
    startAgent(Number(tokenId)).catch((error) => {
      console.error(`[Agent ${tokenId}] Failed to start agent:`, error);
    });
  });
};
