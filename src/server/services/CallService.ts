import { TelnyxCallBridge } from '../client/TelnyxCallBridge';
import { CallStatus } from '../../shared/types';
import { logger } from '../../shared/logger';

export class CallService {
  private telnyxClient: TelnyxCallBridge;

  constructor() {
    this.telnyxClient = new TelnyxCallBridge({
      apiKey: process.env.TELNYX_API_KEY || '',
    });
  }

  async initiateCall(fromPhone: string, toPhone: string): Promise<{ callId: string }> {
    const callId = await this.telnyxClient.initiateCall(fromPhone, toPhone);
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
