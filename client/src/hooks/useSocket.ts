import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { CallStatus } from '../types';

const SOCKET_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';

export const useSocket = () => {
  const [socket, setSocket] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [callStatuses, setCallStatuses] = useState<CallStatus[]>([]);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error: any) => {
      setIsConnected(false);
    });

    newSocket.on('callStatusUpdate', (data: CallStatus | CallStatus[]) => {
      if (Array.isArray(data)) {
        setCallStatuses(data);
      } else {
        setCallStatuses(prev => {
          const existingIndex = prev.findIndex(call => call.callId === data.callId);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = data;
            return updated;
          } else {
            return [...prev, data];
          }
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const emit = (event: string, data?: any) => {
    if (socket) {
      socket.emit(event, data);
    }
  };

  return {
    socket,
    isConnected,
    callStatuses,
    emit,
  };
};
