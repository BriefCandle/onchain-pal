import { Abi, decodeEventLog } from "viem";

export interface ParsedEventLog {
  eventName: string;
  transactionHash: string;
  args: any;
  blockNumber: number;
}

export const parseEventLog = (
  log: any,
  signatureMap: Record<string, string>,
  abi: Abi
) => {
  try {
    // Get the event signature from topics[0]
    const eventSignature = log.topics[0];
    const eventName = signatureMap[eventSignature as keyof typeof signatureMap];

    if (!eventName) {
      console.warn(`Unknown event signature: ${eventSignature}`);
      return null;
    }

    // Decode the event log using viem
    const decodedLog = decodeEventLog({
      abi,
      data: log.data,
      topics: log.topics,
    });

    // Return the parsed log in the expected format
    return {
      eventName: decodedLog.eventName,
      transactionHash: log.transactionHash,
      args: decodedLog.args,
      blockNumber: Number(log.blockNumber),
    };
  } catch (error) {
    console.error("Error parsing log:", error);
    return null;
  }
};
