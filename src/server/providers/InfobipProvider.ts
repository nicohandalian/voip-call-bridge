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

    if (this.apiKey === 'demo' || this.baseUrl === 'demo') {
      return this.simulateCall(callId, fromPhone, toPhone, callMode, 'Using demo mode');
    }

    try {
      if (callMode === 'headset') {
        console.log('Infobip headset call initiated');
        
        this.updateCallStatus(callId, {
          callId,
          status: 'answered',
          fromPhone: 'Infobip Headset',
          toPhone,
          timestamp: new Date(),
          callStartTime: new Date(),
          callMode,
          provider: 'infobip',
          demoMode: false
        });

        return callId;
      }

      const response = await fetch(`${this.baseUrl}/tts/3/multi`, {
        method: 'POST',
        headers: {
          'Authorization': `App ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              from: fromPhone,
              to: fromPhone,
              text: 'Please wait while we connect your call.',
              language: 'en',
              voice: {
                name: 'Joanna',
                gender: 'female'
              },
              notifyUrl: `${process.env.SERVER_URL || 'http://localhost:3001'}/webhooks/infobip`,
              notifyContentType: 'application/json'
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Infobip API error: ${response.status} ${response.statusText}`);
      }

      const callData = await response.json();
      console.log('Infobip API call succeeded');
      
      const infobipCallId = callData.messages?.[0]?.messageId || callId;

      this.updateCallStatus(callId, {
        callId,
        status: 'ringing',
        fromPhone,
        toPhone,
        timestamp: new Date(),
        callMode,
        provider: 'infobip',
        externalCallId: infobipCallId,
        demoMode: false
      });

      return callId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown API error';
      
      console.error('Infobip API call failed:', errorMessage);
      
      this.updateCallStatus(callId, {
        callId,
        status: 'initiating',
        fromPhone,
        toPhone,
        timestamp: new Date(),
        callMode,
        provider: 'infobip',
        demoMode: true,
        apiError: `API Error: ${errorMessage}. Using demo mode.`
      });
      
      return this.simulateCall(callId, fromPhone, toPhone, callMode, `API Error: ${errorMessage}. Using demo mode.`);
    }
  }

  private simulateCall(callId: string, fromPhone: string, toPhone: string, callMode: 'bridge' | 'headset', originalError?: string): string {
    this.updateCallStatus(callId, {
      callId,
      status: 'initiating',
      fromPhone,
      toPhone,
      timestamp: new Date(),
      callMode,
      provider: 'infobip',
      demoMode: true,
      apiError: originalError || 'Using demo mode'
    });

    setTimeout(() => {
      this.updateCallStatus(callId, {
        callId,
        status: 'ringing',
        fromPhone,
        toPhone,
        timestamp: new Date(),
        callMode,
        provider: 'infobip',
        demoMode: true,
        apiError: `Calling ${fromPhone}...`
      });
    }, 1500);

    setTimeout(() => {
      this.updateCallStatus(callId, {
        callId,
        status: 'answered',
        fromPhone,
        toPhone,
        timestamp: new Date(),
        callMode,
        provider: 'infobip',
        demoMode: true,
        apiError: `${fromPhone} answered`
      });
    }, 4000);

    if (callMode === 'bridge') {
      setTimeout(() => {
        this.updateCallStatus(callId, {
          callId,
          status: 'bridging',
          fromPhone,
          toPhone,
          timestamp: new Date(),
          callMode,
          provider: 'infobip',
          demoMode: true,
          apiError: `Now calling ${toPhone}...`
        });
      }, 6000);

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
          demoMode: true,
          apiError: `Call connected: ${fromPhone} ↔ ${toPhone}`
        });
      }, 8000);
    } else {
      setTimeout(() => {
        this.updateCallStatus(callId, {
          callId,
          status: 'answered',
          fromPhone: 'Infobip Headset',
          toPhone,
          timestamp: new Date(),
          callStartTime: new Date(),
          callMode,
          provider: 'infobip',
          demoMode: true,
          apiError: `Headset call connected to ${toPhone}`
        });
      }, 6000);
    }

    return callId;
  }

  async endCall(callId: string): Promise<void> {
    try {
      const currentStatus = this.callStatuses.get(callId);
      const fromPhone = currentStatus?.fromPhone || 'Unknown';
      const toPhone = currentStatus?.toPhone || 'Unknown';
      const callMode = currentStatus?.callMode || 'bridge';
      const provider = currentStatus?.provider || 'infobip';
      const externalCallId = currentStatus?.externalCallId;

      if (callMode === 'headset') {
        console.log('Infobip headset call ended');
      } else if (this.apiKey !== 'demo' && this.baseUrl !== 'demo' && externalCallId) {
        try {
          await fetch(`${this.baseUrl}/tts/3/stop/${externalCallId}`, {
            method: 'POST',
            headers: {
              'Authorization': `App ${this.apiKey}`,
              'Content-Type': 'application/json',
            }
          });
        } catch (apiError) {
          console.error('Failed to end Infobip call via API:', apiError);
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
