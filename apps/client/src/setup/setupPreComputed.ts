import { Hex } from "viem";
import { ClientComponents } from "../mud/createClientComponents";
import {
  getCurrPositionMUD,
  getPlayerTokenIds,
  getPlayerTrainerIds,
  SOURCE,
} from "@onchain-pal/contract-client";
import {
  defineEnterSystem,
  defineSystem,
  Entity,
  getComponentValue,
  Has,
  setComponent,
  UpdateType,
  World,
} from "@latticexyz/recs";

export const setupPreComputed = (
  components: ClientComponents,
  world: World,
  playerAddress?: Hex
) => {
  // Note: playerAddress should be passed in from useCDPWallet when available
  if (!playerAddress) return;

  const { SelectedTrainer, TokenData } = components;
  const trainerIds = getPlayerTrainerIds(components, playerAddress);
  if (!!trainerIds && trainerIds.length > 0) {
    // const currPos = getCurrPositionMUD(components, trainerIds[0]);
    const tokenId = trainerIds[0];
    setComponent(SelectedTrainer, SOURCE, { tokenId });
  }
};

export const syncPlayerTrainer = (
  components: ClientComponents,
  world: World,
  playerAddress: Hex
) => {
  const { SelectedTrainer, TokenData } = components;

  defineEnterSystem(world, [Has(TokenData)], ({ entity }) => {
    const tokenData = getComponentValue(TokenData, entity)!;
    console.log("tokenData", tokenData, playerAddress);
    if (tokenData.owner !== playerAddress) return;
    setComponent(SelectedTrainer, SOURCE, {
      tokenId: Number(tokenData.tokenId),
    });
  });
};
