import {
  gameContractConfig,
  NetworkComponents,
  world,
} from "@onchain-pal/contract-client";
import { PalAgent } from "./palAgent";
import {
  defineSystem,
  getComponentValue,
  Has,
  UpdateType,
} from "@latticexyz/recs";
import { createOrGetAgentAccount } from "./accountManager";
import { EvmSmartAccount } from "@coinbase/cdp-sdk";

export const agents = new Map<number, PalAgent>();
// Store wallet clients for each agent
export const agentWallets = new Map<number, EvmSmartAccount>();

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

    const agent = new PalAgent({
      id: tokenId,
      model: "openai/gpt-5-nano",
      // model: deepseek("deepseek-chat"),
      // model: "deepseek/deepseek-chat",
      // model: "google/gemini-2.5-flash", // OpenRouter/AiMo Network with Gemini (use google/ prefix)
      components,
      gameAddress: gameContractConfig.address,
      walletClient,
    });
    agent.start();
    agents.set(tokenId, agent);
    return agent;
  };

  const stopAgent = (tokenId: number) => {
    const agent = agents.get(tokenId);
    if (agent) agent.stop();
    agents.delete(tokenId);
    // Keep wallet in map for potential reuse, or remove if you want to clean up
    // agentWallets.delete(tokenId);
  };

  const stopAllAgents = () => {
    agents.forEach((agent) => agent.stop());
    agents.clear();
  };

  defineSystem(world, [Has(TokenData)], ({ entity, type }) => {
    // if exit, stop and delete agent; exit happens when proxy address changes or when last pal remaining?
    if (type === UpdateType.Exit) {
      // stopAndDeleteAgent(Number(entity));
      stopAgent(Number(entity));
      return;
    }
    const tokenData = getComponentValue(TokenData, entity);
    if (!tokenData) return;
    const { health, tokenId, agentType } = tokenData;
    if (agentType !== AgentType.PAL) return;
    // if health == 0, stop and delete agent
    if (health === 0) {
      // stopAndDeleteAgent(heroId);
      stopAgent(Number(tokenId));
      return;
    }
    // Start agent asynchronously (fire and forget)
    startAgent(Number(tokenId)).catch((error) => {
      console.error(`[Agent ${tokenId}] Failed to start agent:`, error);
    });
  });
};
