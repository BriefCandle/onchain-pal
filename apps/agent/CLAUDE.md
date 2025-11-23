# Agent Architecture

## Wallet & Identity

### Key Derivation

Each agent derives a deterministic private key from `AGENT_SEED + agentId`:

```typescript
// accountManager.ts
const seedBytes = toBytes(stringToHex(`${seed}-${agentId}`));
const ownerPrivateKey = keccak256(seedBytes) as Hex;
```

This derived key is used for:
1. **CDP Smart Account** - as the `owner` parameter
2. **ChaosChain Identity** - to register ERC-8004 identity NFT

Both identities are owned by the same EOA derived from the seed.

### Environment Variables

```bash
AGENT_SEED=your-production-seed  # Used to derive agent keys
CDP_API_KEY_ID=...
CDP_API_KEY_SECRET=...
ADMIN_PRIVATE_KEY=...
CDP_PAYMASTER_URL=...
```

---

## Storage Manager

### Overview

The `AgentStorageManager` provides a simple API for logging agent decisions to 0G storage via ChaosChain SDK.

### Configuration

```bash
AGENT_LOG_FLUSH_THRESHOLD=100  # Flush logs every N entries (default: 100)
```

### API

```typescript
class AgentStorageManager {
  constructor(gameTokenId: number)
  
  // Log a decision (auto-flushes when buffer is full)
  log(entry: {
    step: number;
    observation: string;
    reasoning: string;
    toolCalled: string | null;
    toolParams: Record<string, unknown> | null;
    result: string | null;
  }): void
  
  // Manually flush buffer to 0G storage
  flush(): Promise<string | null>
  
  // Called on agent stop - flushes remaining logs
  onStop(reason: "death" | "exit" | "manual"): Promise<void>
}
```

### Usage in Agent Loop

```typescript
// In agent.ts step()
this.storageManager.log({
  step: this.stepCount,
  observation,
  reasoning,
  toolCalled,
  toolParams,
  result,
});

// On agent stop
await this.storageManager.onStop("death");
```

### Storage Format

Logs are batched and stored as `AgentLogBatch`:

```typescript
{
  type: 'agent_logs',
  agentId: number,
  chaosAgentId: string,
  startStep: number,
  endStep: number,
  createdAt: number,
  entries: AgentLogEntry[]
}
```

---

## ChaosChain Integration

### Service Initialization

```typescript
// createAgentSysten.ts
initializeChaosChainService({
  operationsPrivateKey: process.env.OPERATIONS_WALLET_PRIVATE_KEY,
  gameContractAddress: process.env.AGENT_NFT_ADDRESS,
  zgIndexerRpc: process.env.ZG_INDEXER_RPC,
});
```

---

## 0G Storage Implementation Guide

### Overview

This guide documents how to replace IPFS storage with 0G Storage in the ChaosChain SDK integration. The approach creates a custom storage provider that implements ChaosChain's storage interface using `@0glabs/0g-ts-sdk`.

### Prerequisites

1. Install 0G SDK:
   ```bash
   pnpm add @0glabs/0g-ts-sdk
   ```

2. Environment variables:
   ```bash
   ZG_INDEXER_RPC=https://indexer-storage-testnet-standard.0g.ai
   ZG_EVM_RPC=https://evmrpc-testnet.0g.ai/
   OPERATIONS_WALLET_PRIVATE_KEY=<wallet-with-0g-testnet-tokens>
   ```

3. Ensure the operations wallet has 0G testnet tokens for storage fees.

### Implementation Steps

#### Step 1: Create ZeroGStorageProvider

Create `src/agent/services/zeroGStorage.ts`:

