import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { CallStatus } from '../types';

const SOCKET_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';

export const useSocket = () => {
  const [socket, setSocket] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [callStatuses, setCallStatuses] = useState<CallStatus[]>([]);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);

    newSocket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
    });

    newSocket.on('disconnect', (reason: string) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        setConnectionError('Server disconnected the connection');
      } else {
        setConnectionError('Connection lost');
      }
    });

    newSocket.on('connect_error', (error: any) => {
      setIsConnected(false);
      setConnectionError(`Connection failed: ${error.message || 'Unknown error'}`);
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
    connectionError,
    callStatuses,
    emit,
  };
};
