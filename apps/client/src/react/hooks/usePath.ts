import { NetworkComponents } from "@onchain-pal/contract-client";
import useRerender from "./useRerender";
import { getCurrPositionMUD } from "@onchain-pal/contract-client/logics";
import { useComponentValue } from "@latticexyz/react";
import { Entity } from "@latticexyz/recs";

export const useCurrPositionMUD = (
  components: NetworkComponents,
  tokenId: number
) => {
  useRerender();
  useComponentValue(components.TokenData, tokenId.toString() as Entity);
  const currCoord = getCurrPositionMUD(components, tokenId);
  return currCoord;
};
