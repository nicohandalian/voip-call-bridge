import { BaseProvider } from './BaseProvider';
import { CallStatus } from '../../shared/types';

export class SinchProvider extends BaseProvider {
  name = 'sinch';
  displayName = 'Sinch';
  private apiKey: string;
  private servicePlanId: string;
  private baseUrl = 'https://calling-api.sinch.com/v1/projects';

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

    if (this.apiKey === 'demo' || this.servicePlanId === 'demo') {
      return this.simulateCall(callId, fromPhone, toPhone, callMode);
    }

    try {
      const response = await fetch(`${this.baseUrl}/${this.servicePlanId}/calls`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'pstn',
          callId: callId,
          from: {
            type: 'number',
            endpoint: fromPhone
          },
          to: [
            {
              type: 'number',
              endpoint: fromPhone
            }
          ],
          instructions: [
            {
              name: 'say',
              text: 'Please wait while we connect your call.',
              locale: 'en-US'
            },
            {
              name: 'play',
              fileUri: 'silence://1000'
            },
            {
              name: 'connectPstn',
              destination: {
                type: 'number',
                endpoint: toPhone
              }
            }
          ],
          webhookUrl: `${process.env.SERVER_URL || 'http://localhost:3001'}/webhooks/sinch`
        })
      });

      if (!response.ok) {
        throw new Error(`Sinch API error: ${response.status} ${response.statusText}`);
      }

      const callData = await response.json();
      const sinchCallId = callData.callId || callId;

      this.updateCallStatus(callId, {
        callId,
        status: 'ringing',
        fromPhone,
        toPhone,
        timestamp: new Date(),
        callMode,
        provider: 'sinch',
        externalCallId: sinchCallId,
        demoMode: false
      });

      console.log('Sinch API call succeeded');

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
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private simulateCall(callId: string, fromPhone: string, toPhone: string, callMode: 'bridge' | 'headset'): string {
    setTimeout(() => {
      this.updateCallStatus(callId, {
        callId,
        status: 'ringing',
        fromPhone,
        toPhone,
        timestamp: new Date(),
        callMode,
        provider: 'sinch',
        demoMode: true,
        apiError: `Calling ${fromPhone}...`
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
        demoMode: true,
        apiError: `${fromPhone} answered`
      });
    }, 3000);

    if (callMode === 'bridge') {
      setTimeout(() => {
        this.updateCallStatus(callId, {
          callId,
          status: 'bridging',
          fromPhone,
          toPhone,
          timestamp: new Date(),
          callMode,
          provider: 'sinch',
          demoMode: true,
          apiError: `Now calling ${toPhone}...`
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
          demoMode: true,
          apiError: `Call connected: ${fromPhone} ↔ ${toPhone}`
        });
      }, 8000);
    } else {
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
          demoMode: true,
          apiError: `Headset call connected to ${fromPhone}`
        });
      }, 5000);
    }

    return callId;
  }

  async endCall(callId: string): Promise<void> {
    try {
      const currentStatus = this.callStatuses.get(callId);
      const fromPhone = currentStatus?.fromPhone || 'Unknown';
      const toPhone = currentStatus?.toPhone || 'Unknown';
      const callMode = currentStatus?.callMode || 'bridge';
      const provider = currentStatus?.provider || 'sinch';
      const externalCallId = currentStatus?.externalCallId;

      if (this.apiKey !== 'demo' && this.servicePlanId !== 'demo' && externalCallId) {
        try {
          await fetch(`${this.baseUrl}/${this.servicePlanId}/calls/${externalCallId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            }
          });
        } catch (apiError) {
          console.error('Failed to end Sinch call via API:', apiError);
        }
      }

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
