import { WalletClient, Hex } from "viem";
import { CdpSmartWalletProvider } from "@coinbase/agentkit";
import { CdpClient, EvmSmartAccount } from "@coinbase/cdp-sdk";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256, toBytes, stringToHex } from "viem";

/**
 * Creates a deterministic smart account for an agent using CDP Smart Wallet Provider
 * The smart account address is deterministic based on the agentId via idempotencyKey
 * @param agentId - The ID of the agent (used to generate deterministic account)
 * @returns The wallet client for the agent's smart account
 */
export async function createOrGetAgentAccount(
  agentId: number
): Promise<EvmSmartAccount> {
  // Get CDP configuration from environment variables
  // Support both the user's example format and the actual API format
  const apiKeyId = process.env.CDP_API_KEY_ID;
  const apiKeySecret = process.env.CDP_API_KEY_SECRET;
  const adminPk = process.env.ADMIN_PRIVATE_KEY;
  const paymasterUrl = process.env.CDP_PAYMASTER_URL;

  if (!apiKeyId || !apiKeySecret) {
    throw new Error(
      "CDP_API_KEY_ID (or CDP_API_KEY_NAME) and CDP_API_KEY_SECRET (or CDP_PRIVATE_KEY) environment variables are required"
    );
  }

  if (!adminPk) {
    throw new Error("ADMIN_PRIVATE_KEY environment variable is required");
  }

  if (!paymasterUrl) {
    throw new Error("CDP_PAYMASTER_URL environment variable is required");
  }

  console.log(`[Agent ${agentId}] Creating deterministic smart account...`);

  // Create a deterministic owner account for each agent
  // Each agent needs a unique owner, so we derive it from agentId
  // Using a seed ensures the same agentId always gets the same owner
  const seed =
    process.env.AGENT_SEED || "default-agent-seed-change-in-production";
  const seedBytes = toBytes(stringToHex(`${seed}-${agentId}`));
  const ownerPrivateKey = keccak256(seedBytes) as Hex;
  const owner = privateKeyToAccount(ownerPrivateKey);

  // Use deterministic smartAccountName based on owner address
  // This allows us to reference existing wallets by the deterministic owner
  const smartAccountName = `agent-test1-${agentId}`;

  const cdp = new CdpClient();

  const smartWalletProvider: EvmSmartAccount =
    await cdp.evm.getOrCreateSmartAccount({
      name: smartAccountName,
      owner: owner,
    });

  // Get the smart account address
  const agentAddress = smartWalletProvider.address;
  console.log(
    `[Agent ${agentId}] Created deterministic smart account: ${agentAddress}`
  );

  return smartWalletProvider;
}
