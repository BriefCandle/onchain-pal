import "dotenv/config";
import { createOrGetAgentAccount } from "./agent/accountManager";

async function createAgentAccounts() {
  console.log("Starting to create agent accounts for IDs 1-100...");

  const errors: Array<{ agentId: number; error: string }> = [];
  const successes: number[] = [];

  for (let agentId = 1; agentId <= 100; agentId++) {
    try {
      console.log(`[${agentId}/100] Creating account for agent ${agentId}...`);
      await createOrGetAgentAccount(agentId);
      successes.push(agentId);
      console.log(
        `[${agentId}/100] ✓ Successfully created/retrieved account for agent ${agentId}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `[${agentId}/100] ✗ Failed to create account for agent ${agentId}:`,
        errorMessage
      );
      errors.push({ agentId, error: errorMessage });
    }

    // Add a small delay to avoid rate limiting
    if (agentId < 100) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Successfully created/retrieved: ${successes.length} accounts`);
  console.log(`Failed: ${errors.length} accounts`);

  if (errors.length > 0) {
    console.log("\nFailed agent IDs:");
    errors.forEach(({ agentId, error }) => {
      console.log(`  - Agent ${agentId}: ${error}`);
    });
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

createAgentAccounts().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