```typescript
import { Indexer, ZgFile } from "@0glabs/0g-ts-sdk";
import { Wallet } from "ethers";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface ZeroGStorageConfig {
  indexerRpc: string;   // 0G indexer endpoint
  evmRpc: string;       // 0G EVM RPC endpoint
  privateKey: string;   // Wallet for paying storage fees
}

export interface StorageResult {
  cid: string;          // Root hash (0G equivalent of CID)
  uri: string;          // 0g:// URI
}

/**
 * 0G Storage provider that implements the same interface as ChaosChain SDK's
 * built-in storage providers (IPFS, Pinata, Irys).
 */
export class ZeroGStorageProvider {
  private indexer: Indexer;
  private signer: Wallet;
  private evmRpc: string;

  constructor(config: ZeroGStorageConfig) {
    this.indexer = new Indexer(config.indexerRpc);
    this.signer = new Wallet(config.privateKey);
    this.evmRpc = config.evmRpc;

    console.log("[ZeroGStorage] Initialized");
    console.log(`[ZeroGStorage]   Indexer: ${config.indexerRpc}`);
    console.log(`[ZeroGStorage]   EVM RPC: ${config.evmRpc}`);
    console.log(`[ZeroGStorage]   Wallet: ${this.signer.address}`);
  }

  /**
   * Upload JSON data to 0G Storage.
   * 
   * Note: 0G SDK is file-based, so we write to a temp file first.
   * This matches ChaosChain SDK's upload(data) interface.
   */
  async upload(data: unknown): Promise<StorageResult> {
    const jsonStr = JSON.stringify(data, null, 2);
    const tempPath = path.join(os.tmpdir(), `0g-upload-${Date.now()}.json`);

    console.log(`[ZeroGStorage] Uploading ${jsonStr.length} bytes...`);

    try {
      // Write JSON to temp file
      fs.writeFileSync(tempPath, jsonStr);

      // Create ZgFile and compute merkle tree
      const file = await ZgFile.fromFilePath(tempPath);
      const [tree, treeErr] = await file.merkleTree();
      
      if (treeErr) {
        throw new Error(`Failed to create merkle tree: ${treeErr}`);
      }

      const rootHash = tree.rootHash();
      console.log(`[ZeroGStorage]   Root hash: ${rootHash}`);

      // Upload to 0G network
      const [tx, uploadErr] = await this.indexer.upload(
        file,
        this.evmRpc,
        this.signer
      );

      if (uploadErr) {
        throw new Error(`Upload failed: ${uploadErr}`);
      }

      console.log(`[ZeroGStorage]   TX hash: ${tx}`);
      
      // Close file handle
      await file.close();

      return {
        cid: rootHash,
        uri: `0g://${rootHash}`,
      };
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }

  /**
   * Download data from 0G Storage by root hash.
   */
  async download<T = unknown>(rootHash: string): Promise<T> {
    const tempPath = path.join(os.tmpdir(), `0g-download-${Date.now()}.json`);

    console.log(`[ZeroGStorage] Downloading ${rootHash}...`);

    try {
      // Download to temp file
      await this.indexer.download(rootHash, tempPath, false);

      // Read and parse JSON
      const content = fs.readFileSync(tempPath, "utf-8");
      const data = JSON.parse(content) as T;

      console.log(`[ZeroGStorage]   Downloaded ${content.length} bytes`);

      return data;
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }
}
```

#### Step 2: Modify chaoschain.ts to Use 0G Storage

Update `src/agent/services/chaoschain.ts`:

```typescript
// Add import at top
import { ZeroGStorageProvider } from "./zeroGStorage";

// Add to service state
let zeroGStorage: ZeroGStorageProvider | null = null;

// Update initializeChaosChainService
export function initializeChaosChainService(
  config: ChaosChainServiceConfig,
): void {
  // ... existing code ...

  // Initialize 0G Storage provider
  zeroGStorage = new ZeroGStorageProvider({
    indexerRpc: config.zgIndexerRpc,
    evmRpc: config.zgEvmRpc,  // Add this to config
    privateKey: config.operationsPrivateKey,
  });

  logInfo("0G Storage provider initialized");
}

// Update flushLogs to use 0G directly
export async function flushLogs(
  gameTokenId: number,
  entries: AgentLogEntry[],
): Promise<string | null> {
  logInfo(`[Token ${gameTokenId}] Flushing ${entries.length} log entries to 0G storage...`);

  const identity = identityRegistry.get(gameTokenId);

  if (!zeroGStorage) {
    logWarn(`[Token ${gameTokenId}] 0G Storage not initialized. Skipping flush.`);
    return null;
  }
  if (!identity) {
    logWarn(`[Token ${gameTokenId}] No identity found. Skipping flush.`);
    return null;
  }
  if (entries.length === 0) {
    logDebug(`[Token ${gameTokenId}] No entries to flush.`);
    return null;
  }

  const batch: AgentLogBatch = {
    type: "agent_logs",
    agentId: gameTokenId,
    chaosAgentId: identity.chaosAgentId,
    startStep: entries[0].step,
    endStep: entries[entries.length - 1].step,
    createdAt: Date.now(),
    entries,
  };

  try {
    logInfo(`[Token ${gameTokenId}] Uploading to 0G storage...`);
    const startTime = Date.now();
    
    // Use 0G Storage directly instead of ChaosChain SDK
    const result = await zeroGStorage.upload(batch);
    
    const uploadDuration = Date.now() - startTime;
    const rootHash = result.cid;
    
    logInfo(`[Token ${gameTokenId}] Upload successful! (took ${uploadDuration}ms)`);
    logInfo(`[Token ${gameTokenId}]   Root hash: ${rootHash}`);

    const ref: StorageReference = {
      rootHash,
      dataType: "agent_logs",
      storedAt: Date.now(),
      stepRange: { start: batch.startStep, end: batch.endStep },
    };
    storageRefs.get(gameTokenId)?.push(ref);

    return rootHash;
  } catch (error) {
    logError(`[Token ${gameTokenId}] Failed to upload logs to 0G storage:`, error);
    return null;
  }
}

