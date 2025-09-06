import { CallInitiateRequest, CallInitiateResponse, CallStatusResponse, CallsResponse } from '../types';

const API_BASE_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async initiateCall(request: CallInitiateRequest): Promise<CallInitiateResponse> {
    return this.request<CallInitiateResponse>('/api/calls/initiate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async endCall(callId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    return this.request(`/api/calls/${callId}/end`, {
      method: 'POST',
    });
  }

  async getCallStatus(callId: string): Promise<CallStatusResponse> {
    return this.request<CallStatusResponse>(`/api/calls/${callId}/status`);
  }

  async getAllCalls(): Promise<CallsResponse> {
    return this.request<CallsResponse>('/api/calls');
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health');
  }
}

export const apiService = new ApiService();
export default apiService;
