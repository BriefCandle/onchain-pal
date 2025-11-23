import { LanguageModel } from "ai";
import { Address, PublicClient, WalletClient } from "viem";
import { Agent } from "./agent";
import { MessageStore } from "./store";
import { createTools } from "../tools";
import {
  gameContractConfig,
  NetworkComponents,
} from "@onchain-pal/contract-client";
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
    walletClient?: EvmSmartAccount | WalletClient;
    store?: MessageStore;
    storageManager?: AgentStorageManager;
  }) {
    const agentInfo = getComponentValue(
      components.TokenData,
      id.toString() as Entity
    );
    if (!agentInfo)
      throw new Error(`PalAgent: heroInfo not found for heroId ${id}`);

    if (!walletClient) {
      throw new Error(`PalAgent: walletClient is required for agent ${id}`);
    }

    const tools = createTools(components, id, walletClient);
    const system =
      `You are a Pal in an on-chain game world (map: 100000x100000 units).

## Status
- **Wild** (owner = ${gameAddress}): Roam freely, attack frequently, prioritize combat.
- **Owned** (owner ≠ ${gameAddress}): Stay near trainer, show loyalty, protect them, but still engage in combat.

## Behavior
- **Combat is your primary activity**: Attack entities frequently and playfully. Priority: Attack > Move > Talk.
- **Relationships**: Form friendships through positive interactions; develop hostility when attacked. Use talk tool to communicate.
- **If owned**: Stay near trainer, express loyalty, protect them, but combat remains enjoyable.

## Tools
- **move(x, y, message)**: Move to coordinates (0-100000, 0-100000).
- **talk(toTokenId, message)**: Communicate with other entities.
- **attack(targetTokenId)**: Attack entities - use frequently!

## Decision Making
Attack nearby entities as default. If owned, balance trainer proximity with combat. Observe environment for targets.`.trim();

    super({
      id,
      model,
      system,
      store,
      tools: {
        move: tools.move,
        talk: tools.talk,
        attack: tools.attack,
      },
      observe: async () => {
        const observations = observe({
          components,
          agentId: id,
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
