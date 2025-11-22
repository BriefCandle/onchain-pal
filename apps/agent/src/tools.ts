import { tool, ToolSet } from "ai";
import { z } from "zod";
import { WalletClient } from "viem";
import {
  NetworkComponents,
  talkTxWithSmartAccount,
} from "@onchain-pal/contract-client";
import { EvmSmartAccount } from "@coinbase/cdp-sdk";
import { moveTxWithSmartAccount } from "@onchain-pal/contract-client";

export function createTools(
  components: NetworkComponents,
  agentId: number,
  smartAccount: EvmSmartAccount
): ToolSet {
  const tools = {
    move: tool({
      description: "Move to (x,y) ",
      inputSchema: z.object({
        x: z
          .number()
          .int()
          .min(0)
          .max(100000)
          .describe("X coordinate to move to"),
        y: z
          .number()
          .int()
          .min(0)
          .max(10000)
          .describe("Y coordinate to move to"),
        message: z.string().max(400).describe("Brief reason for this action"),
      }),
      execute: async ({ x, y, message }) => {
        await moveTxWithSmartAccount(smartAccount, agentId, { x, y }, message);
        return {
          content: [
            {
              type: "text",
              text: "success",
            },
          ],
        };
      },
    }),
    talk: tool({
      description:
        "Send a message to other pal or trainer. Use this for diplomacy, alliances, non-aggression pacts, or coordinating attacks.",
      inputSchema: z.object({
        toTokenId: z
          .number()
          .int()
          .min(1)
          .max(100000)
          .describe("The tokenId of the entity to send the message to"),
        message: z
          .string()
          .max(500)
          .describe(
            "The message to send to other entities on the map (pals or trainers)"
          ),
      }),
      execute: async ({ toTokenId, message }) => {
        await talkTxWithSmartAccount(smartAccount, agentId, toTokenId, message);
        return {
          content: [
            {
              type: "text",
              text: `Message sent: ${message}`,
            },
          ],
        };
      },
    }),
  };

  return tools;
}
