export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
  };
  socket: {
    url: string;
    reconnectAttempts: number;
    reconnectDelay: number;
  };
  ui: {
    messageTimeout: number;
    callTimeout: number;
  };
  features: {
    enableWebRTC: boolean;
    enableDebugMode: boolean;
  };
}

const getConfig = (): AppConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    api: {
      baseUrl: process.env.REACT_APP_SERVER_URL || 'http://localhost:3001',
      timeout: 10000,
    },
    socket: {
      url: process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001',
      reconnectAttempts: 5,
      reconnectDelay: 1000,
    },
    ui: {
      messageTimeout: 5000,
      callTimeout: 30000,
    },
    features: {
      enableWebRTC: process.env.REACT_APP_ENABLE_WEBRTC === 'true',
      enableDebugMode: isDevelopment,
    },
  };
};

export const appConfig = getConfig();
