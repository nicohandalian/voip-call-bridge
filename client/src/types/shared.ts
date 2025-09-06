// Shared type definitions for the VoIP Call Bridge application

export interface CallStatus {
  callId: string;
  status: 'initiating' | 'ringing' | 'answered' | 'bridged' | 'ended' | 'error';
  fromPhone: string;
  toPhone: string;
  error?: string;
  timestamp: Date;
  callStartTime?: Date; // When the call was first answered
}

export interface CallBridgeConfig {
  apiKey: string;
  loginToken?: string;
  telnyxPhoneNumber?: string;
}

export type CallStatusCallback = (status: CallStatus) => void;

// API Request/Response types
export interface CallInitiateRequest {
  fromPhone: string;
  toPhone: string;
}

export interface CallInitiateResponse {
  success: boolean;
  callId?: string;
  message?: string;
  error?: string;
}

export interface CallStatusResponse {
  success: boolean;
  status?: CallStatus;
  error?: string;
}

export interface CallsResponse {
  success: boolean;
  calls?: CallStatus[];
  error?: string;
}

// Utility types
export type CallStatusType = CallStatus['status'];

export interface Logger {
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
}
