import { CallInitiateRequest, CallInitiateResponse, CallStatusResponse, CallsResponse } from '../types';
import { apiService } from './api';

export interface ICallService {
  initiateCall(request: CallInitiateRequest): Promise<CallInitiateResponse>;
  endCall(callId: string): Promise<{ success: boolean; message?: string; error?: string }>;
  getCallStatus(callId: string): Promise<CallStatusResponse>;
  getAllCalls(): Promise<CallsResponse>;
  clearAllCalls(): Promise<{ success: boolean; message?: string; error?: string }>;
}

export class CallService implements ICallService {
  async initiateCall(request: CallInitiateRequest): Promise<CallInitiateResponse> {
    return apiService.initiateCall(request);
  }

  async endCall(callId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    return apiService.endCall(callId);
  }

  async getCallStatus(callId: string): Promise<CallStatusResponse> {
    return apiService.getCallStatus(callId);
  }

  async getAllCalls(): Promise<CallsResponse> {
    return apiService.getAllCalls();
  }

  async clearAllCalls(): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await fetch(`${process.env.REACT_APP_SERVER_URL || 'http://localhost:3001'}/api/calls`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to clear calls');
    }
    
    return response.json();
  }
}

export const callService = new CallService();
