import { createRequire } from "module";
import { Wallet } from "ethers";
import { ZeroGStorageProvider } from "./zeroGStorage";

// Force CJS import to avoid ESM bundling issues with @chaoschain/sdk
// The SDK's ESM build has broken dynamic require shims for its dependencies
const require = createRequire(import.meta.url);
const { ChaosChainSDK, NetworkConfig, AgentRole } = require("@chaoschain/sdk");

// ============================================
// Logging Configuration
// ============================================

const LOG_PREFIX = "[ChaosChain]";
const DEBUG = process.env.CHAOSCHAIN_DEBUG === "true";

function logDebug(...args: unknown[]): void {
  if (DEBUG) {
    console.log(LOG_PREFIX, "[DEBUG]", ...args);
  }
}

function logInfo(...args: unknown[]): void {
  console.log(LOG_PREFIX, "[INFO]", ...args);
}

function logWarn(...args: unknown[]): void {
  console.warn(LOG_PREFIX, "[WARN]", ...args);
}

function logError(...args: unknown[]): void {
  console.error(LOG_PREFIX, "[ERROR]", ...args);
}
import type {
  ChaosChainServiceConfig,
  AgentIdentityConfig,
  ChaosIdentity,
  StorageReference,
  AgentLogEntry,
  AgentLogBatch,
} from "../types/chaoschain";

// ============================================
// Service State
// ============================================

/** In-memory registry: gameTokenId -> ChaosIdentity */
const identityRegistry = new Map<number, ChaosIdentity>();

/** In-memory registry: gameTokenId -> SDK instance */
const sdkRegistry = new Map<number, InstanceType<typeof ChaosChainSDK>>();

/** In-memory storage refs: gameTokenId -> storage references */
const storageRefs = new Map<number, StorageReference[]>();

/** In-flight registrations: gameTokenId -> Promise (guards against race conditions) */
const pendingRegistrations = new Map<number, Promise<ChaosIdentity>>();

/** Shared operations wallet for storage fees */
let operationsWallet: Wallet | null = null;

/** 0G Storage provider instance */
let zeroGStorage: ZeroGStorageProvider | null = null;

/** Service configuration */
let serviceConfig: ChaosChainServiceConfig | null = null;

/** Service initialization flag */
let serviceInitialized = false;

// ============================================
// Initialization
// ============================================

export function initializeChaosChainService(
  config: ChaosChainServiceConfig,
): void {
  // Guard against re-initialization
  if (serviceInitialized) {
    logWarn(
      "ChaosChain service already initialized. Skipping re-initialization.",
    );
    return;
  }

  logInfo("Initializing ChaosChain service...");
  logDebug("Config:", {
    gameContractAddress: config.gameContractAddress,
    zgIndexerRpc: config.zgIndexerRpc,
    operationsPrivateKey: config.operationsPrivateKey
      ? "[REDACTED]"
      : "NOT SET",
  });

  serviceConfig = config;
  operationsWallet = new Wallet(config.operationsPrivateKey);

  // Initialize 0G Storage provider
  zeroGStorage = new ZeroGStorageProvider({
    indexerRpc: config.zgIndexerRpc,
    evmRpc: config.zgEvmRpc,
    privateKey: config.operationsPrivateKey,
  });

  serviceInitialized = true;

  logInfo("Service initialized successfully!");
  logInfo(`  Operations wallet: ${operationsWallet.address}`);
  logInfo(`  Game contract: ${config.gameContractAddress}`);
  logInfo(`  0G Indexer RPC: ${config.zgIndexerRpc}`);
}

// ============================================
// Identity Management
// ============================================

/**
 * Register a new agent identity on ChaosChain.
 * The agent's CDP smart account will own the ERC-8004 identity NFT.
 * Only registers once per agent - returns existing identity if already registered.
 * Guards against race conditions with concurrent registration attempts.
 */
