/**
 * Rate limiter utility for Meraki API calls
 * Cisco Meraki API has the following rate limits:
 * - 5 calls per second per organization
 * - 300 calls per minute per organization
 * - Additional limits may apply based on endpoint
 */

export class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private callCount = 0;
  private windowStart = Date.now();
  private readonly windowDuration = 60000; // 1 minute
  private readonly maxCallsPerWindow = 250; // Conservative limit (300 is max)
  private readonly minDelayBetweenCalls = 200; // 200ms = 5 calls per second
  private lastCallTime = 0;

  /**
   * Add a function to the rate-limited queue
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
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
      // Check if we need to reset the window
      const now = Date.now();
      if (now - this.windowStart >= this.windowDuration) {
        this.callCount = 0;
        this.windowStart = now;
      }

      // Check rate limits
      if (this.callCount >= this.maxCallsPerWindow) {
        // Wait until window resets
        const waitTime = this.windowDuration - (now - this.windowStart);
        console.log(`Rate limit reached. Waiting ${waitTime}ms before continuing...`);
        await this.sleep(waitTime);
        this.callCount = 0;
        this.windowStart = Date.now();
      }

      // Ensure minimum delay between calls
      const timeSinceLastCall = now - this.lastCallTime;
      if (timeSinceLastCall < this.minDelayBetweenCalls) {
        await this.sleep(this.minDelayBetweenCalls - timeSinceLastCall);
      }

      // Execute the next function in queue
      const fn = this.queue.shift();
      if (fn) {
        this.callCount++;
        this.lastCallTime = Date.now();
        
        try {
          await fn();
        } catch (error: any) {
          // If we get a 429 error, wait longer before continuing
          if (error?.response?.status === 429) {
            const retryAfter = error.response.headers['retry-after'];
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // Default to 1 minute
            console.log(`Received 429 error. Waiting ${waitTime}ms before retrying...`);
            await this.sleep(waitTime);
            
            // Reset counters to be safe
            this.callCount = 0;
            this.windowStart = Date.now();
            
            // Put the function back at the front of the queue to retry
            this.queue.unshift(fn);
          }
        }
      }
    }

    this.isProcessing = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current status of the rate limiter
   */
  getStatus() {
    const now = Date.now();
    const windowRemaining = this.windowDuration - (now - this.windowStart);
    return {
      queueLength: this.queue.length,
      callsInCurrentWindow: this.callCount,
      maxCallsPerWindow: this.maxCallsPerWindow,
      windowRemainingMs: windowRemaining,
      isProcessing: this.isProcessing
    };
  }
}
