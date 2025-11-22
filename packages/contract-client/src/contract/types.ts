import { toHex } from "viem";
import { keccak256 } from "viem";

export interface AgentData {
  owner: string;
  agentType: number;
}

export enum AgentType {
  NONE = 0,
  PAL = 1,
  TRAINER = 2,
}

export interface StatsData {
  health: number;
}

export interface TimeData {
  lastDeadTime: number;
}

export interface PathData {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  lastUpdated: number;
  duration: number;
}

export interface CaptureAttemptData {
  playerAddress: string;
  targetTokenId: bigint;
}

export interface TokenData {
  tokenId: bigint;
  statsData: StatsData;
  pathData: PathData;
  agentData: AgentData;
  timeData: TimeData;
}

export interface TokenDataFlat {
  tokenId: bigint;
  // statsData
  health: number;
  // pathData
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  lastUpdated: number;
  duration: number;
  // agentData
  owner: string;
  agentType: number;
  // timeData
  lastDeadTime: number;
}

export const flattenTokenData = (tokenData: TokenData): TokenDataFlat => {
  const { statsData, pathData, agentData, timeData } = tokenData;
  return {
    tokenId: tokenData.tokenId,
    ...statsData,
    ...pathData,
    ...agentData,
    ...timeData,
  };
};

export const defaultTokenDataFLAT: TokenDataFlat = {
  tokenId: 0n,
  owner: "",
  agentType: 0,
  health: 0,
  fromX: 0,
  fromY: 0,
  toX: 0,
  toY: 0,
  lastUpdated: 0,
  duration: 0,
  lastDeadTime: 0,
};

export interface SpawnedEventData {
  tokenId: bigint;
  tokenDataFlat: TokenDataFlat;
}

export interface SpawnedEventFlatData extends TokenDataFlat {}

export interface DefeatedEventData {
  tokenId: bigint;
  lastDeadTime: number;
}

export interface RevivedEventData {
  tokenId: bigint;
  health: number;
}

export interface PathUpdatedEventData {
  tokenId: bigint;
  pathData: PathData;
}

export interface PathUpdatedEventFlatData {
  tokenId: bigint;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  lastUpdated: number;
  duration: number;
}

export interface AttackedEventData {
  attackerTokenId: bigint;
  targetTokenId: bigint;
  inRange: boolean;
  defeated: boolean;
}

export interface CaptureAttemptedEventData {
  attackerTokenId: bigint;
  targetTokenId: bigint;
  inRange: boolean;
}

export interface CaptureSettledEventData {
  targetTokenId: bigint;
  playerAddress: string;
  caught: boolean;
}

export interface RevivedEventData {
  tokenId: bigint;
}

export interface RNGRequestedEventData {
  requestHash: string;
  requestTime: number;
  keyId: number;
}

export const rngEventSignatures = {
  [keccak256(toHex("KeyCommitted(uint40,bytes32)"))]: "KeyCommitted",
  [keccak256(toHex("KeyRevealed(uint40,bytes32)"))]: "KeyRevealed",
  [keccak256(toHex("RNGRequested(bytes32,uint40,uint40)"))]: "RNGRequested",
  [keccak256(toHex("RNGSettled(bytes32,bytes32,bytes32)"))]: "RNGSettled",
} as const;

const statsDataStruct = "uint32" as const;
const pathDataStruct = "uint32,uint32,uint32,uint32,uint40,uint40" as const;
const agentDataStruct = "address,uint8" as const;
const timeDataStruct = "uint40" as const;

// TokenData flattened: tokenId(uint256) + statsData(uint32) + pathData(6 fields) + agentData(3 fields) + timeData(3 fields)
const tokenDataFlatStruct = `uint256,${statsDataStruct},${pathDataStruct},${agentDataStruct},${timeDataStruct}`;

export const gameEventSignatures = {
  [keccak256(toHex(`PathUpdated(uint256,(${pathDataStruct}))`))]: "PathUpdated",
  [keccak256(toHex("Attacked(uint256,uint256,bool,bool)"))]: "Attacked",
  [keccak256(toHex(`Spawned(uint256,(${tokenDataFlatStruct}))`))]: "Spawned",
  [keccak256(toHex("CaptureAttempted(uint256,uint256,bool)"))]:
    "CaptureAttempted",
  [keccak256(toHex("CaptureSettled(uint256,address,bool)"))]: "CaptureSettled",
  [keccak256(toHex("Revived(uint256,uint32)"))]: "Revived",
  [keccak256(toHex("Defeated(uint256,uint40)"))]: "Defeated",
} as const;