export async function registerAgentIdentity(
  config: AgentIdentityConfig,
): Promise<ChaosIdentity> {
  logInfo(`[Token ${config.gameTokenId}] Starting identity registration...`);
  logDebug(`[Token ${config.gameTokenId}] Agent type: ${config.agentType}`);
  logDebug(
    `[Token ${config.gameTokenId}] Private key provided: ${config.agentPrivateKey ? "YES" : "NO"}`,
  );

  // Check if already registered - only register once per agent
  const existingIdentity = identityRegistry.get(config.gameTokenId);
  if (existingIdentity) {
    logInfo(
      `[Token ${config.gameTokenId}] Already registered with ChaosChain Agent ID: ${existingIdentity.chaosAgentId}. Skipping registration.`,
    );
    return existingIdentity;
  }

  // Check if registration is already in progress (race condition guard)
  const pendingRegistration = pendingRegistrations.get(config.gameTokenId);
  if (pendingRegistration) {
    logInfo(
      `[Token ${config.gameTokenId}] Registration already in progress. Waiting for existing registration...`,
    );
    return pendingRegistration;
  }

  // Create and store the registration promise to prevent concurrent registrations
  const registrationPromise = performRegistration(config);
  pendingRegistrations.set(config.gameTokenId, registrationPromise);

  try {
    const identity = await registrationPromise;
    return identity;
  } finally {
    // Always clean up pending registration, whether success or failure
    pendingRegistrations.delete(config.gameTokenId);
  }
}

/**
 * Internal function that performs the actual registration.
 * Separated to allow proper promise tracking for race condition prevention.
 */
async function performRegistration(
  config: AgentIdentityConfig,
): Promise<ChaosIdentity> {
  if (!serviceConfig) {
    logError(
      `[Token ${config.gameTokenId}] Service not initialized! Cannot register identity.`,
    );
    throw new Error("ChaosChain service not initialized");
  }

  // Create SDK instance with agent's private key (agent owns identity)
  logDebug(`[Token ${config.gameTokenId}] Creating ChaosChainSDK instance...`);
  const sdkConfig = {
    agentName: `OnchainPal #${config.gameTokenId}`,
    agentDomain: `onchainpal-${config.gameTokenId}.agent`,
    agentRole: AgentRole.SERVER,
    network: NetworkConfig.BASE_SEPOLIA,
    privateKey: config.agentPrivateKey,
    enablePayments: false,
    enableStorage: true,
  };
  logDebug(`[Token ${config.gameTokenId}] SDK config:`, {
    ...sdkConfig,
    privateKey: "[REDACTED]",
  });

  const sdk = new ChaosChainSDK(sdkConfig);
  logInfo(`[Token ${config.gameTokenId}] SDK instance created successfully`);

  // Track if on-chain registration succeeded (for cleanup on partial failure)
  let agentId: string | null = null;

  try {
    // Register ERC-8004 identity (owned by agent's smart account)
    logInfo(
      `[Token ${config.gameTokenId}] Registering ERC-8004 identity on-chain...`,
    );
    const startTime = Date.now();
    const result = await sdk.registerIdentity();
    agentId = result.agentId;
    const registrationDuration = Date.now() - startTime;
    logInfo(
      `[Token ${config.gameTokenId}] Identity registered! Agent ID: ${agentId} (took ${registrationDuration}ms)`,
    );

    // Store SDK immediately after successful on-chain registration
    // This ensures we don't lose the SDK reference if metadata update fails
    sdkRegistry.set(config.gameTokenId, sdk);

    // Store cross-reference metadata linking to game NFT
    logInfo(`[Token ${config.gameTokenId}] Updating agent metadata...`);
    const metadata = {
      name: `OnchainPal #${config.gameTokenId}`,
      description: `OnchainPal game agent - ${config.agentType}`,
      capabilities: ["game_agent", config.agentType.toLowerCase()],
      supportedTrust: ["reputation"],
      // Custom fields for cross-referencing
      gameContract: serviceConfig!.gameContractAddress,
      gameTokenId: config.gameTokenId.toString(),
      gameAgentType: config.agentType,
      gameNetwork: "base-sepolia",
    };
    logDebug(`[Token ${config.gameTokenId}] Metadata:`, metadata);

    const metadataStartTime = Date.now();
    await sdk.updateAgentMetadata(BigInt(agentId!), metadata);
    const metadataDuration = Date.now() - metadataStartTime;
    logInfo(
      `[Token ${config.gameTokenId}] Metadata updated! (took ${metadataDuration}ms)`,
    );

    const identity: ChaosIdentity = {
      chaosAgentId: agentId!.toString(),
      gameTokenId: config.gameTokenId,
      registeredAt: Date.now(),
    };

    // Store in registries
    identityRegistry.set(config.gameTokenId, identity);
    storageRefs.set(config.gameTokenId, []);

    logInfo(`[Token ${config.gameTokenId}] Registration complete!`);
    logInfo(`[Token ${config.gameTokenId}]   ChaosChain Agent ID: ${agentId}`);
    logInfo(
      `[Token ${config.gameTokenId}]   Total registrations: ${identityRegistry.size}`,
    );

    return identity;
  } catch (error) {
    // Clean up SDK if registration failed but SDK was stored
    if (sdkRegistry.has(config.gameTokenId)) {
      logWarn(
        `[Token ${config.gameTokenId}] Cleaning up SDK after registration failure...`,
      );
      sdkRegistry.delete(config.gameTokenId);
    }

    // If on-chain registration succeeded but metadata failed, log the orphaned identity
    if (agentId) {
      logError(
        `[Token ${config.gameTokenId}] Registration partially failed. On-chain identity ${agentId} may be orphaned.`,
      );
      logError(
        `[Token ${config.gameTokenId}] Manual cleanup may be required for ChaosChain Agent ID: ${agentId}`,
      );
    }

    throw error;
  }
}

