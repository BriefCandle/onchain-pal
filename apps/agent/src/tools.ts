import { tool, ToolSet } from "ai";
import { z } from "zod";
import { WalletClient } from "viem";
import {
  attackTx,
  attackTxWithSmartAccount,
  moveTx,
  NetworkComponents,
  talkTx,
  talkTxWithSmartAccount,
} from "@onchain-pal/contract-client";
import { EvmSmartAccount } from "@coinbase/cdp-sdk";
import { moveTxWithSmartAccount } from "@onchain-pal/contract-client";

export function createTools(
  components: NetworkComponents,
  agentId: number,
  smartAccount: EvmSmartAccount | WalletClient
): ToolSet {
  const tools = {
    move: tool({
      description:
        "Move to (x,y). Aim for a destination that is a distance of 10000 units from your current position. Movement happens along a path at a speed of 100 units per second. The movement is not instantaneous - it takes time to travel from your current position to the destination based on the distance and speed.",
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
          .max(100000)
          .describe("Y coordinate to move to"),
        message: z.string().max(400).describe("Brief reason for this action"),
      }),
      execute: async ({ x, y, message }) => {
        // if is smart wallet, use smart account, otherwise use wallet client
        if (smartAccount.type === "evm-smart") {
          await moveTxWithSmartAccount(
            smartAccount as EvmSmartAccount,
            agentId,
            { x, y },
            message
          );
        } else {
          await moveTx(
            smartAccount as WalletClient,
            agentId,
            { x, y },
            message
          );
        }
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
        if (smartAccount.type === "evm-smart") {
          await talkTxWithSmartAccount(
            smartAccount as EvmSmartAccount,
            agentId,
            toTokenId,
            message
          );
        } else {
          await talkTx(
            smartAccount as WalletClient,
            agentId,
            toTokenId,
            message
          );
        }
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
    attack: tool({
      description:
        "Attack another pal or trainer. Use this for aggression, defense, or to capture other tokens.",
      inputSchema: z.object({
        targetTokenId: z
          .number()
          .int()
          .min(1)
          .max(100000)
          .describe("The tokenId of the entity to attack"),
      }),
      execute: async ({ targetTokenId }) => {
        if (smartAccount.type === "evm-smart") {
          await attackTxWithSmartAccount(
            smartAccount as EvmSmartAccount,
            agentId,
            targetTokenId
          );
        } else {
          await attackTx(smartAccount as WalletClient, agentId, targetTokenId);
        }
        return {
          content: [
            {
              type: "text",
              text: `Attack sent: ${targetTokenId}`,
            },
          ],
        };
      },
    }),
  };

  return tools;
}
