import {
  Entity,
  getComponentValue,
  HasValue,
  runQuery,
} from "@latticexyz/recs";
import { NetworkComponents } from "../mud";
import { Hex } from "viem";
import { AgentType } from "../contract/types";

export const getPlayerTokenIds = (
  components: NetworkComponents,
  playerAddress: Hex
): number[] | undefined => {
  const { TokenData } = components;
  const tokenIds = [
    ...runQuery([HasValue(TokenData, { owner: playerAddress })]),
  ];
  if (tokenIds.length === 0) return undefined;
  return tokenIds.map(Number);
};

export const getPlayerTrainerIds = (
  components: NetworkComponents,
  playerAddress: Hex
): number[] | undefined => {
  const tokenIds = getPlayerTokenIds(components, playerAddress);
  if (!tokenIds || tokenIds.length === 0) return;
  return tokenIds.filter((tokenId) => {
    const agentType = getComponentValue(
      components.TokenData,
      tokenId.toString() as Entity
    )!.agentType;
    return agentType === AgentType.TRAINER;
  });
};
