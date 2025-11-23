import { Entity, getComponentValue, Has, runQuery } from "@latticexyz/recs";
import { NetworkComponents } from "../mud";
import { AgentType } from "../contract";
import { getCurrPositionMUD } from "./path";
import { distanceBetweenVectors, unixTimeSecond } from "../utils";
import { getTokenAllEventsTexts } from "./event";

export const getAgentContext = (
  components: NetworkComponents,
  agentId: number
) => {
  const { TokenData } = components;
  const yourContext = getTokenIdContext(components, agentId);
  const otherTokenIds = [...runQuery([Has(TokenData)])]
    .map(Number)
    .filter((tokenId) => tokenId !== agentId);
  const otherTokenContexts = otherTokenIds
    .map((tokenId) => {
      const context = getTokenIdContext(components, tokenId);
      const distance = getDistanceString(components, tokenId, agentId);
      return `${context}\n${distance}\n\n`;
    })
    .join("\n\n")
    .trim();

  const allEvents = getTokenAllEventsTexts(components, agentId)
    .map((event) => `Event: ${event}`)
    .join("\n\n")
    .trim();

  return `
  Your Info:\n\n${yourContext}\n\n
  Other Tokens Info:\n\n${otherTokenContexts}\n\n
  All Events for tokenId #${agentId}:\n\n${allEvents}`;
};

export const getDistanceString = (
  components: NetworkComponents,
  tokenId: number,
  agentId: number
) => {
  const tokenPos = getCurrPositionMUD(components, tokenId);
  const agentPos = getCurrPositionMUD(components, agentId);
  const distance =
    tokenPos && agentPos
      ? distanceBetweenVectors(tokenPos, agentPos).toFixed(1)
      : null;
  return `Distance from tokenId #${tokenId} to you (tokenId #${agentId}): ${distance ? `${distance}m` : "Unknown"}\n\n`.trim();
};

export const getTokenIdContext = (
  components: NetworkComponents,
  tokenId: number
) => {
  const { TokenData } = components;
  const tokenEntity = tokenId.toString() as Entity;
  const tokenData = getComponentValue(TokenData, tokenEntity);
  if (!tokenData) return null;
  const { owner, agentType, health } = tokenData;
  const agentTypeString = agentTypeToString(agentType);
  const positionString = getPositionString(components, tokenId);

  return `tokenId #${tokenId} Info:\n
   Agent Type: ${agentTypeString}\n
   Current Position: ${positionString}\n
   Health: ${health}\n
   Owner: ${owner}\n`.trim();
};

export const getPositionString = (
  components: NetworkComponents,
  tokenId: number
) => {
  const tokenEntity = tokenId.toString() as Entity;
  const currPosition = getCurrPositionMUD(components, tokenId);
  if (!currPosition) return "Unknown";
  const tokenData = getComponentValue(components.TokenData, tokenEntity);
  if (!tokenData) return "Unknown";
  const { x: currX, y: currY } = currPosition;
  const { fromX, fromY, toX, toY, duration, lastUpdated } = tokenData;
  const elapsedTime = unixTimeSecond() - lastUpdated;
  const timeLeft = duration > elapsedTime ? duration - elapsedTime : 0;
  let str;
  if (timeLeft > 0) {
    str = `Moving from (${currX}, ${currY}) to (${toX}, ${toY})in ${timeLeft} seconds`;
  } else {
    str = `Arrived at ${toX}, ${toY}`;
  }
  return str;
};

export const agentTypeToString = (agentType: number) => {
  switch (agentType) {
    case AgentType.PAL:
      return "PAL";
    case AgentType.TRAINER:
      return "TRAINER";
    default:
      return "UNKNOWN";
  }
};
