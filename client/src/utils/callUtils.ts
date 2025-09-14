import { CallStatus } from '../types';

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
};

export const getStatusColor = (status: CallStatus['status']): string => {
  switch (status) {
    case 'initiating':
      return '#ffa500';
    case 'ringing':
      return '#ff6b6b';
    case 'answered':
      return '#4ecdc4';
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
    switch (status) {
      case 'answered':
        return 'Demo call active';
      default:
        return 'Demo call active';
    }
  }


  switch (status) {
    case 'initiating':
      return 'Initiating call bridge...';
    case 'ringing':
      return 'Ringing...';
    case 'answered':
      return 'Call answered! Dialing second number...';
    case 'bridged':
      return 'Calls bridged! Both parties can now talk.';
    case 'ended':
      return 'Call ended';
    case 'error':
      return 'Call error';
    default:
      return 'Unknown status';
  }
};