/**
 * Get ChaosChain identity for a game token ID.
 */
export function getAgentIdentity(
  gameTokenId: number,
): ChaosIdentity | undefined {
  const identity = identityRegistry.get(gameTokenId);
  logDebug(
    `[Token ${gameTokenId}] getAgentIdentity: ${identity ? `Found (ChaosChain ID: ${identity.chaosAgentId})` : "Not found"}`,
  );
  return identity;
}

/**
 * Clean up agent identity when agent stops.
 */
export function unregisterAgentIdentity(gameTokenId: number): void {
  const identity = identityRegistry.get(gameTokenId);
  logInfo(`[Token ${gameTokenId}] Unregistering identity...`);
  if (identity) {
    logInfo(
      `[Token ${gameTokenId}]   ChaosChain Agent ID: ${identity.chaosAgentId}`,
    );
  }
  identityRegistry.delete(gameTokenId);
  sdkRegistry.delete(gameTokenId);
  // Keep storageRefs for historical reference
  logInfo(
    `[Token ${gameTokenId}] Identity unregistered. Remaining registrations: ${identityRegistry.size}`,
  );
}

// ============================================
// Storage Operations
// ============================================

/**
 * Flush agent logs to 0G storage.
 */
export async function flushLogs(
  gameTokenId: number,
  entries: AgentLogEntry[],
): Promise<string | null> {
  logInfo(
    `[Token ${gameTokenId}] Flushing ${entries.length} log entries to 0G storage...`,
  );

  const identity = identityRegistry.get(gameTokenId);

  if (!zeroGStorage) {
    logWarn(
      `[Token ${gameTokenId}] 0G Storage not initialized. Skipping flush.`,
    );
    return null;
  }
  if (entries.length === 0) {
    logDebug(`[Token ${gameTokenId}] No entries to flush.`);
    return null;
  }

  // Use chaosAgentId if available, otherwise use "unregistered"
  const chaosAgentId = identity?.chaosAgentId ?? "unregistered";

  const batch: AgentLogBatch = {
    type: "agent_logs",
    agentId: gameTokenId,
    chaosAgentId,
    startStep: entries[0].step,
    endStep: entries[entries.length - 1].step,
    createdAt: Date.now(),
    entries,
  };

  logDebug(`[Token ${gameTokenId}] Batch details:`, {
    type: batch.type,
    chaosAgentId: batch.chaosAgentId,
    stepRange: `${batch.startStep} - ${batch.endStep}`,
    entryCount: entries.length,
  });

  try {
    logInfo(`[Token ${gameTokenId}] Uploading to 0G storage...`);
    const startTime = Date.now();

    // Use 0G Storage directly instead of ChaosChain SDK
    const result = await zeroGStorage.upload(batch);

    const uploadDuration = Date.now() - startTime;
    const rootHash = result.cid;

    logInfo(
      `[Token ${gameTokenId}] Upload successful! (took ${uploadDuration}ms)`,
    );
    logInfo(`[Token ${gameTokenId}]   Root hash: ${rootHash}`);

    const ref: StorageReference = {
      rootHash,
      dataType: "agent_logs",
      storedAt: Date.now(),
      stepRange: { start: batch.startStep, end: batch.endStep },
    };
    storageRefs.get(gameTokenId)?.push(ref);

    const totalRefs = storageRefs.get(gameTokenId)?.length ?? 0;
    logInfo(`[Token ${gameTokenId}]   Total storage refs: ${totalRefs}`);

    return rootHash;
  } catch (error) {
    logError(
      `[Token ${gameTokenId}] Failed to upload logs to 0G storage:`,
      error,
    );
    return null;
  }
}

