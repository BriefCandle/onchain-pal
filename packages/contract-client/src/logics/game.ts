import { Entity, getComponentValue } from "@latticexyz/recs";
import { NetworkComponents } from "../mud";
import { Hex } from "viem";
import { unixTimeSecond } from "../utils";

export const isAlive = (components: NetworkComponents, tokenId: number) => {
  const health =
    getComponentValue(components.TokenData, tokenId.toString() as Entity)
      ?.health ?? 0;
  return health > 0;
};

export const canRevive = (components: NetworkComponents, tokenId: number) => {
  const lastDeadTime =
    getComponentValue(components.TokenData, tokenId.toString() as Entity)
      ?.lastDeadTime ?? 0;
  return lastDeadTime + 60 <= unixTimeSecond();
};

export const isTrainer = (components: NetworkComponents, tokenId: number) => {
  const agentType =
    getComponentValue(components.TokenData, tokenId.toString() as Entity)
      ?.agentType ?? 0;
  return agentType === 1;
};

export const isPal = (components: NetworkComponents, tokenId: number) => {
  const agentType =
    getComponentValue(components.TokenData, tokenId.toString() as Entity)
      ?.agentType ?? 0;
  return agentType === 2;
};

export const isSpawned = (components: NetworkComponents, tokenId: number) => {
  const lastUpdated =
    getComponentValue(components.TokenData, tokenId.toString() as Entity)
      ?.lastUpdated ?? 0;
  return lastUpdated > 0;
};

export const isNFTOwner = (
  components: NetworkComponents,
  tokenId: number,
  player: Hex
) => {
  const owner = getComponentValue(
    components.TokenData,
    tokenId.toString() as Entity
  )?.owner as Hex;
  return owner === player;
};
