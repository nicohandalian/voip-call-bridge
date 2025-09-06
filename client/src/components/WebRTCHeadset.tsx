import React, { useState, useEffect, useRef } from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';
import { Call } from '@telnyx/webrtc';
import './WebRTCHeadset.css';

interface WebRTCHeadsetProps {
  onCallStatusChange: (status: string, call?: Call) => void;
  onError: (error: string) => void;
}

const WebRTCHeadset: React.FC<WebRTCHeadsetProps> = ({
  onCallStatusChange,
  onError,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState<string>('disconnected');
  const [toPhone, setToPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const clientRef = useRef<TelnyxRTC | null>(null);
  const currentCallRef = useRef<Call | null>(null);

  useEffect(() => {
    const initializeClient = async () => {
    try {
      // Note: For WebRTC to work I need a login token from Telnyx
      const loginToken = process.env.REACT_APP_TELNYX_LOGIN_TOKEN || '';
      
      if (!loginToken) {
        console.log('WebRTC login token not configured. WebRTC headset calling is disabled.');
        setCallStatus('disabled');
        onCallStatusChange('disabled');
        return;
      }

      const client = new TelnyxRTC({
        login_token: loginToken,
      });

      client.on('telnyx.ready', () => {
        console.log('WebRTC client ready');
        setIsConnected(true);
        setCallStatus('ready');
        onCallStatusChange('ready');
      });

      client.on('telnyx.error', (error: any) => {
        console.error('WebRTC client error:', error);
        onError(`WebRTC error: ${error.message || 'Unknown error'}`);
        setCallStatus('error');
        onCallStatusChange('error');
      });

      clientRef.current = client;
      await client.connect();
    } catch (error) {
      console.error('Failed to initialize WebRTC client:', error);
      onError(`Failed to initialize WebRTC client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    };

    initializeClient();
    
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, [onCallStatusChange, onError]);

  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  };

  const handleStartCall = async () => {
    if (!clientRef.current || !toPhone) {
      onError('Please enter a phone number to call');
      return;
    }

    if (!validatePhoneNumber(toPhone)) {
      onError('Please enter a valid phone number in international format (e.g., +1234567890)');
      return;
    }

    setIsLoading(true);
    setCallStatus('initiating');
    onCallStatusChange('initiating');

    try {
      const call = clientRef.current.newCall({
        destinationNumber: toPhone,
        callerNumber: toPhone, // Use toPhone as caller for now
      });

      currentCallRef.current = call;
      setIsCallActive(true);

      (call as any).on('callUpdate', (callState: any) => {
        console.log('Call state:', callState.state);
        
        switch (callState.state) {
          case 'ringing':
            setCallStatus('ringing');
            onCallStatusChange('ringing', call);
            break;
          case 'active':
            setCallStatus('active');
            onCallStatusChange('active', call);
            break;
          case 'hangup':
            setCallStatus('ended');
            onCallStatusChange('ended', call);
            setIsCallActive(false);
            currentCallRef.current = null;
            break;
        }
      });

      (call as any).on('error', (error: any) => {
        console.error('Call error:', error);
        onError(`Call error: ${error.message || 'Unknown error'}`);
        setCallStatus('error');
        onCallStatusChange('error', call);
        setIsCallActive(false);
        currentCallRef.current = null;
      });

    } catch (error) {
      console.error('Failed to start call:', error);
      onError(`Failed to start call: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setCallStatus('error');
      onCallStatusChange('error');
      setIsCallActive(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndCall = () => {
    if (currentCallRef.current) {
      currentCallRef.current.hangup();
      currentCallRef.current = null;
    }
    setIsCallActive(false);
    setCallStatus('ready');
    onCallStatusChange('ready');
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'ready':
        return '#4ecdc4';
      case 'initiating':
        return '#ffa500';
      case 'ringing':
        return '#ff6b6b';
      case 'active':
        return '#45b7d1';
      case 'ended':
        return '#95a5a6';
      case 'error':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'ready':
        return 'Ready to call';
      case 'initiating':
        return 'Initiating call...';
      case 'ringing':
        return 'Ringing...';
      case 'active':
        return 'Call active - You can talk through your headset';
      case 'ended':
        return 'Call ended';
      case 'error':
        return 'Call error';
      case 'disabled':
        return 'WebRTC not configured - Use Call Bridge above';
      default:
        return 'Disconnected';
    }
  };

  return (
    <div className="webrtc-headset">
      <div className="headset-header">
        <h3>Headset Calling</h3>
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </div>

      <div className="headset-form">
        <div className="form-group">
          <label htmlFor="headsetToPhone">Phone Number to Call</label>
          <input
            id="headsetToPhone"
            type="tel"
            value={toPhone}
            onChange={(e) => setToPhone(e.target.value)}
            placeholder="+1234567890"
            disabled={isLoading || isCallActive || !isConnected || callStatus === 'disabled'}
            className={!toPhone || validatePhoneNumber(toPhone) ? '' : 'error'}
          />
        </div>

        <div className="button-group">
          {!isCallActive ? (
            <button
              onClick={handleStartCall}
              disabled={isLoading || !isConnected || !toPhone || callStatus === 'disabled'}
              className="primary-button"
            >
              {isLoading ? 'Starting Call...' : 'Start Call'}
            </button>
          ) : (
            <button
              onClick={handleEndCall}
              disabled={isLoading}
              className="danger-button"
            >
              End Call
            </button>
          )}
        </div>
      </div>

      <div className="headset-status">
        <div className="status-indicator">
          <div
            className="status-dot"
            style={{ backgroundColor: getStatusColor(callStatus) }}
          />
          <span>{getStatusText(callStatus)}</span>
        </div>
        
        {isCallActive && (
          <div className="call-info">
            <div><strong>Calling:</strong> {toPhone}</div>
            <div><strong>From:</strong> {toPhone}</div>
            <div className="call-instructions">
              💡 Use your computer's microphone and speakers to talk
            </div>
          </div>
        )}
      </div>

      {!isConnected && callStatus !== 'disabled' && (
        <div className="connection-help">
          <h4>Connection Required</h4>
          <p>Please ensure you have a valid Telnyx login token configured to use WebRTC headset calling.</p>
        </div>
      )}
    </div>
  );
};

export default WebRTCHeadset;
