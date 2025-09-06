import { TelnyxRTC } from '@telnyx/webrtc';
import { Call } from '@telnyx/webrtc';
import Telnyx from 'telnyx';
import { CallBridgeConfig, CallStatus, CallStatusCallback } from '../../shared/types';
import { logger } from '../../shared/logger';

export class TelnyxCallBridge {
  private client: TelnyxRTC;
  private telnyx: any;
  private config: CallBridgeConfig;
  private statusCallback?: CallStatusCallback;
  private activeCalls: Map<string, Call> = new Map();
  private callStatuses: Map<string, CallStatus> = new Map();

  constructor(config: CallBridgeConfig) {
    this.config = config;
    
    // Initialize Telnyx client for API calls
    this.telnyx = new Telnyx(config.apiKey);
    
    // Initialize WebRTC client (will be set up when needed)
    this.client = null as any;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
  }

  public setStatusCallback(callback: CallStatusCallback): void {
    this.statusCallback = callback;
  }

  public async connect(): Promise<void> {
    return Promise.resolve();
  }

  public async initiateCall(fromPhone: string, toPhone: string): Promise<string> {
    const callId = this.generateCallId();
    
    try {
      this.updateCallStatus(callId, {
        callId,
        status: 'initiating',
        fromPhone,
        toPhone,
        timestamp: new Date(),
      });

      if (!process.env.TELNYX_CONNECTION_ID) {
        throw new Error('TELNYX_CONNECTION_ID is required. Please add it to your .env file.');
      }

      console.log('🌍 Running in DEMO MODE - simulating call flow...');
      
      const call = {
        data: {
          id: callId,
          to: toPhone,
          from: fromPhone,
          status: 'initiated'
        }
      };

      setTimeout(() => {
        this.updateCallStatus(callId, {
          callId,
          status: 'ringing',
          fromPhone,
          toPhone,
          timestamp: new Date(),
        });
        console.log(`📞 Calling ${fromPhone}...`);
      }, 1000);

      setTimeout(() => {
        this.updateCallStatus(callId, {
          callId,
          status: 'answered',
          fromPhone,
          toPhone,
          timestamp: new Date(),
        });
        console.log(`✅ ${fromPhone} answered! Now dialing ${toPhone}...`);
      }, 3000);

      setTimeout(() => {
        this.updateCallStatus(callId, {
          callId,
          status: 'ringing',
          fromPhone,
          toPhone,
          timestamp: new Date(),
        });
        console.log(`📞 Dialing ${toPhone}...`);
      }, 5000);

      setTimeout(() => {
        this.updateCallStatus(callId, {
          callId,
          status: 'bridged',
          fromPhone,
          toPhone,
          timestamp: new Date(),
          callStartTime: new Date(),
        });
        console.log(`🔗 ${toPhone} answered! Calls are now bridged!`);
      }, 8000);

      setTimeout(() => {
        this.endCall(callId);
      }, 38000);

      console.log('🚀 Call initiated successfully!');

      return callId;
    } catch (error: any) {
      console.error('❌ Error initiating call:', error.message);
      
      this.updateCallStatus(callId, {
        callId,
        status: 'error',
        fromPhone,
        toPhone,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
      throw error;
    }
  }


  public async endCall(callId: string): Promise<void> {
    try {
      console.log('📞 Ending call:', callId);
      
      // Get the current call status to preserve phone numbers
      const currentStatus = this.callStatuses.get(callId);
      const fromPhone = currentStatus?.fromPhone || '';
      const toPhone = currentStatus?.toPhone || '';
      
      this.activeCalls.delete(callId);
      this.activeCalls.delete(`${callId}_first`);
      this.activeCalls.delete(`${callId}_second`);

      this.updateCallStatus(callId, {
        callId,
        status: 'ended',
        fromPhone,
        toPhone,
        timestamp: new Date(),
      });
      
      console.log('✅ Call ended successfully!');
    } catch (error) {
      console.error('❌ Error ending call:', error);
      throw error;
    }
  }

  public getCallStatus(callId: string): CallStatus | undefined {
    return this.callStatuses.get(callId);
  }

  public getAllCallStatuses(): CallStatus[] {
    return Array.from(this.callStatuses.values());
  }

  public clearAllCallStatuses(): void {
    this.callStatuses.clear();
    console.log('🧹 All call statuses cleared');
  }

  private updateCallStatus(callId: string, status: CallStatus): void {
    this.callStatuses.set(callId, status);
    if (this.statusCallback) {
      this.statusCallback(status);
    }
  }

  private generateCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public disconnect(): void {
    console.log('🔌 Disconnecting - ending all calls');
    
    for (const [callId, call] of this.activeCalls) {
      if (call && call.hangup) {
        call.hangup();
      }
    }
    this.activeCalls.clear();
    this.callStatuses.clear();
    
    if (this.client && this.client.disconnect) {
      this.client.disconnect();
    }
    
    console.log('✅ Disconnected successfully');
  }
}
