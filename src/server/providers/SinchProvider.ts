import { BaseProvider } from './BaseProvider';
import { CallStatus } from '../../shared/types';

export class SinchProvider extends BaseProvider {
  name = 'sinch';
  displayName = 'Sinch';
  private apiKey: string;
  private servicePlanId: string;

  constructor(apiKey: string, servicePlanId: string) {
    super();
    this.apiKey = apiKey;
    this.servicePlanId = servicePlanId;
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
      provider: 'sinch',
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
          provider: 'sinch',
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
          provider: 'sinch',
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
          provider: 'sinch',
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
          provider: 'sinch',
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
        provider: 'sinch',
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
      const provider = currentStatus?.provider || 'sinch';

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
