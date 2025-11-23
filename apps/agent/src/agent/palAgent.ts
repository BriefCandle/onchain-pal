import { LanguageModel } from "ai";
import { Address, PublicClient, WalletClient } from "viem";
import { Agent } from "./agent";
import { MessageStore } from "./store";
import { createTools } from "../tools";
import { NetworkComponents } from "@onchain-pal/contract-client";
import { Entity, getComponentValue } from "@latticexyz/recs";
import {} from "@onchain-pal/contract-client";
import { observe } from "./observe";
import { EvmSmartAccount } from "@coinbase/cdp-sdk";
import { AgentStorageManager } from "./services/storageManager";

export class PalAgent extends Agent {
  constructor({
    id,
    model,
    components,
    gameAddress,
    publicClient,
    walletClient,
    store,
    storageManager,
  }: {
    id: number;
    model: LanguageModel | string;
    components: NetworkComponents;
    gameAddress: string;
    publicClient?: PublicClient;
    walletClient?: EvmSmartAccount;
    store?: MessageStore;
    storageManager?: AgentStorageManager;
  }) {
    const agentInfo = getComponentValue(
      components.TokenData,
      id.toString() as Entity,
    );
    if (!agentInfo)
      throw new Error(`PalAgent: heroInfo not found for heroId ${id}`);

    if (!walletClient) {
      throw new Error(`PalAgent: walletClient is required for agent ${id}`);
    }

    const tools = createTools(components, id, walletClient);

    const system =
      ` call tools to move to a random coordinate with x between 0 and 10000 and y between 0 and 10000`.trim();

    super({
      id,
      model,
      system,
      store,
      tools: {
        move: tools.move,
        // talk tool is commented out in tools.ts
        // talk: tools.talk,
      },
      observe: async () => {
        const observations = observe({
          components,
          heroId: id,
        });
        return [
          {
            role: "user",
            content: observations,
          },
        ];
      },
      storageManager,
      components,
    });
  }
}
