import { Hex, PublicClient, WalletClient } from "viem";
import {
  rngEventSignatures,
  rngProviderContractConfig,
  RNGRequestedEventData,
} from "../contract";
import { NetworkComponents } from "../mud";
import { ParsedEventLog, parseEventLog } from "../utils/parseEvent";
import { settleCapture, commitKey, revealKey } from "../logics/rng";

export const watchRNGRequestedEvents = (
  publicClient: PublicClient,
  adminWallet: WalletClient,
  address: Hex = rngProviderContractConfig.address
) => {
  return publicClient.watchEvent({
    address,
    onLogs: async (logs) => {
      for (const log of logs) {
        const parsedLog = parseRNGEventLog(log);
        if (parsedLog) {
          const eventName = parsedLog.eventName;
          if (eventName === "RNGRequested") {
            const { requestHash, keyId } =
              parsedLog.args as any as RNGRequestedEventData;
            await settleCapture(
              publicClient,
              adminWallet,
              requestHash as Hex,
              keyId
            );
          }
        }
      }
    },
  });
};

export const parseRNGEventLog = (log: any) => {
  return parseEventLog(log, rngEventSignatures, rngProviderContractConfig.abi);
};

export const COMMIT_BUFFER_INTERVAL = 5; //  3n * 3600n;
export const REVEAL_BUFFER_INTERVAL = 5; // 2n * 3600n;

// Check and commit the next key if needed
async function checkAndCommitNextKey(
  publicClient: PublicClient,
  adminWallet: WalletClient
) {
  try {
    const result = (await publicClient.readContract({
      ...rngProviderContractConfig,
      functionName: "getNextKeyStartTime",
    })) as [number, number, boolean];

    const [nextStartTime, nextKeyId, hasKey] = result;

    const currentTime = Math.floor(Date.now() / 1000);
    const shouldCommit =
      nextStartTime <= currentTime + COMMIT_BUFFER_INTERVAL && !hasKey;
    console.log("next key: ", nextStartTime, nextKeyId, hasKey);

    if (shouldCommit) {
      console.log(
        `⏰ Time to commit next key: keyId=${nextKeyId}, nextStartTime=${nextStartTime}`
      );
      await commitKey(publicClient, adminWallet, nextKeyId);
    }
  } catch (error) {
    console.error("Error checking/committing next key:", error);
  }
}

// Check and reveal the previous key if needed
async function checkAndRevealPreviousKey(
  publicClient: PublicClient,
  adminWallet: WalletClient
) {
  try {
    const result = (await publicClient.readContract({
      ...rngProviderContractConfig,
      functionName: "getPrevKeyEndTime",
    })) as [number, number, boolean];

    const [prevKeyEndTime, prevKeyId, revealed] = result;

    const currentTime = Math.floor(Date.now() / 1000);
    const shouldReveal =
      prevKeyEndTime + REVEAL_BUFFER_INTERVAL <= currentTime &&
      prevKeyId > 0 &&
      !revealed;

    if (shouldReveal) {
      console.log(
        `⏰ Time to reveal previous key: keyId=${prevKeyId}, prevKeyId=${prevKeyId}`
      );
      await revealKey(publicClient, adminWallet, prevKeyId);
    }
  } catch (error) {
    console.error("Error checking/revealing previous key:", error);
  }
}

// Start interval checks for commitKey and revealKey
export const startRNGKeyManagement = (
  publicClient: PublicClient,
  adminWallet: WalletClient,
  intervalMs: number = 60 * 60 * 1000 // Default: 1 hour
) => {
  console.log(
    `🔄 Starting RNG key management with ${intervalMs / 1000}s interval`
  );

  // Run immediately on start
  checkAndCommitNextKey(publicClient, adminWallet);
  checkAndRevealPreviousKey(publicClient, adminWallet);

  // Set up interval
  const interval = setInterval(() => {
    checkAndCommitNextKey(publicClient, adminWallet);
    checkAndRevealPreviousKey(publicClient, adminWallet);
  }, intervalMs);

  // Return cleanup function
  return () => {
    clearInterval(interval);
    console.log("🛑 Stopped RNG key management");
  };
};
