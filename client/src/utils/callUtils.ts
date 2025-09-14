import { CallStatus } from '../types';

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

export const parseCallStartTime = (callStartTime: any): Date | null => {
  if (!callStartTime) return null;
  
  if (callStartTime instanceof Date) {
    return callStartTime;
  }
  
  if (typeof callStartTime === 'string') {
    const parsed = new Date(callStartTime);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  
  if (typeof callStartTime === 'number') {
    const parsed = new Date(callStartTime);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  
  return null;
};

export const getStatusColor = (status: CallStatus['status']): string => {
  switch (status) {
    case 'initiating':
      return '#ffa500';
    case 'ringing':
      return '#ff6b6b';
    case 'answered':
      return '#4ecdc4';
    case 'bridging':
      return '#9b59b6';
    case 'bridged':
      return '#45b7d1';
    case 'ended':
      return '#95a5a6';
    case 'error':
      return '#e74c3c';
    default:
      return '#95a5a6';
  }
};

export const getStatusText = (status: CallStatus['status'], call?: CallStatus): string => {
  if (call?.demoMode) {
    if (call.apiError && call.apiError !== 'Using demo mode - Infobip API simulation') {
      return call.apiError;
    }
    
    switch (status) {
      case 'initiating':
        return 'Starting demo call...';
      case 'ringing':
        return `Calling ${call.toPhone}...`;
      case 'answered':
        return `${call.toPhone} answered`;
      case 'bridging':
        return `Connecting ${call.fromPhone} to ${call.toPhone}...`;
      case 'bridged':
        return `Call connected: ${call.fromPhone} ↔ ${call.toPhone}`;
      case 'ended':
        return 'Demo call ended';
      case 'error':
        return 'Demo call error';
      default:
        return 'Demo call in progress...';
    }
  }

  const getProviderName = (provider?: string): string => {
    const providerNames: { [key: string]: string } = {
      'telnyx': 'Telnyx',
      'sinch': 'Sinch',
      'infobip': 'Infobip'
    };
    return providerNames[provider || ''] || 'Unknown Provider';
  };

  const getCallProgress = (call?: CallStatus): string => {
    if (!call) return '';
    
    const callStartTime = parseCallStartTime(call.callStartTime);
    const duration = callStartTime 
      ? Math.floor((Date.now() - callStartTime.getTime()) / 1000)
      : 0;
    
    if (duration > 0) {
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      return ` (${minutes}:${seconds.toString().padStart(2, '0')})`;
    }
    return '';
  };

  switch (status) {
    case 'initiating':
      if (call?.callMode === 'headset') {
        return `Initiating headset call to ${call.toPhone} via ${getProviderName(call.provider)}...`;
      }
      return `Initiating call from ${call?.fromPhone || 'first number'} via ${getProviderName(call?.provider)}...`;
    
    case 'ringing':
      if (call?.callMode === 'headset') {
        return `Calling ${call.toPhone} via ${getProviderName(call.provider)}...`;
      }
      return `Calling ${call?.fromPhone || 'first number'} via ${getProviderName(call?.provider)}...`;
    
    case 'answered':
      if (call?.callMode === 'headset') {
        return `Connected to ${call.toPhone} via ${getProviderName(call.provider)}${getCallProgress(call)}`;
      }
      return `${call?.fromPhone || 'First number'} answered! Dialing ${call?.toPhone || 'second number'} via ${getProviderName(call?.provider)}...`;
    
    case 'bridging':
      return `Connecting ${call?.fromPhone} to ${call?.toPhone} via ${getProviderName(call?.provider)}...`;
    
    case 'bridged':
      return `Call connected: ${call?.fromPhone} ↔ ${call?.toPhone} via ${getProviderName(call?.provider)}${getCallProgress(call)}`;
    
    case 'ended':
      return `Call ended via ${getProviderName(call?.provider)}`;
    
    case 'error':
      const errorMsg = call?.error || 'Call error occurred';
      const provider = getProviderName(call?.provider);
      return `Error via ${provider}: ${errorMsg}`;
    
    default:
      return `Unknown status via ${getProviderName(call?.provider)}`;
  }
};

export const getCallQuality = (call?: CallStatus): 'excellent' | 'good' | 'fair' | 'poor' | 'unknown' => {
  if (!call || !call.callStartTime) return 'unknown';
  
  const callStartTime = parseCallStartTime(call.callStartTime);
  if (!callStartTime) return 'unknown';
  
  const duration = Date.now() - callStartTime.getTime();
  const minutes = duration / (1000 * 60);
  
  if (call.status === 'error') return 'poor';
  if (call.status === 'bridged' && minutes > 0.5) return 'excellent';
  if (call.status === 'bridged') return 'good';
  if (call.status === 'answered') return 'fair';
  
  return 'unknown';
};

export const getCallEfficiency = (call?: CallStatus): number => {
  if (!call || !call.callStartTime) return 0;
  
  const callStartTime = parseCallStartTime(call.callStartTime);
  if (!callStartTime) return 0;
  
  const duration = Date.now() - callStartTime.getTime();
  const seconds = duration / 1000;
  
  if (call.status === 'bridged') {
    return Math.min(100, Math.max(0, 100 - (seconds * 2)));
  }
  
  return 0;
};

export const formatCallDuration = (call?: CallStatus): string => {
  if (!call || !call.callStartTime) return '00:00';
  
  const callStartTime = parseCallStartTime(call.callStartTime);
  if (!callStartTime) return '00:00';
  
  const duration = Math.floor((Date.now() - callStartTime.getTime()) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};
