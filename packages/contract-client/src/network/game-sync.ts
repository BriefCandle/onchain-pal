import { agentNFTContractConfig, gameContractConfig } from "../contract";
import { ParsedEventLog, parseEventLog } from "../utils/parseEvent";
import {
  AttackedEventData,
  defaultTokenDataFLAT,
  gameEventSignatures,
  PathUpdatedEventData,
  TokenDataFlat,
  CaptureAttemptedEventData,
  CaptureSettledEventData,
  TokenData,
  PathUpdatedEventFlatData,
  SpawnedEventData,
  flattenTokenData,
  DefeatedEventData,
  RevivedEventData,
} from "../contract/types";
import { Hex, PublicClient } from "viem";
import { readContract } from "viem/actions";
import { tokenChunkSize } from "../constant";
import { ClientComponents, NetworkComponents } from "../mud";
import { Entity, getComponentValue, setComponent } from "@latticexyz/recs";
import { safeGetAddress } from "../utils";

export async function syncGameMUD(
  components: NetworkComponents,
  publicClient: PublicClient
) {
  await fetchAndSetAllPalData(components, publicClient);
  const gameEventUnwatch = watchAllGameEvents(components, publicClient);
  return gameEventUnwatch;
}

export async function fetchAndSetAllPalData(
  components: NetworkComponents,
  publicClient: PublicClient,
  onProgress?: (progress: number) => void
) {
  const palDataMap = await fetchAllPalData(publicClient);
  Object.entries(palDataMap).forEach(([tokenId, palData]) => {
    setTokenData(components.TokenData, palData);
  });
}
// ----------- fetch all hero data from contract -----------
export async function fetchAllPalData(
  publicClient: PublicClient,
  onProgress?: (progress: number) => void
) {
  const tokenCount = (await readContract(publicClient, {
    ...agentNFTContractConfig,
    functionName: "tokenCount",
  })) as bigint;

  const totalTokens = Number(tokenCount);
  const chunks = Math.ceil(Number(totalTokens) / tokenChunkSize);
  const newPalDataMap: Record<number, TokenDataFlat> = {};

  for (let i = 0; i < chunks; i++) {
    const start = i * tokenChunkSize + 1;
    const count = Math.min(tokenChunkSize, totalTokens - start + 1);
    const data = await readContract(publicClient, {
      ...gameContractConfig,
      functionName: "getTokensData",
      args: [start, count],
    });

    const palInfos = data as unknown as TokenData[];
    if (palInfos && Array.isArray(palInfos)) {
      palInfos.forEach((palInfo) => {
        const { tokenId, statsData, pathData, agentData, timeData } = palInfo;
        newPalDataMap[Number(tokenId)] = {
          tokenId,
          ...statsData,
          ...pathData,
          ...agentData,
          ...timeData,
        };
      });
    }
  }
  return newPalDataMap;
}

export const watchAllGameEvents = (
  components: NetworkComponents,
  publicClient: PublicClient,
  address: Hex = gameContractConfig.address
) => {
  return publicClient.watchEvent({
    address,
    onLogs: (logs) => {
      for (const log of logs) {
        const parsedLog = parseGameEventLog(log);
        if (parsedLog) {
          const eventName = parsedLog.eventName;
          handleGameEvent(components, parsedLog as unknown as ParsedEventLog);
        }
      }
    },
  });
};

export const handleGameEvent = (
  components: NetworkComponents,
  parsedLog: ParsedEventLog,
  skipDataEvents: boolean = false
) => {
  const {
    TokenData,
    PathUpdatedFlatEvent,
    AttackedEvent,
    CaptureAttemptedEvent,
    CaptureSettledEvent,
    SpawnedEvent,
    RevivedEvent,
    DefeatedEvent,
  } = components;
  const { eventName, transactionHash: tx, args, blockNumber } = parsedLog;
  if (eventName === "PathUpdated") {
    const data = args as unknown as PathUpdatedEventData;
    const { tokenId, pathData } = data;
    const flatData: PathUpdatedEventFlatData = { tokenId, ...pathData };
    setTokenData(TokenData, flatData);
    setComponent(PathUpdatedFlatEvent, tx as Entity, flatData);
  } else if (eventName === "Attacked") {
    const data = args as unknown as AttackedEventData;
    console.log("Attacked event received", data);
    setComponent(AttackedEvent, tx as Entity, data);
  } else if (eventName === "CaptureAttempted") {
    const data = args as unknown as CaptureAttemptedEventData;
    console.log("CaptureAttempted event received", data);
    setComponent(CaptureAttemptedEvent, tx as Entity, data);
  } else if (eventName === "CaptureSettled") {
    const data = args as unknown as CaptureSettledEventData;
    console.log("CaptureSettled event received", data);
    setComponent(CaptureSettledEvent, tx as Entity, data);
  } else if (eventName === "Spawned") {
    const data = args as unknown as SpawnedEventData;
    const flatData = data.tokenDataFlat;
    setTokenData(TokenData, flatData);
    console.log("Spawned event received", flatData);
    setComponent(SpawnedEvent, tx as Entity, flatData);
  } else if (eventName === "Defeated") {
    const data = args as unknown as DefeatedEventData;
    setTokenData(TokenData, data);
    console.log("Defeated event received", data);
    setComponent(DefeatedEvent, tx as Entity, data);
  } else if (eventName === "Revived") {
    const data = args as unknown as RevivedEventData;
    setTokenData(TokenData, data);
    console.log("Revived event received", data);
    setComponent(RevivedEvent, tx as Entity, data);
  }
};

export const setTokenData = (
  tokenComponent: ClientComponents["TokenData"],
  tokenData: Partial<TokenDataFlat>
) => {
  const { tokenId } = tokenData;
  if (!tokenId) return;
  const tokenEntity = tokenId.toString() as Entity;
  const prev = getComponentValue(tokenComponent, tokenEntity);
  const updated = {
    ...(prev ?? defaultTokenDataFLAT),
    ...tokenData,
  };
  // need deep comparison??
  setComponent(tokenComponent, tokenEntity, updated);
};

export const parseGameEventLog = (log: any) => {
  return parseEventLog(log, gameEventSignatures, gameContractConfig.abi);
};
