import { CallFlowEngine, CallMetrics } from './CallFlowEngine';
import { CallStateMachine, CallState, CallEvent } from './CallStateMachine';
import { CallStatus } from '../../shared/types';
import { VoiceProvider } from '../providers/BaseProvider';
import { logger } from '../../shared/logger';

export interface CallOrchestratorConfig {
  maxConcurrentCalls: number;
  enableIntelligentRouting: boolean;
  enableLoadBalancing: boolean;
  enableHealthMonitoring: boolean;
  callTimeoutMs: number;
  retryConfig: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
  };
}

export class CallOrchestrator {
  private flowEngine: CallFlowEngine;
  private activeCalls = new Map<string, CallStateMachine>();
  private providers: Map<string, VoiceProvider> = new Map();
  private config: CallOrchestratorConfig;
  private callQueue: Array<{
    callId: string;
    fromPhone: string;
    toPhone: string;
    callMode: 'bridge' | 'headset';
    priority: number;
    timestamp: Date;
  }> = [];

  constructor(config: Partial<CallOrchestratorConfig> = {}) {
    this.config = {
      maxConcurrentCalls: 10,
      enableIntelligentRouting: true,
      enableLoadBalancing: true,
      enableHealthMonitoring: true,
      callTimeoutMs: 30000,
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        exponentialBackoff: true
      },
      ...config
    };

