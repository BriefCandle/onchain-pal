import { NetworkComponents } from "@onchain-pal/contract-client";

export function observe({
  components,
  heroId,
}: {
  components: NetworkComponents;
  heroId: number;
}) {
  // const heroContext = getHeroSurroundingContext(components, heroId);
  // if (!heroContext) {
  //   return [];
  // }
  // const {
  //   heroDataText,
  //   reachableCoordsText,
  //   adjacentHeroesText,
  //   nearbyItemsText,
  // } = heroContext;
  // const prevEventsContext = getHeroAllEventsTexts(components, heroId);
  // const remainedHeroCount = getHeroCount(components.HeroData);
  // const safeZoneContext = getHeroSafeZoneContext(components);
  // const currentBlockNumberContext = getCurrentBlockNumberContext(components);

  //   const observations = `
  // YOUR CHARACTER HISTORY & INTERACTIONS with other heroes (Learn from this to shape your personality) (more weights given to more recent events with higher block number):\n${prevEventsContext}
  // YOUR STATUS:\n${heroDataText}
  // Nearby Heroes:\n- ${adjacentHeroesText}
  // Reachable Coords (you can move to ANY of these coordinates in ONE action - choose the best one for your strategy):\n- ${reachableCoordsText}
  // Nearby Items:\n- ${nearbyItemsText}
  // Safe Zone:\n- ${safeZoneContext}
  // Current Block Number:\n- ${currentBlockNumberContext}
  // Remained Hero Count:\n- ${remainedHeroCount}
  //   `
  const observations = ``.trim();
  return observations;
}
