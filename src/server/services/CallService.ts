import { TelnyxCallBridge } from '../client/TelnyxCallBridge';
import { CallStatus } from '../../shared/types';
import { logger } from '../../shared/logger';
import { Server as SocketIOServer } from 'socket.io';

export class CallService {
  private telnyxClient: TelnyxCallBridge;
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.telnyxClient = new TelnyxCallBridge({
      apiKey: process.env.TELNYX_API_KEY || '',
    });
    
    this.telnyxClient.setStatusCallback((status: CallStatus) => {
      this.io.emit('callStatusUpdate', status);
    });
  }

  async initiateCall(fromPhone: string | undefined, toPhone: string, callMode: 'bridge' | 'headset' = 'bridge', provider: string = 'telnyx'): Promise<{ callId: string }> {
    const actualFromPhone = fromPhone || '';
    const callId = await this.telnyxClient.initiateCall(actualFromPhone, toPhone, callMode);
    return { callId };
  }

  async endCall(callId: string): Promise<void> {
    await this.telnyxClient.endCall(callId);
  }

  async getCallStatus(callId: string): Promise<CallStatus | undefined> {
    return this.telnyxClient.getCallStatus(callId);
  }

  async getAllCalls(): Promise<CallStatus[]> {
    return this.telnyxClient.getAllCallStatuses();
  }

  async clearAllCalls(): Promise<void> {
    this.telnyxClient.clearAllCallStatuses();
  }
}
