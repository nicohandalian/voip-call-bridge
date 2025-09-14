import { BaseProvider } from './BaseProvider';
import { CallStatus } from '../../shared/types';
import { Telnyx } from 'telnyx';

export class TelnyxProvider extends BaseProvider {
  name = 'telnyx';
  displayName = 'Telnyx';
  private apiKey: string;
  private connectionId: string;
  private telnyx: Telnyx;

  constructor(apiKey: string, connectionId: string) {
    super();
    this.apiKey = apiKey;
    this.connectionId = connectionId;
    
    this.telnyx = new Telnyx(apiKey);
  }

  async initiateCall(fromPhone: string, toPhone: string, callMode: 'bridge' | 'headset' = 'bridge'): Promise<string> {
    const callId = this.generateCallId();
    
    const callStatus: any = {
      callId,
      status: 'initiating',
      toPhone,
      timestamp: new Date(),
      callMode,
      provider: 'telnyx',
    };
    
    if (callMode === 'bridge' && fromPhone) {
      callStatus.fromPhone = fromPhone;
    }
    
    this.updateCallStatus(callId, callStatus);

    try {
      if (this.apiKey === 'demo' || this.connectionId === 'demo') {
        console.log('Using demo mode - credentials set to demo');
        return this.simulateCall(callId, fromPhone, toPhone, callMode);
      }
      
      if (callMode === 'bridge' && fromPhone && toPhone) {
        await this.initiateCallBridge(callId, fromPhone, toPhone);
      } else if (callMode === 'headset') {


        console.log('Headset call initiated - using WebRTC in browser');
        
        const currentStatus = this.callStatuses.get(callId);
        if (currentStatus) {
          currentStatus.status = 'initiating';
          currentStatus.demoMode = false; // This is a real WebRTC call
          this.callStatuses.set(callId, currentStatus);
          this.updateCallStatus(callId, currentStatus);
        }
        
        return callId;
      } else {
        throw new Error('Invalid call mode or missing phone numbers');
      }

      return callId;
    } catch (error) {
      console.warn('API call failed, falling back to demo mode:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown API error';
      
      const errorStatus: any = {
        callId,
        status: 'error',
        toPhone,
        timestamp: new Date(),
        callMode,
        provider: 'telnyx',
        demoMode: true,
        apiError: errorMessage,
        error: `API failed, using demo mode: ${errorMessage}`
      };
      
      if (callMode === 'bridge' && fromPhone) {
        errorStatus.fromPhone = fromPhone;
      }
      
      this.updateCallStatus(callId, errorStatus);
      
      setTimeout(() => {
        const fallbackStatus: any = {
          callId,
          status: 'initiating',
          toPhone,
          timestamp: new Date(),
          callMode,
          provider: 'telnyx',
          demoMode: true,
          apiError: errorMessage
        };
        
        if (callMode === 'bridge' && fromPhone) {
          fallbackStatus.fromPhone = fromPhone;
        }
        
        this.updateCallStatus(callId, fallbackStatus);
        
        this.simulateCall(callId, fromPhone, toPhone, callMode);
      }, 2000);
      
      return callId;
    }
  }

  private async initiateCallBridge(callId: string, fromPhone: string, toPhone: string): Promise<void> {
    try {
      const firstCallResponse = await this.telnyx.calls.create({
        connection_id: this.connectionId,
        to: fromPhone,
        from: '+15551234567',
        webhook_url: `${process.env.SERVER_URL || 'http://localhost:3001'}/webhooks/telnyx`,
        client_state: JSON.stringify({ 
          callId, 
          bridgeMode: true, 
          targetNumber: toPhone,
          callStep: 'first'
        }),
        timeout_secs: 30,
        time_limit_secs: 600,
        answering_machine_detection: 'premium'
      } as any);

      const firstCallId = firstCallResponse.data?.call_control_id;
      
      const currentStatus = this.callStatuses.get(callId);
      if (currentStatus && firstCallId) {
        currentStatus.callId = firstCallId;
        this.callStatuses.set(callId, currentStatus);
      }

    } catch (error) {
      console.error('Telnyx API call failed:', error);
      throw new Error(`Failed to initiate call: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }



  private simulateCall(callId: string, fromPhone: string, toPhone: string, callMode: 'bridge' | 'headset'): string {
    setTimeout(() => {
      const currentStatus = this.callStatuses.get(callId);
      const status: any = {
        callId,
        status: 'ringing',
        toPhone,
        timestamp: new Date(),
        callMode,
        provider: 'telnyx',
        demoMode: currentStatus?.demoMode || false,
        apiError: currentStatus?.apiError
      };
      
      if (callMode === 'bridge' && fromPhone) {
        status.fromPhone = fromPhone;
      }
      
      this.updateCallStatus(callId, status);
    }, 1000);

    setTimeout(() => {
      const currentStatus = this.callStatuses.get(callId);
      const status: any = {
        callId,
        status: 'answered',
        toPhone,
        timestamp: new Date(),
        callMode,
        provider: 'telnyx',
        demoMode: currentStatus?.demoMode || false,
        apiError: currentStatus?.apiError
      };
      
      if (callMode === 'bridge' && fromPhone) {
        status.fromPhone = fromPhone;
      }
      
      this.updateCallStatus(callId, status);
    }, 3000);

    setTimeout(() => {
      const currentStatus = this.callStatuses.get(callId);
      const status: any = {
        callId,
        status: 'bridged',
        toPhone,
        timestamp: new Date(),
        callStartTime: new Date(),
        callMode,
        provider: 'telnyx',
        demoMode: currentStatus?.demoMode || false,
        apiError: currentStatus?.apiError
      };
      
      if (callMode === 'bridge' && fromPhone) {
        status.fromPhone = fromPhone;
      }
      
      this.updateCallStatus(callId, status);
    }, 5000);

    return callId;
  }

  async endCall(callId: string): Promise<void> {
    try {
      const currentStatus = this.callStatuses.get(callId);
      const toPhone = currentStatus?.toPhone || 'Unknown';
      const callMode = currentStatus?.callMode || 'bridge';
      const provider = currentStatus?.provider || 'telnyx';
      const isDemoMode = currentStatus?.demoMode || this.apiKey === 'demo' || this.connectionId === 'demo';


      if (callMode === 'bridge' && !isDemoMode && callId.startsWith('call_')) {
        try {
          await this.telnyx.calls.hangup(callId, {});
        } catch (apiError) {
          console.warn('Failed to hangup call via Telnyx API, continuing with local end:', apiError);
        }
      } else if (callMode === 'headset') {
        console.log('Headset call ended - WebRTC handles this in the browser');
      }

      const endStatus: any = {
        callId,
        status: 'ended',
        toPhone,
        timestamp: new Date(),
        callStartTime: currentStatus?.callStartTime,
        callMode,
        provider,
        demoMode: isDemoMode,
        apiError: currentStatus?.apiError
      };
      
      if (callMode === 'bridge' && currentStatus?.fromPhone) {
        endStatus.fromPhone = currentStatus.fromPhone;
      }

      this.updateCallStatus(callId, endStatus);
    } catch (error) {
      throw error;
    }
  }

  disconnect(): void {
    this.callStatuses.clear();
  }
}