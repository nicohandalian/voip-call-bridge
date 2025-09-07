import { CallStatus } from '../../shared/types';

export interface VoiceProvider {
  name: string;
  displayName: string;
  initiateCall(fromPhone: string, toPhone: string, callMode?: 'bridge' | 'headset'): Promise<string>;
  endCall(callId: string): Promise<void>;
  getCallStatus(callId: string): CallStatus | undefined;
  getAllCallStatuses(): CallStatus[];
  clearAllCallStatuses(): void;
  disconnect(): void;
  setStatusCallback(callback: (status: CallStatus) => void): void;
}

export abstract class BaseProvider implements VoiceProvider {
  abstract name: string;
  abstract displayName: string;
  protected callStatuses = new Map<string, CallStatus>();
  protected statusCallback?: (status: CallStatus) => void;

  abstract initiateCall(fromPhone: string, toPhone: string, callMode?: 'bridge' | 'headset'): Promise<string>;
  abstract endCall(callId: string): Promise<void>;
  abstract disconnect(): void;

  getCallStatus(callId: string): CallStatus | undefined {
    return this.callStatuses.get(callId);
  }

  getAllCallStatuses(): CallStatus[] {
    return Array.from(this.callStatuses.values());
  }

  clearAllCallStatuses(): void {
    this.callStatuses.clear();
  }

  setStatusCallback(callback: (status: CallStatus) => void): void {
    this.statusCallback = callback;
  }

  protected updateCallStatus(callId: string, status: CallStatus): void {
    this.callStatuses.set(callId, status);
    if (this.statusCallback) {
      this.statusCallback(status);
    }
  }

  protected generateCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
