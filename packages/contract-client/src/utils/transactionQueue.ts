// Global transaction queue to ensure sequential transactions across all tx functions
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

// Global instance shared across all transaction functions
export const transactionQueue = new TransactionQueue();
