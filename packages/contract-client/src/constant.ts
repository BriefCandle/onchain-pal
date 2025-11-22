import { Entity } from "@latticexyz/recs";
import { toHex } from "viem";

export const tokenChunkSize = 150;
// refetch interval in seconds
export const refetchInterval = 3600;

export const monContextRange = 12;

export const eventStoreDuration = 3600; // 1 hour

export const WS_URL_AGENT = "ws://localhost:3001";

export const RNG_REQUEST_URL = "http://localhost:3003/requestRng";

export const SOURCE = toHex("SOURCE") as Entity;
export const TARGET = toHex("TARGET") as Entity;
