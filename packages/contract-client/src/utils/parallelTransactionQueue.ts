// Parallel transaction queue system for different heroes
class TransactionQueue {
  private queue: Array<() => Promise<any>> = [];
  private isProcessing = false;

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error("Transaction queue task failed:", error);
        }
        // Add a small delay between transactions to prevent nonce conflicts
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    this.isProcessing = false;
  }
}

// Per-hero transaction queues - each hero gets their own queue
const heroTransactionQueues = new Map<number, TransactionQueue>();

// Get or create a transaction queue for a specific hero
export const getHeroTransactionQueue = (heroId: number): TransactionQueue => {
  if (!heroTransactionQueues.has(heroId)) {
    heroTransactionQueues.set(heroId, new TransactionQueue());
    console.log(`📦 Created transaction queue for hero ${heroId}`);
  }
  return heroTransactionQueues.get(heroId)!;
};

// Clean up queues for dead heroes
export const cleanupHeroQueue = (heroId: number) => {
  if (heroTransactionQueues.has(heroId)) {
    heroTransactionQueues.delete(heroId);
    console.log(`🗑️ Cleaned up transaction queue for hero ${heroId}`);
  }
};

// Get all active queues (for monitoring)
export const getActiveQueues = () => {
  return Array.from(heroTransactionQueues.keys());
};

// Legacy compatibility - use hero 0 as default for non-hero transactions
export const transactionQueue = getHeroTransactionQueue(0);
