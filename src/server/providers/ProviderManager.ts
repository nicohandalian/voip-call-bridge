import { VoiceProvider } from './BaseProvider';
import { ProviderFactory, ProviderType } from './ProviderFactory';
import { CallStatus } from '../../shared/types';

export class ProviderManager {
  private currentProvider: VoiceProvider;
  private providerType: ProviderType;

  constructor(defaultProvider: ProviderType = 'telnyx') {
    this.providerType = defaultProvider;
    this.currentProvider = ProviderFactory.createProvider(defaultProvider);
  }

  setProvider(type: ProviderType): void {
    if (this.providerType !== type) {
      this.currentProvider.disconnect();
      this.providerType = type;
      this.currentProvider = ProviderFactory.createProvider(type);
    }
  }

  getCurrentProvider(): VoiceProvider {
    return this.currentProvider;
  }

  getCurrentProviderType(): ProviderType {
    return this.providerType;
  }

  getAvailableProviders() {
    return ProviderFactory.getAvailableProviders();
  }

  async initiateCall(fromPhone: string, toPhone: string, callMode: 'bridge' | 'headset' = 'bridge'): Promise<string> {
    return this.currentProvider.initiateCall(fromPhone, toPhone, callMode);
  }

  async endCall(callId: string): Promise<void> {
    return this.currentProvider.endCall(callId);
  }

  getCallStatus(callId: string) {
    return this.currentProvider.getCallStatus(callId);
  }

  getAllCallStatuses() {
    return this.currentProvider.getAllCallStatuses();
  }

  clearAllCallStatuses(): void {
    this.currentProvider.clearAllCallStatuses();
  }

  setStatusCallback(callback: (status: CallStatus) => void): void {
    this.currentProvider.setStatusCallback(callback);
  }

  disconnect(): void {
    this.currentProvider.disconnect();
  }
}
