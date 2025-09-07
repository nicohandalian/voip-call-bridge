import { BaseProvider } from './BaseProvider';
import { CallStatus } from '../../shared/types';

export class InfobipProvider extends BaseProvider {
  name = 'infobip';
  displayName = 'Infobip';
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string) {
    super();
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
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
      provider: 'infobip',
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
          provider: 'infobip',
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
          provider: 'infobip',
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
          provider: 'infobip',
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
          provider: 'infobip',
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
        provider: 'infobip',
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
      const provider = currentStatus?.provider || 'infobip';

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
