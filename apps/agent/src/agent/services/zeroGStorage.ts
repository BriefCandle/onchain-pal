import { Indexer, ZgFile } from "@0glabs/0g-ts-sdk";
import { Wallet } from "ethers";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface ZeroGStorageConfig {
  indexerRpc: string; // 0G indexer endpoint
  evmRpc: string; // 0G EVM RPC endpoint
  privateKey: string; // Wallet for paying storage fees
}

export interface StorageResult {
  cid: string; // Root hash (0G equivalent of CID)
  uri: string; // 0g:// URI
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

      const rootHash = tree!.rootHash();
      if (!rootHash) {
        throw new Error("Failed to compute root hash");
      }
      console.log(`[ZeroGStorage]   Root hash: ${rootHash}`);

      // Upload to 0G network
      // Note: Using 'as any' due to ethers version mismatch between SDK (6.13.1) and project (6.15.0)
      const [tx, uploadErr] = await this.indexer.upload(
        file,
        this.evmRpc,
        this.signer as any,
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