/**
 * Download data from storage by root hash.
 */
export async function downloadFromStorage<T = unknown>(
  gameTokenId: number,
  rootHash: string,
): Promise<T | null> {
  logInfo(`[Token ${gameTokenId}] Downloading from 0G storage...`);
  logDebug(`[Token ${gameTokenId}]   Root hash: ${rootHash}`);

  if (!zeroGStorage) {
    logWarn(
      `[Token ${gameTokenId}] 0G Storage not initialized. Cannot download.`,
    );
    return null;
  }

  try {
    const startTime = Date.now();
    const data = await zeroGStorage.download<T>(rootHash);
    const downloadDuration = Date.now() - startTime;

    logInfo(
      `[Token ${gameTokenId}] Download successful! (took ${downloadDuration}ms)`,
    );

    return data;
  } catch (error) {
    logError(
      `[Token ${gameTokenId}] Failed to download from 0G storage:`,
      error,
    );
    return null;
  }
}

/**
 * Get all storage references for an agent.
 */
export function getStorageReferences(gameTokenId: number): StorageReference[] {
  const refs = storageRefs.get(gameTokenId) ?? [];
  logDebug(
    `[Token ${gameTokenId}] getStorageReferences: ${refs.length} refs found`,
  );
  return refs;
}

// ============================================
// Reputation (Read-Only for Now)
// ============================================

/**
 * Get agent reputation stats from ChaosChain.
 * Note: Not currently used for behavior, just for querying.
 */
export async function getAgentReputation(gameTokenId: number): Promise<{
  totalFeedback: number;
  averageRating: number;
} | null> {
  logInfo(`[Token ${gameTokenId}] Fetching reputation stats...`);

  const sdk = sdkRegistry.get(gameTokenId);
  const identity = identityRegistry.get(gameTokenId);

  if (!sdk) {
    logWarn(
      `[Token ${gameTokenId}] No SDK instance found. Cannot fetch reputation.`,
    );
    return null;
  }
  if (!identity) {
    logWarn(
      `[Token ${gameTokenId}] No identity found. Cannot fetch reputation.`,
    );
    return null;
  }

  try {
    logDebug(
      `[Token ${gameTokenId}] Querying stats for ChaosChain Agent ID: ${identity.chaosAgentId}`,
    );
    const startTime = Date.now();
    const stats = await sdk.getAgentStats(BigInt(identity.chaosAgentId));
    const queryDuration = Date.now() - startTime;

    const result = {
      totalFeedback: Number(stats.totalFeedback || 0),
      averageRating: Number(stats.averageRating || 0),
    };

    logInfo(
      `[Token ${gameTokenId}] Reputation fetched! (took ${queryDuration}ms)`,
    );
    logInfo(`[Token ${gameTokenId}]   Total feedback: ${result.totalFeedback}`);
    logInfo(`[Token ${gameTokenId}]   Average rating: ${result.averageRating}`);

    return result;
  } catch (error) {
    logError(`[Token ${gameTokenId}] Failed to fetch reputation:`, error);
    return null;
  }
}

// ============================================
// Debug/Status Functions
// ============================================

/**
 * Get current ChaosChain integration status for debugging.
 */
export function getChaosChainStatus(): {
  initialized: boolean;
  operationsWallet: string | null;
  gameContract: string | null;
  registeredAgents: number;
  agentIds: number[];
} {
  const status = {
    initialized: serviceConfig !== null,
    operationsWallet: operationsWallet?.address ?? null,
    gameContract: serviceConfig?.gameContractAddress ?? null,
    registeredAgents: identityRegistry.size,
    agentIds: Array.from(identityRegistry.keys()),
  };

  logDebug("getChaosChainStatus:", status);
  return status;
}