    this.flowEngine = new CallFlowEngine({
      maxRetries: this.config.retryConfig.maxRetries,
      retryDelay: this.config.retryConfig.retryDelay,
      timeoutMs: this.config.callTimeoutMs,
      enableCircuitBreaker: true,
      enableFallback: true,
      enableAnalytics: true
    });
  }

  registerProvider(name: string, provider: VoiceProvider): void {
    this.providers.set(name, provider);
    logger.info(`Registered provider: ${name}`);
  }

  async initiateCall(
    fromPhone: string,
    toPhone: string,
    callMode: 'bridge' | 'headset' = 'bridge',
    preferredProvider?: string
  ): Promise<string> {
    const callId = this.generateCallId();
    
    if (this.activeCalls.size >= this.config.maxConcurrentCalls) {
      logger.warn(`Max concurrent calls reached (${this.config.maxConcurrentCalls}), queuing call ${callId}`);
      this.queueCall(callId, fromPhone, toPhone, callMode);
      return callId;
    }

    return this.executeCall(callId, fromPhone, toPhone, callMode, preferredProvider);
  }

  private async executeCall(
    callId: string,
    fromPhone: string,
    toPhone: string,
    callMode: 'bridge' | 'headset',
    preferredProvider?: string
  ): Promise<string> {
    const initialCall: CallStatus = {
      callId,
      status: 'initiating',
      fromPhone,
      toPhone,
      timestamp: new Date(),
      callMode,
      provider: preferredProvider || 'telnyx'
    };

    const stateMachine = new CallStateMachine(initialCall);
    this.activeCalls.set(callId, stateMachine);

    try {
      await stateMachine.transition('initiate', initialCall);

      const selectedProvider = this.selectProvider(preferredProvider, callMode);
      const provider = this.providers.get(selectedProvider);
      
      if (!provider) {
        throw new Error(`Provider ${selectedProvider} not found`);
      }

      await this.flowEngine.executeCallFlow(
        callId,
        selectedProvider,
        async () => {
          const result = await provider.initiateCall(fromPhone, toPhone, callMode);
          
          await stateMachine.transition('first_call_started');
          await stateMachine.transition('first_call_ringing');
          
          return result;
        },
        async () => {
          const fallbackProvider = this.selectFallbackProvider(selectedProvider);
          const fallback = this.providers.get(fallbackProvider);
          
          if (!fallback) {
            throw new Error(`Fallback provider ${fallbackProvider} not found`);
          }

          logger.info(`Using fallback provider ${fallbackProvider} for call ${callId}`);
          return await fallback.initiateCall(fromPhone, toPhone, callMode);
        }
      );

      await stateMachine.transition('first_call_answered');

      if (callMode === 'bridge') {
        await this.handleBridgeCall(callId, fromPhone, toPhone, selectedProvider, stateMachine);
      }

      return callId;

    } catch (error) {
      logger.error(`Call ${callId} failed:`, error);
      await stateMachine.transition('error_occurred', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      this.activeCalls.delete(callId);
      this.processQueue();
    }
  }

  private async handleBridgeCall(
    callId: string,
    fromPhone: string,
    toPhone: string,
    providerName: string,
    stateMachine: CallStateMachine
  ): Promise<void> {
    try {
      await stateMachine.transition('second_call_started');
      await stateMachine.transition('second_call_ringing');

      const provider = this.providers.get(providerName);
      if (!provider) {
        throw new Error(`Provider ${providerName} not found`);
      }

      if ('initiateSecondCall' in provider && typeof provider.initiateSecondCall === 'function') {
        await (provider as any).initiateSecondCall(callId, toPhone);
        await stateMachine.transition('second_call_answered');
        
        await stateMachine.transition('bridge_started');
        
        if ('bridgeCalls' in provider && typeof provider.bridgeCalls === 'function') {
          await (provider as any).bridgeCalls(callId);
          await stateMachine.transition('bridge_completed');
        }
      } else {
        logger.warn(`Provider ${providerName} does not support two-step call flow`);
        await stateMachine.transition('bridge_completed');
      }

    } catch (error) {
      logger.error(`Bridge call ${callId} failed:`, error);
      await stateMachine.transition('error_occurred', {
        error: error instanceof Error ? error.message : 'Bridge call failed'
      });
    }
  }

  private selectProvider(preferredProvider?: string, callMode?: 'bridge' | 'headset'): string {
    if (preferredProvider && this.providers.has(preferredProvider)) {
      const health = this.flowEngine.getProviderHealth();
      if (health[preferredProvider]?.isHealthy) {
        return preferredProvider;
      }
    }

    if (this.config.enableIntelligentRouting) {
      return this.selectIntelligentProvider(callMode);
    }

    return this.selectRandomProvider();
  }

  private selectIntelligentProvider(callMode?: 'bridge' | 'headset'): string {
    const health = this.flowEngine.getProviderHealth();
    const availableProviders = Array.from(this.providers.keys())
      .filter(provider => health[provider]?.isHealthy !== false);

    if (availableProviders.length === 0) {
      throw new Error('No healthy providers available');
    }

    const metrics = this.flowEngine.getAllMetrics();
    const providerScores = new Map<string, number>();

    for (const provider of availableProviders) {
      let score = 100; // Base score

      const providerMetrics = metrics.filter(m => m.provider === provider);
      if (providerMetrics.length > 0) {
        const successRate = providerMetrics.filter(m => m.status === 'success').length / providerMetrics.length;
        const avgDuration = providerMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / providerMetrics.length;
        
        score += successRate * 50; // Success rate bonus
        score -= (avgDuration / 1000) * 0.1; // Duration penalty
      }

      const healthData = health[provider];
      if (healthData) {
        score -= healthData.failureRate * 100; // Failure rate penalty
      }

      providerScores.set(provider, score);
    }

    const sortedProviders = Array.from(providerScores.entries())
      .sort(([, a], [, b]) => b - a);

    return sortedProviders[0][0];
  }

  private selectFallbackProvider(excludeProvider: string): string {
    const availableProviders = Array.from(this.providers.keys())
      .filter(provider => provider !== excludeProvider);

    if (availableProviders.length === 0) {
      throw new Error('No fallback providers available');
    }

    return this.selectIntelligentProvider();
  }

  private selectRandomProvider(): string {
    const providers = Array.from(this.providers.keys());
    return providers[Math.floor(Math.random() * providers.length)];
  }

  private queueCall(
    callId: string,
    fromPhone: string,
    toPhone: string,
    callMode: 'bridge' | 'headset',
    priority: number = 1
  ): void {
    this.callQueue.push({
      callId,
      fromPhone,
      toPhone,
      callMode,
      priority,
      timestamp: new Date()
    });

    this.callQueue.sort((a, b) => b.priority - a.priority);
  }

  private processQueue(): void {
    while (this.callQueue.length > 0 && this.activeCalls.size < this.config.maxConcurrentCalls) {
      const queuedCall = this.callQueue.shift();
      if (queuedCall) {
        this.executeCall(
          queuedCall.callId,
          queuedCall.fromPhone,
          queuedCall.toPhone,
          queuedCall.callMode
        ).catch(error => {
          logger.error(`Failed to process queued call ${queuedCall.callId}:`, error);
        });
      }
    }
  }

  async endCall(callId: string): Promise<void> {
    const stateMachine = this.activeCalls.get(callId);
    if (stateMachine) {
      await stateMachine.transition('call_cancelled');
      this.activeCalls.delete(callId);
    }

    const queuedCallIndex = this.callQueue.findIndex(call => call.callId === callId);
    if (queuedCallIndex !== -1) {
      this.callQueue.splice(queuedCallIndex, 1);
    }
  }

  getCallStatus(callId: string): CallStatus | undefined {
    const stateMachine = this.activeCalls.get(callId);
    return stateMachine ? stateMachine.getCallStatus() : undefined;
  }

  getAllCallStatuses(): CallStatus[] {
    return Array.from(this.activeCalls.values()).map(sm => sm.getCallStatus());
  }

  getCallMetrics(callId: string): CallMetrics | undefined {
    return this.flowEngine.getCallMetrics(callId);
  }

  getSystemHealth(): {
    activeCalls: number;
    queuedCalls: number;
    providerHealth: { [provider: string]: { isHealthy: boolean; failureRate: number } };
    queueStatus: { activeCalls: number; queuedCalls: number; averageWaitTime: number };
  } {
    return {
      activeCalls: this.activeCalls.size,
      queuedCalls: this.callQueue.length,
      providerHealth: this.flowEngine.getProviderHealth(),
      queueStatus: this.flowEngine.getQueueStatus()
    };
  }

  private generateCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
