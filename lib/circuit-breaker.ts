interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

class CircuitBreaker {
  private static instance: CircuitBreaker;
  private states: Map<string, CircuitBreakerState> = new Map();
  private readonly failureThreshold = 3;
  private readonly recoveryTimeout = 60000; // 1 minute
  private readonly resetTimeout = 300000; // 5 minutes

  static getInstance(): CircuitBreaker {
    if (!CircuitBreaker.instance) {
      CircuitBreaker.instance = new CircuitBreaker();
    }
    return CircuitBreaker.instance;
  }

  async execute<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const state = this.getState(key);
    
    if (state.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - state.lastFailureTime;
      if (timeSinceLastFailure < this.recoveryTimeout) {
        throw new Error(`Circuit breaker is OPEN for ${key}. Retrying in ${Math.ceil((this.recoveryTimeout - timeSinceLastFailure) / 1000)} seconds.`);
      } else {
        // Move to HALF_OPEN state
        state.state = 'HALF_OPEN';
        this.states.set(key, state);
      }
    }

    try {
      const result = await operation();
      
      // Success - reset circuit breaker
      this.onSuccess(key);
      return result;
    } catch (error: any) {
      // Check if it's a rate limit error
      if (error?.response?.status === 429) {
        this.onFailure(key);
        throw new Error(`Rate limit exceeded for ${key}. Circuit breaker activated.`);
      }
      
      // For other errors, just pass through
      throw error;
    }
  }

  private getState(key: string): CircuitBreakerState {
    if (!this.states.has(key)) {
      this.states.set(key, {
        failures: 0,
        lastFailureTime: 0,
        state: 'CLOSED'
      });
    }
    return this.states.get(key)!;
  }

  private onSuccess(key: string): void {
    this.states.set(key, {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED'
    });
  }

  private onFailure(key: string): void {
    const state = this.getState(key);
    state.failures++;
    state.lastFailureTime = Date.now();
    
    if (state.failures >= this.failureThreshold) {
      state.state = 'OPEN';
      console.warn(`Circuit breaker OPENED for ${key} after ${state.failures} failures`);
    }
    
    this.states.set(key, state);
  }

  // Method to check if circuit breaker allows requests
  canExecute(key: string): boolean {
    const state = this.getState(key);
    
    if (state.state === 'CLOSED') {
      return true;
    }
    
    if (state.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - state.lastFailureTime;
      return timeSinceLastFailure >= this.recoveryTimeout;
    }
    
    // HALF_OPEN state
    return true;
  }

  // Method to get current state for monitoring
  getStates(): Map<string, CircuitBreakerState> {
    return new Map(this.states);
  }
}

export default CircuitBreaker;