// Update downloadFromStorage
export async function downloadFromStorage<T = unknown>(
  gameTokenId: number,
  rootHash: string,
): Promise<T | null> {
  logInfo(`[Token ${gameTokenId}] Downloading from 0G storage...`);

  if (!zeroGStorage) {
    logWarn(`[Token ${gameTokenId}] 0G Storage not initialized. Cannot download.`);
    return null;
  }

  try {
    const startTime = Date.now();
    const data = await zeroGStorage.download<T>(rootHash);
    const downloadDuration = Date.now() - startTime;

    logInfo(`[Token ${gameTokenId}] Download successful! (took ${downloadDuration}ms)`);
    return data;
  } catch (error) {
    logError(`[Token ${gameTokenId}] Failed to download from 0G storage:`, error);
    return null;
  }
}
```

#### Step 3: Update Configuration Types

Update `src/agent/types/chaoschain.ts`:

```typescript
export interface ChaosChainServiceConfig {
  operationsPrivateKey: string;
  gameContractAddress: string;
  zgIndexerRpc: string;
  zgEvmRpc: string;  // Add this field
}
```

#### Step 4: Update Service Initialization

Update `createAgentSysten.ts`:

```typescript
initializeChaosChainService({
  operationsPrivateKey: process.env.OPERATIONS_WALLET_PRIVATE_KEY!,
  gameContractAddress: process.env.AGENT_NFT_ADDRESS!,
  zgIndexerRpc: process.env.ZG_INDEXER_RPC!,
  zgEvmRpc: process.env.ZG_EVM_RPC!,  // Add this
});
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Agent Loop                              │
│  agent.ts / palAgent.ts                                      │
└─────────────────────┬───────────────────────────────────────┘
                      │ log(entry)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  StorageManager                              │
│  services/storageManager.ts                                  │
│  - Buffers entries until threshold                           │
│  - Auto-flushes when buffer full                             │
└─────────────────────┬───────────────────────────────────────┘
                      │ flushLogs(entries)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  ChaosChain Service                          │
│  services/chaoschain.ts                                      │
│  - Identity management (ERC-8004)                            │
│  - Storage orchestration                                     │
└─────────────────────┬───────────────────────────────────────┘
                      │ upload(batch)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│               ZeroGStorageProvider                           │
│  services/zeroGStorage.ts                                    │
│  - JSON → temp file → ZgFile                                 │
│  - Merkle tree computation                                   │
│  - Upload via 0G Indexer                                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   0G Storage Network                         │
│  - Decentralized storage                                     │
│  - Content-addressed by root hash                            │
│  - On-chain fee payment                                      │
└─────────────────────────────────────────────────────────────┘
```

### Testing

1. **Unit test the provider:**
   ```typescript
   const provider = new ZeroGStorageProvider({
     indexerRpc: "https://indexer-storage-testnet-standard.0g.ai",
     evmRpc: "https://evmrpc-testnet.0g.ai/",
     privateKey: process.env.TEST_PRIVATE_KEY!,
   });

   const testData = { test: "hello", timestamp: Date.now() };
   const result = await provider.upload(testData);
   console.log("Uploaded:", result.cid);

   const downloaded = await provider.download(result.cid);
   console.log("Downloaded:", downloaded);
   ```

2. **Integration test with agent:**
   - Start agent with `CHAOSCHAIN_DEBUG=true`
   - Verify logs show 0G upload success
   - Check root hashes are valid 0G identifiers

### Migration Notes

- **Breaking change:** Root hashes from 0G differ from IPFS CIDs
- **Existing data:** Previously stored IPFS data won't be accessible via 0G
- **Costs:** Each upload requires 0G testnet tokens (mainnet will require real tokens)
- **ChaosChain SDK:** Identity features (ERC-8004, reputation) still use the SDK; only storage is replaced

### Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `Upload failed: insufficient funds` | Wallet lacks 0G tokens | Fund wallet with testnet tokens |
| `Failed to create merkle tree` | Invalid file or SDK issue | Check temp file permissions |
| `Download failed: not found` | Data not yet propagated | Retry after a few seconds |
| `ENOENT temp file` | Temp directory issues | Ensure `/tmp` is writable |

### Identity Registration

Each agent registers an ERC-8004 identity on ChaosChain with cross-reference metadata linking to the game NFT:

```typescript
await registerAgentIdentity({
  agentPrivateKey,
  gameTokenId,
  agentType: "PAL" | "TRAINER",
});
```

### Exported Functions

```typescript
// Identity
registerAgentIdentity(config): Promise<ChaosIdentity>
getAgentIdentity(gameTokenId): ChaosIdentity | undefined
unregisterAgentIdentity(gameTokenId): void

// Storage
flushLogs(gameTokenId, entries): Promise<string | null>
downloadFromStorage<T>(gameTokenId, rootHash): Promise<T | null>
getStorageReferences(gameTokenId): StorageReference[]

// Reputation
getAgentReputation(gameTokenId): Promise<{ totalFeedback, averageRating } | null>
```

---

## File Structure

```
src/agent/
├── agent.ts              # Base Agent class with step loop
├── palAgent.ts           # PalAgent extends Agent
├── accountManager.ts     # CDP wallet creation, key derivation
├── createAgentSysten.ts  # System initialization, agent lifecycle
├── services/
│   ├── chaoschain.ts     # ChaosChain SDK wrapper
│   └── storageManager.ts # Simplified log buffering
└── types/
    └── chaoschain.ts     # Type definitions
```
