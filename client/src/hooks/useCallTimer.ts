import { useState, useEffect } from 'react';
import { CallStatus } from '../types';

export const useCallTimer = (call: CallStatus | null) => {
  const [timeInCall, setTimeInCall] = useState<string>('');

  useEffect(() => {
    if (!call || !call.callStartTime || call.status === 'ended' || call.status === 'error') {
      setTimeInCall('');
      return;
    }

    // Show timer only when calls are bridged - both parties can talk
    // Timer starts when both calls are connected and bridged
    if (call.status !== 'bridged') {
      setTimeInCall('');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const startTime = new Date(call.callStartTime!); // Non-null assertion since we checked above
      const diffMs = now.getTime() - startTime.getTime();
      
      if (diffMs < 0) {
        setTimeInCall('');
        return;
      }

      const totalSeconds = Math.floor(diffMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      setTimeInCall(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [call?.callStartTime, call?.status]);

  return timeInCall;
};
