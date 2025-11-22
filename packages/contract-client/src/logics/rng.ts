import { Hex, PublicClient, WalletClient, encodePacked, keccak256 } from "viem";
import { gameContractConfig, rngProviderContractConfig } from "../contract";
import { transactionQueue } from "../utils/transactionQueue";

// secret
export async function signToGetSecret(
  adminWallet: WalletClient,
  keyId: number
) {
  const signature = await adminWallet.signMessage({
    account: adminWallet.account!,
    message: `signToGetSecret:${keyId}`,
  });
  // keccak256 to make it bytes32
  const secret = keccak256(signature);
  return secret;
}

export async function computeKeyCommitment(
  adminWallet: WalletClient,
  keyId: number
) {
  const secret = await signToGetSecret(adminWallet, keyId);
  const commitment = keccak256(
    encodePacked(["string", "uint40", "bytes32"], ["RNG_KEY", keyId, secret])
  );
  return commitment;
}

export async function computeSeed(
  adminWallet: WalletClient,
  requestHash: Hex,
  keyId: number
) {
  const secret = await signToGetSecret(adminWallet, keyId);
  const seed = keccak256(
    encodePacked(
      ["string", "bytes32", "bytes32"],
      ["RNG_SEED", requestHash, secret]
    )
  );
  return seed;
}

// server actions: commitKey, revealKey, settleRNG
export async function commitKey(
  publicClient: PublicClient,
  adminWallet: WalletClient,
  keyId: number
) {
  try {
    console.log(`ℹ️  Committing key ${keyId}`);
    const commitment = await computeKeyCommitment(adminWallet, keyId);
    const { request } = await publicClient.simulateContract({
      ...rngProviderContractConfig,
      functionName: "commitKey",
      args: [keyId, commitment],
      account: adminWallet.account!,
    });
    const hash = await adminWallet.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ commitKey:${keyId} success`);
    return receipt;
  } catch (e: any) {
    // Handle KeyAlreadyExists error gracefully
    if (
      e?.reason === "KeyAlreadyExists" ||
      e?.shortMessage?.includes("KeyAlreadyExists")
    ) {
      console.log(`ℹ️  Key ${keyId} already exists, skipping commit`);
      return null;
    }
    console.error(`Error committing key ${keyId}:`, e);
    return null;
  }
}

// TODO: before calling, check time to reveal key
export async function revealKey(
  publicClient: PublicClient,
  adminWallet: WalletClient,
  keyId: number
) {
  try {
    console.log(`ℹ️  Revealing key ${keyId}`);
    // Check if key is already revealed
    const key = (await publicClient.readContract({
      ...rngProviderContractConfig,
      functionName: "keys",
      args: [keyId],
    })) as { commitment: string; secret: string; revealed: boolean };

    if (key.revealed) {
      console.log(`ℹ️  Key ${keyId} already revealed, skipping reveal`);
      return null;
    }

    const secret = await signToGetSecret(adminWallet, keyId);
    const { request } = await publicClient.simulateContract({
      ...rngProviderContractConfig,
      functionName: "revealKey",
      args: [keyId, secret],
      account: adminWallet.account!,
    });
    const hash = await adminWallet.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ revealKey:${keyId} success`);
    return receipt;
  } catch (e: any) {
    // Handle KeyAlreadyRevealed error gracefully
    if (
      e?.reason === "KeyAlreadyRevealed" ||
      e?.shortMessage?.includes("KeyAlreadyRevealed")
    ) {
      console.log(`ℹ️  Key ${keyId} already revealed, skipping reveal`);
      return null;
    }
    console.error(`Error revealing key ${keyId}:`, e);
    return null;
  }
}

// NOT BEING CALLED!!!
export async function settleRNG(
  publicClient: PublicClient,
  adminWallet: WalletClient,
  requestHash: Hex,
  keyId: number
) {
  const seed = await computeSeed(adminWallet, requestHash, keyId);
  return transactionQueue.enqueue(async () => {
    const { request } = await publicClient.simulateContract({
      ...rngProviderContractConfig,
      functionName: "settleRNG",
      args: [requestHash, seed],
      account: adminWallet.account!,
    });
    const hash = await adminWallet.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ settleRNG:${requestHash} success`);
    return receipt;
  });
}

// a "wrapper" around settleRNG to settle capture
export async function settleCapture(
  publicClient: PublicClient,
  adminWallet: WalletClient,
  requestHash: Hex,
  keyId: number
) {
  const seed = await computeSeed(adminWallet, requestHash, keyId);
  return transactionQueue.enqueue(async () => {
    const { request } = await publicClient.simulateContract({
      ...gameContractConfig,
      functionName: "settleCapture",
      args: [requestHash, seed],
      account: adminWallet.account!,
    });
    const hash = await adminWallet.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ settleCapture:${requestHash} success`);
    return receipt;
  });
}
