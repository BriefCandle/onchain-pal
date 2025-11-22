import { Hex } from "viem";
import { ClientComponents } from "../mud/createClientComponents";
import { adminClient } from "../react/actions/Move";
import {
  getCurrPositionMUD,
  getPlayerTokenIds,
  getPlayerTrainerIds,
  SOURCE,
} from "@onchain-pal/contract-client";
import { Entity, getComponentValue, setComponent } from "@latticexyz/recs";

export const setupPreComputed = (
  components: ClientComponents,
  playerAddress?: Hex
) => {
  playerAddress = playerAddress ?? (adminClient?.account.address as Hex);
  const { SelectedTrainer, TokenData } = components;
  const trainerIds = getPlayerTrainerIds(components, playerAddress);
  if (!!trainerIds && trainerIds.length > 0) {
    // const currPos = getCurrPositionMUD(components, trainerIds[0]);
    const tokenId = trainerIds[0];
    setComponent(SelectedTrainer, SOURCE, { tokenId });
  }
};
