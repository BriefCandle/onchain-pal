import { Entity } from "@latticexyz/recs";
import { getAddress, Hex, isAddress } from "viem";
import { hexToString as viemHexToString } from "viem";

export function formatNumber(n: number, decimals: number = 1) {
  if (n < 1e3) {
    return String(round(n, decimals));
  } else if (n < 1e6) {
    return round(n / 1e3, decimals) + "k";
  } else if (n < 1e9) {
    return round(n / 1e6, decimals) + "M";
  } else if (n < 1e12) {
    return round(n / 1e9, decimals) + "B";
  } else if (n < 1e15) {
    return round(n / 1e12, decimals) + "T";
  } else {
    return round(n / 1e15, decimals) + "Q";
  }
}

export function formatWadNumber(
  n: bigint | number,
  decimals: bigint | number = 1
) {
  return formatNumber(Number(n) / 1e18, Number(decimals));
}

function round(n: number, decimals: number = 1) {
  return Number(n.toFixed(decimals));
}

export function formatDuration(duration: number) {
  const seconds = Math.floor(duration % 60);
  const minutes = Math.floor((duration / 60) % 60);
  const hours = Math.floor((duration / 3600) % 24);
  const days = Math.floor(duration / 86400);

  const parts = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0 || parts.length) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || parts.length) {
    parts.push(`${minutes}m`);
  }
  parts.push(`${seconds}s`);
  return parts.join("");
}

export function truncateAddress(
  address: string,
  head: number = 6,
  tail: number = 6
) {
  return `${address.slice(0, head)}...${address.slice(-tail)}`;
}

export function truncateBytes32(
  value: string,
  head: number = 4,
  tail: number = 6
) {
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

// // Combine two uint32 into one uint64
// export function combine(x: number, y: number) {
//   return (BigInt(x) << BigInt(32)) | BigInt(y);
// }

// export function combineToEntity(x: number, y: number) {
//   return combine(x, y).toString() as Entity;
// }

// // Split one uint64 into two uint32
// export function split(xy: bigint) {
//   const x = Number(xy >> BigInt(32));
//   const y = Number(xy & BigInt(0xffffffff));
//   return { x, y };
// }

// export function splitFromEntity(entity: Entity) {
//   return split(BigInt(entity));
// }

// Custom hexToString that properly cleans null bytes
export function hexToString(hex: Hex | string): string {
  const viemStr = viemHexToString(hex as Hex);
  // Remove null bytes and any other non-printable characters at the end
  return viemStr.replace(/\0+$/, "").replace(/[^\x20-\x7E]+$/g, "");
}

// Safe address checksumming that won't crash the frontend
export const safeGetAddress = (address: string): string => {
  try {
    if (!isAddress(address)) {
      console.warn(`Invalid address format: ${address}`);
      return address; // Return original if invalid
    }
    return getAddress(address);
  } catch (error) {
    console.error(`Error checksumming address ${address}:`, error);
    return address; // Return original if checksumming fails
  }
};

// Helper function to serialize BigInt values
export function serializeForJSON(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === "bigint") {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeForJSON);
  }
  if (typeof obj === "object") {
    const result: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = serializeForJSON(obj[key]);
      }
    }
    return result;
  }
  return obj;
}
