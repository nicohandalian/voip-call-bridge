import { CallStatus } from '../../shared/types';
import { logger } from '../../shared/logger';

export interface CallFlowConfig {
  maxRetries: number;
  retryDelay: number;
  timeoutMs: number;
  enableCircuitBreaker: boolean;
  enableFallback: boolean;
  enableAnalytics: boolean;
}

export interface CallMetrics {
  callId: string;
  provider: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'success' | 'failed' | 'timeout' | 'cancelled';
  retryCount: number;
  errorMessage?: string;
}

export class CallFlowEngine {
  private config: CallFlowConfig;
  private callMetrics = new Map<string, CallMetrics>();
  private circuitBreaker = new Map<string, { failures: number; lastFailure: Date; isOpen: boolean }>();
  private callQueue: string[] = [];
  private activeCalls = new Set<string>();

  constructor(config: Partial<CallFlowConfig> = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      timeoutMs: 30000,
      enableCircuitBreaker: true,
      enableFallback: true,
      enableAnalytics: true,
      ...config
    };
  }

  async executeCallFlow<T>(
    callId: string,
    provider: string,
    operation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>
  ): Promise<T> {
    const startTime = new Date();
    let retryCount = 0;
    let lastError: Error | null = null;

    this.activeCalls.add(callId);
    this.callQueue.push(callId);

    if (this.config.enableAnalytics) {
      this.callMetrics.set(callId, {
        callId,
        provider,
        startTime,
        status: 'success',
        retryCount: 0
      });
    }

    try {
      while (retryCount <= this.config.maxRetries) {
        try {
          if (this.isCircuitBreakerOpen(provider)) {
            throw new Error(`Circuit breaker open for provider: ${provider}`);
          }

          const result = await this.executeWithTimeout(operation, this.config.timeoutMs);
          
          this.recordSuccess(callId, provider);
          return result;

        } catch (error) {
          lastError = error as Error;
          retryCount++;

          if (this.config.enableAnalytics) {
            const metrics = this.callMetrics.get(callId);
            if (metrics) {
              metrics.retryCount = retryCount;
            }
          }

          if (retryCount <= this.config.maxRetries) {
            logger.warn(`Call ${callId} failed, retrying ${retryCount}/${this.config.maxRetries}:`, error);
            await this.delay(this.config.retryDelay * retryCount);
          } else {
            this.recordFailure(callId, provider, lastError);
            
            if (this.config.enableFallback && fallbackOperation) {
              logger.info(`Attempting fallback for call ${callId}`);
              try {
                const fallbackResult = await this.executeWithTimeout(fallbackOperation, this.config.timeoutMs);
                this.recordSuccess(callId, provider, 'fallback');
                return fallbackResult;
              } catch (fallbackError) {
                logger.error(`Fallback also failed for call ${callId}:`, fallbackError);
              }
            }
            
            throw lastError;
          }
        }
      }

      throw lastError || new Error('Max retries exceeded');

    } finally {
      this.activeCalls.delete(callId);
      this.callQueue = this.callQueue.filter(id => id !== callId);
      
      if (this.config.enableAnalytics) {
        const metrics = this.callMetrics.get(callId);
        if (metrics) {
          metrics.endTime = new Date();
          metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime();
        }
      }
    }
  }

  private async executeWithTimeout<T>(operation: () => Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private isCircuitBreakerOpen(provider: string): boolean {
    if (!this.config.enableCircuitBreaker) return false;

    const breaker = this.circuitBreaker.get(provider);
    if (!breaker) return false;

    if (breaker.isOpen) {
      const timeSinceLastFailure = Date.now() - breaker.lastFailure.getTime();
      if (timeSinceLastFailure > 60000) {
        breaker.isOpen = false;
        breaker.failures = 0;
        logger.info(`Circuit breaker reset for provider: ${provider}`);
        return false;
      }
      return true;
    }

    return false;
  }

  private recordSuccess(callId: string, provider: string, type: 'primary' | 'fallback' = 'primary'): void {
    if (this.config.enableAnalytics) {
      const metrics = this.callMetrics.get(callId);
      if (metrics) {
        metrics.status = 'success';
        metrics.endTime = new Date();
        metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime();
      }
    }

    if (this.config.enableCircuitBreaker) {
      const breaker = this.circuitBreaker.get(provider);
      if (breaker) {
        breaker.failures = Math.max(0, breaker.failures - 1);
      }
    }

    logger.info(`Call ${callId} succeeded using ${type} ${provider} provider`);
  }

  private recordFailure(callId: string, provider: string, error: Error): void {
    if (this.config.enableAnalytics) {
      const metrics = this.callMetrics.get(callId);
      if (metrics) {
        metrics.status = 'failed';
        metrics.errorMessage = error.message;
        metrics.endTime = new Date();
        metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime();
      }
    }

    if (this.config.enableCircuitBreaker) {
      const breaker = this.circuitBreaker.get(provider) || { failures: 0, lastFailure: new Date(), isOpen: false };
      breaker.failures++;
      breaker.lastFailure = new Date();
      
      if (breaker.failures >= 5) {
        breaker.isOpen = true;
        logger.warn(`Circuit breaker opened for provider: ${provider} after ${breaker.failures} failures`);
      }
      
      this.circuitBreaker.set(provider, breaker);
    }

    logger.error(`Call ${callId} failed with ${provider} provider:`, error);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getCallMetrics(callId: string): CallMetrics | undefined {
    return this.callMetrics.get(callId);
  }

  getAllMetrics(): CallMetrics[] {
    return Array.from(this.callMetrics.values());
  }

  getProviderHealth(): { [provider: string]: { isHealthy: boolean; failureRate: number } } {
    const health: { [provider: string]: { isHealthy: boolean; failureRate: number } } = {};
    
    for (const [provider, breaker] of this.circuitBreaker) {
      const metrics = this.getAllMetrics().filter(m => m.provider === provider);
      const totalCalls = metrics.length;
      const failedCalls = metrics.filter(m => m.status === 'failed').length;
      const failureRate = totalCalls > 0 ? failedCalls / totalCalls : 0;
      
      health[provider] = {
        isHealthy: !breaker.isOpen && failureRate < 0.5,
        failureRate
      };
    }
    
    return health;
  }

  getQueueStatus(): { activeCalls: number; queuedCalls: number; averageWaitTime: number } {
    const now = Date.now();
    const activeCallTimes = Array.from(this.activeCalls).map(callId => {
      const metrics = this.callMetrics.get(callId);
      return metrics ? now - metrics.startTime.getTime() : 0;
    });
    
    const averageWaitTime = activeCallTimes.length > 0 
      ? activeCallTimes.reduce((sum, time) => sum + time, 0) / activeCallTimes.length 
      : 0;

    return {
      activeCalls: this.activeCalls.size,
      queuedCalls: this.callQueue.length,
      averageWaitTime
    };
  }
}
