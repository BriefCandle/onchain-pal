import { flushLogs } from "./chaoschain";
import type { AgentLogEntry } from "../types/chaoschain";

// ============================================
// Configuration
// ============================================

/** Flush logs every N entries (configurable via env) */
const FLUSH_THRESHOLD = parseInt(
  process.env.AGENT_LOG_FLUSH_THRESHOLD || "1",
  10,
);

const DEBUG = process.env.CHAOSCHAIN_DEBUG === "true";

// ============================================
// Storage Manager
// ============================================

export class AgentStorageManager {
  private gameTokenId: number;
  private buffer: AgentLogEntry[] = [];
  private totalLogsBuffered = 0;
  private totalFlushes = 0;
  private totalLogsStored = 0;

  constructor(gameTokenId: number) {
    this.gameTokenId = gameTokenId;
    console.log(
      `[StorageManager ${this.gameTokenId}] [INFO] Initialized. Flush threshold: ${FLUSH_THRESHOLD} entries`,
    );
  }

  /**
   * Log an agent decision/action. Automatically flushes when buffer is full.
   */
  log(entry: Omit<AgentLogEntry, "timestamp">): void {
    const fullEntry: AgentLogEntry = {
      ...entry,
      timestamp: Date.now(),
    };

    this.buffer.push(fullEntry);
    this.totalLogsBuffered++;

    if (DEBUG) {
      console.log(
        `[StorageManager ${this.gameTokenId}] [DEBUG] Logged entry:`,
        {
          step: entry.step,
          toolCalled: entry.toolCalled,
          bufferSize: this.buffer.length,
          threshold: FLUSH_THRESHOLD,
        },
      );
    }

    if (this.buffer.length >= FLUSH_THRESHOLD) {
      console.log(
        `[StorageManager ${this.gameTokenId}] [INFO] Buffer full (${this.buffer.length}/${FLUSH_THRESHOLD}). Triggering auto-flush...`,
      );
      // Fire and forget - don't block agent loop
      this.flush().catch((err) => {
        console.error(
          `[StorageManager ${this.gameTokenId}] [ERROR] Auto-flush failed:`,
          err,
        );
      });
    }
  }

  /**
   * Flush all buffered logs to 0G storage.
   */
  async flush(): Promise<string | null> {
    if (this.buffer.length === 0) {
      if (DEBUG) {
        console.log(
          `[StorageManager ${this.gameTokenId}] [DEBUG] Flush called but buffer is empty.`,
        );
      }
      return null;
    }

    const entries = [...this.buffer];
    const entryCount = entries.length;
    this.buffer = [];

    console.log(
      `[StorageManager ${this.gameTokenId}] [INFO] Flushing ${entryCount} entries...`,
    );

    const startTime = Date.now();
    const rootHash = await flushLogs(this.gameTokenId, entries);
    const duration = Date.now() - startTime;

    if (rootHash) {
      this.totalFlushes++;
      this.totalLogsStored += entryCount;
      console.log(
        `[StorageManager ${this.gameTokenId}] [INFO] Flush successful! (took ${duration}ms)`,
      );
      console.log(
        `[StorageManager ${this.gameTokenId}] [INFO]   Root hash: ${rootHash}`,
      );
      console.log(
        `[StorageManager ${this.gameTokenId}] [INFO]   Stats: ${this.totalFlushes} flushes, ${this.totalLogsStored} logs stored total`,
      );
    } else {
      console.warn(
        `[StorageManager ${this.gameTokenId}] [WARN] Flush returned null (ChaosChain may not be configured)`,
      );
    }

    return rootHash;
  }

  /**
   * Called when agent stops - flush all remaining logs.
   */
  async onStop(reason: "death" | "exit" | "manual"): Promise<void> {
    console.log(
      `[StorageManager ${this.gameTokenId}] [INFO] Agent stopping (reason: ${reason})`,
    );
    console.log(
      `[StorageManager ${this.gameTokenId}] [INFO]   Buffered logs: ${this.buffer.length}`,
    );
    console.log(
      `[StorageManager ${this.gameTokenId}] [INFO]   Total logs buffered this session: ${this.totalLogsBuffered}`,
    );

    if (this.buffer.length > 0) {
      console.log(
        `[StorageManager ${this.gameTokenId}] [INFO] Flushing remaining logs before stop...`,
      );

      try {
        const rootHash = await this.flush();
        if (rootHash) {
          console.log(
            `[StorageManager ${this.gameTokenId}] [INFO] Final flush successful!`,
          );
        }
      } catch (err) {
        console.error(
          `[StorageManager ${this.gameTokenId}] [ERROR] Final flush failed:`,
          err,
        );
      }
    }

    console.log(
      `[StorageManager ${this.gameTokenId}] [INFO] Session complete. Final stats:`,
    );
    console.log(
      `[StorageManager ${this.gameTokenId}] [INFO]   Total flushes: ${this.totalFlushes}`,
    );
    console.log(
      `[StorageManager ${this.gameTokenId}] [INFO]   Total logs stored: ${this.totalLogsStored}`,
    );
  }

  /**
   * Get current buffer status for debugging.
   */
  getStatus(): {
    bufferSize: number;
    flushThreshold: number;
    totalLogsBuffered: number;
    totalFlushes: number;
    totalLogsStored: number;
  } {
    return {
      bufferSize: this.buffer.length,
      flushThreshold: FLUSH_THRESHOLD,
      totalLogsBuffered: this.totalLogsBuffered,
      totalFlushes: this.totalFlushes,
      totalLogsStored: this.totalLogsStored,
    };
  }
}
