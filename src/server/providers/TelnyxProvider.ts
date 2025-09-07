import { BaseProvider } from './BaseProvider';
import { CallStatus } from '../../shared/types';

export class TelnyxProvider extends BaseProvider {
  name = 'telnyx';
  displayName = 'Telnyx';
  private apiKey: string;
  private connectionId: string;

  constructor(apiKey: string, connectionId: string) {
    super();
    this.apiKey = apiKey;
    this.connectionId = connectionId;
  }

  async initiateCall(fromPhone: string, toPhone: string, callMode: 'bridge' | 'headset' = 'bridge'): Promise<string> {
    const callId = this.generateCallId();
    
    this.updateCallStatus(callId, {
      callId,
      status: 'initiating',
      fromPhone,
      toPhone,
      timestamp: new Date(),
      callMode,
      provider: 'telnyx',
    });

    try {
      setTimeout(() => {
        this.updateCallStatus(callId, {
          callId,
          status: 'ringing',
          fromPhone,
          toPhone,
          timestamp: new Date(),
          callMode,
          provider: 'telnyx',
        });
      }, 1000);

      setTimeout(() => {
        this.updateCallStatus(callId, {
          callId,
          status: 'answered',
          fromPhone,
          toPhone,
          timestamp: new Date(),
          callMode,
          provider: 'telnyx',
        });
      }, 3000);

      setTimeout(() => {
        this.updateCallStatus(callId, {
          callId,
          status: 'ringing',
          fromPhone,
          toPhone,
          timestamp: new Date(),
          callMode,
          provider: 'telnyx',
        });
      }, 5000);

      setTimeout(() => {
        this.updateCallStatus(callId, {
          callId,
          status: 'bridged',
          fromPhone,
          toPhone,
          timestamp: new Date(),
          callStartTime: new Date(),
          callMode,
          provider: 'telnyx',
        });
      }, 8000);

      return callId;
    } catch (error) {
      this.updateCallStatus(callId, {
        callId,
        status: 'error',
        fromPhone,
        toPhone,
        timestamp: new Date(),
        callMode,
        provider: 'telnyx',
      });
      throw error;
    }
  }

  async endCall(callId: string): Promise<void> {
    try {
      const currentStatus = this.callStatuses.get(callId);
      const fromPhone = currentStatus?.fromPhone || 'Unknown';
      const toPhone = currentStatus?.toPhone || 'Unknown';
      const callMode = currentStatus?.callMode || 'bridge';
      const provider = currentStatus?.provider || 'telnyx';

      this.updateCallStatus(callId, {
        callId,
        status: 'ended',
        fromPhone,
        toPhone,
        timestamp: new Date(),
        callStartTime: currentStatus?.callStartTime,
        callMode,
        provider,
      });
    } catch (error) {
      throw error;
    }
  }

  disconnect(): void {
    this.callStatuses.clear();
  }
}