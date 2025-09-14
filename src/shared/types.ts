export interface CallStatus {
  callId: string;
  status: 'initiating' | 'ringing' | 'answered' | 'bridged' | 'ended' | 'error';
  fromPhone?: string; // Optional for headset calls
  toPhone: string;
  error?: string;
  timestamp: Date;
  callStartTime?: Date;
  callMode?: 'bridge' | 'headset';
  provider?: string;
  demoMode?: boolean;
  apiError?: string;
}

export interface CallBridgeConfig {
  apiKey: string;
  loginToken?: string;
  telnyxPhoneNumber?: string;
}

export type CallStatusCallback = (status: CallStatus) => void;

export interface CallInitiateRequest {
  fromPhone?: string;
  toPhone: string;
  provider?: string;
  callMode?: 'bridge' | 'headset';
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

export type CallStatusType = CallStatus['status'];

export interface Logger {
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
}
