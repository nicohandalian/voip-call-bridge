import { ProviderManager } from '../providers/ProviderManager';
import { CallStatus } from '../../shared/types';
import { logger } from '../../shared/logger';
import { Server as SocketIOServer } from 'socket.io';

export class CallService {
  private providerManager: ProviderManager;
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.providerManager = new ProviderManager('telnyx');
    
    this.providerManager.setStatusCallback((status: CallStatus) => {
      this.io.emit('callStatusUpdate', status);
    });
  }

  async initiateCall(fromPhone: string | undefined, toPhone: string, callMode: 'bridge' | 'headset' = 'bridge', provider: string = 'telnyx'): Promise<{ callId: string }> {
    if (provider !== this.providerManager.getCurrentProviderType()) {
      this.providerManager.setProvider(provider as any);
      this.providerManager.setStatusCallback((status: CallStatus) => {
        this.io.emit('callStatusUpdate', status);
      });
    }
    
    const actualFromPhone = callMode === 'headset' ? '' : (fromPhone || '');
    const callId = await this.providerManager.initiateCall(actualFromPhone, toPhone, callMode);
    return { callId };
  }

  async endCall(callId: string): Promise<void> {
    await this.providerManager.endCall(callId);
  }

  async getCallStatus(callId: string): Promise<CallStatus | undefined> {
    return this.providerManager.getCallStatus(callId);
  }

  async getAllCalls(): Promise<CallStatus[]> {
    return this.providerManager.getAllCallStatuses();
  }

  async clearAllCalls(): Promise<void> {
    this.providerManager.clearAllCallStatuses();
  }
}
