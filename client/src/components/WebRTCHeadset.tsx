import React, { useState, useEffect, useRef } from 'react';
import { TelnyxRTC } from '@telnyx/webrtc';
import { Call } from '@telnyx/webrtc';
import { appConfig } from '../config/appConfig';
import './WebRTCHeadset.css';

interface WebRTCHeadsetProps {
  toPhone: string;
  provider: string;
  onCallStatusChange: (status: string, call?: Call) => void;
}

const WebRTCHeadset: React.FC<WebRTCHeadsetProps> = ({
  toPhone,
  provider,
  onCallStatusChange,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState<string>('disconnected');
  const [isLoading, setIsLoading] = useState(false);

  const clientRef = useRef<TelnyxRTC | null>(null);
  const currentCallRef = useRef<Call | null>(null);
  const isDemoModeRef = useRef(false);
  const demoCallIdRef = useRef<string | null>(null);

  const shouldBeInDemoMode = !process.env.REACT_APP_TELNYX_WEBRTC_USERNAME || 
                            !process.env.REACT_APP_TELNYX_WEBRTC_PASSWORD ||
                            !appConfig.features.enableWebRTC;

  if (shouldBeInDemoMode && !isDemoModeRef.current) {
    isDemoModeRef.current = true;
  }

  useEffect(() => {
    if (shouldBeInDemoMode) {
      isDemoModeRef.current = true;
      setCallStatus('ready');
      onCallStatusChange('ready');
      return;
    }

    if (isDemoModeRef.current || callStatus === 'demo' || demoCallIdRef.current) {
      return;
    }

    const initializeClient = async () => {
    try {
      
      if (!appConfig.features.enableWebRTC) {
        console.warn('WebRTC is disabled in app config');
        setCallStatus('disabled');
        onCallStatusChange('disabled');
        return;
      }
      
      const username = process.env.REACT_APP_TELNYX_WEBRTC_USERNAME || '';
      const password = (process.env.REACT_APP_TELNYX_WEBRTC_PASSWORD || '').trim();
      
      console.log('WebRTC Environment Check:');
      console.log('- WebRTC Enabled:', appConfig.features.enableWebRTC);
      console.log('- Username:', username ? 'Set' : 'Missing');
      console.log('- Password:', password ? 'Set' : 'Missing');
      
      if (!username || !password) {
        console.warn('WebRTC credentials missing:', { username: !!username, password: !!password });
        setCallStatus('disabled');
        onCallStatusChange('disabled');
        return;
      }

      let client;
      try {
        console.log('Creating Telnyx WebRTC client...');
        console.log('Using credentials:', { username, password: password.substring(0, 3) + '...' });
        
        client = new TelnyxRTC({
          login: username,
          password: password,
        });
        
        console.log('Note: WebRTC may not be available in trial accounts. Using demo mode for demonstration.');
        console.log('Telnyx WebRTC client created successfully');
      } catch (error) {
        console.error('Failed to create TelnyxRTC client:', error);
        throw error;
      }

      client.on('telnyx.ready', () => {
        console.log('Telnyx WebRTC client is ready');
        setIsConnected(true);
        setCallStatus('ready');
        onCallStatusChange('ready');
      });
      
      client.on('telnyx.error', (error: any) => {
        console.log('Telnyx WebRTC error:', error);
        if (error.message && error.message.includes('trial')) {
          console.log('Trial account detected - WebRTC not available');
          setCallStatus('demo');
          setIsConnected(false);
        }
      });


      client.on('telnyx.socket.ready', () => {
        console.log('Telnyx WebRTC socket ready - attempting registration...');
      });

      client.on('telnyx.socket.connect', () => {
        console.log('Telnyx WebRTC socket connected');
      });

      client.on('telnyx.socket.disconnect', () => {
        console.log('Telnyx WebRTC socket disconnected');
        setIsConnected(false);
        setCallStatus('disconnected');
        onCallStatusChange('disconnected');
      });

      client.on('telnyx.error', (error: any) => {
        console.error('WebRTC client error:', error);
        setCallStatus('error');
        onCallStatusChange('error');
      });

      client.on('telnyx.socket.error', (error: any) => {
        console.error('WebRTC socket error:', error);
        

        if (error.code === 1006) {
          console.error('Authentication failed: SIP connection is unregistered');
        } else {
          console.error(`WebRTC connection error: ${error.message || 'Failed to connect to Telnyx servers'}`);
        }
        
        setCallStatus('error');
        onCallStatusChange('error');
      });

      client.on('telnyx.socket.close', (event: any) => {
        console.warn('WebRTC socket closed:', event);
        console.log('Close event details:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          type: event.type
        });
        

        if (event.code === 1006) {
          console.error('WebSocket closed abnormally (code 1006) - likely authentication failure');

        } else if (event.code === 1002) {
          console.error('WebSocket closed due to protocol error (code 1002)');

        } else if (event.code === 1003) {
          console.error('WebSocket closed due to unsupported data (code 1003)');

        } else {
          console.log('WebSocket closed normally with code:', event.code);
        }
        
        setIsConnected(false);
        setCallStatus('disconnected');
        onCallStatusChange('disconnected');
      });


      client.on('telnyx.notification', (notification: any) => {
        if (notification.type === 'userMediaError') {
          const error = notification.error;
          console.error('User media error:', error);
          setCallStatus('error');
          onCallStatusChange('error');
        }
      });

      clientRef.current = client;
      setCallStatus('connecting');
      onCallStatusChange('connecting');
      
      console.log('Connecting to Telnyx WebRTC...');
      

      const connectionTimeout = setTimeout(() => {
        if (!isConnected && !isDemoModeRef.current && !demoCallIdRef.current) {
          console.error('WebRTC connection timeout after 15 seconds');
          setCallStatus('error');
          onCallStatusChange('error');
        }
      }, 15000);
      

      client.on('telnyx.ready', () => {
        clearTimeout(connectionTimeout);
      });
      

      client.connect().catch((error: any) => {
        console.error('WebRTC connection failed:', error.message || 'Unknown error');
        clearTimeout(connectionTimeout);
        setCallStatus('error');
        onCallStatusChange('error');
      });


      return () => {
        clearTimeout(connectionTimeout);
      };
    } catch (error) {
      console.error('Failed to initialize WebRTC client:', error instanceof Error ? error.message : 'Unknown error');
      setCallStatus('error');
      onCallStatusChange('error');
    }
    };

    initializeClient();
    
    return () => {
      if (clientRef.current) {
        clientRef.current.off('telnyx.notification');
        clientRef.current.disconnect();
      }
    };
  }, [onCallStatusChange, isConnected, callStatus, shouldBeInDemoMode]);

  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  };

  const testMicrophonePermission = async () => {
    try {
      console.log('Testing microphone permission...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.log('Browser does not support microphone access');
        console.error('Browser does not support microphone access');
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      console.log('Microphone permission test successful:', stream);
      console.log('Microphone test successful! You can make calls.');
      

      stream.getTracks().forEach(track => track.stop());
      
    } catch (error) {
      console.error('Microphone permission test failed:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          console.error('Microphone permission denied. Please allow microphone access and try again.');
        } else if (error.name === 'NotFoundError') {
          console.error('No microphone found. Please connect a microphone and try again.');
        } else {
          console.error(`Microphone error: ${error.message}`);
        }
      } else {
        console.error('Failed to access microphone. Please check your browser permissions.');
      }
    }
  };

  const handleStartCall = async () => {
    
    if (!toPhone) {
      return;
    }

    if (!validatePhoneNumber(toPhone)) {
      return;
    }


    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return;
    }


    if (!isConnected || !clientRef.current) {
      

      isDemoModeRef.current = true;
      setCallStatus('demo');
      setIsCallActive(true);
      

      const demoCallId = 'demo-call-' + Date.now();
      demoCallIdRef.current = demoCallId;
      const demoCall = {
        callId: demoCallId,
        status: 'demo',
        fromPhone: 'WebRTC Headset',
        toPhone: toPhone,
        provider: provider,
        demoMode: true
      };
      onCallStatusChange('demo', demoCall as any);
      return;
    }

    setIsLoading(true);
    setCallStatus('initiating');
    onCallStatusChange('initiating');

    try {
      console.log('Starting WebRTC call to:', toPhone);
      

      let mediaStream: MediaStream | null = null;
      try {
        console.log('Requesting microphone permission...');
        

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('getUserMedia is not supported in this browser');
        }
        
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: false 
        });
        console.log('Microphone permission granted, stream obtained:', mediaStream);
        
      } catch (permissionError) {
        console.error('Microphone permission error:', permissionError);
        
        if (permissionError instanceof Error) {
          if (permissionError.name === 'NotAllowedError') {
            console.error('Microphone permission denied');
          } else if (permissionError.name === 'NotFoundError') {
            console.error('No microphone found');
          } else if (permissionError.name === 'NotReadableError') {
            console.error('Microphone is being used by another application');
          } else {
            console.error(`Microphone error: ${permissionError.message}`);
          }
        } else {
          console.error('Failed to access microphone');
        }
        
        setIsLoading(false);
        setCallStatus('ready');
        return;
      }
      

      console.log('Creating WebRTC call...');
      const call = clientRef.current.newCall({
        destinationNumber: toPhone,
      });

      console.log('Call object created:', call);
      currentCallRef.current = call;
      setIsCallActive(true);
      

      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        console.log('Test media stream cleaned up');
      }


      const callTimeout = setTimeout(() => {
        if (callStatus === 'initiating') {
          console.warn('Call appears to be stuck in initiating state');
          setCallStatus('error');
          onCallStatusChange('error');
          setIsCallActive(false);
          currentCallRef.current = null;
        }
      }, 30000); // 30 second timeout


      const clearTimeoutOnStateChange = () => {
        clearTimeout(callTimeout);
      };


      const handleCallNotification = (notification: any) => {
        console.log('Telnyx notification:', notification);
        
        if (notification.type === 'callUpdate') {
          const callState = notification.call;
          console.log('Call state update:', callState.state);
          clearTimeoutOnStateChange(); // Clear the timeout when we get any state update
          
          switch (callState.state) {
            case 'new':
              console.log('Call is new');
              setCallStatus('initiating');
              onCallStatusChange('initiating', call);
              break;
            case 'trying':
              console.log('Call is trying');
              setCallStatus('initiating');
              onCallStatusChange('initiating', call);
              break;
            case 'recovering':
              console.log('Call is recovering');
              setCallStatus('initiating');
              onCallStatusChange('initiating', call);
              break;
            case 'ringing':
              console.log('Call is ringing');
              setCallStatus('ringing');
              onCallStatusChange('ringing', call);
              break;
            case 'active':
              console.log('Call is active');
              setCallStatus('active');
              setIsCallActive(true);

              const activeCall = {
                callId: 'webrtc-call-' + Date.now(),
                status: 'active',
                fromPhone: 'WebRTC Headset',
                toPhone: toPhone,
                provider: provider,
                demoMode: false
              };
              onCallStatusChange('active', activeCall as any);
              break;
            case 'hangup':
              console.log(`Call ended: ${callState.cause} (Code: ${callState.causeCode})`);
              setCallStatus('ended');
              onCallStatusChange('ended', call);
              setIsCallActive(false);
              currentCallRef.current = null;

              if (clientRef.current) {
                clientRef.current.off('telnyx.notification', handleCallNotification);
              }
              break;
            case 'error':
              console.log('Call error:', callState.error);
              setCallStatus('error');
              onCallStatusChange('error', call);
              setIsCallActive(false);
              currentCallRef.current = null;
              console.error(`Call error: ${callState.error || 'Unknown error'}`);

              if (clientRef.current) {
                clientRef.current.off('telnyx.notification', handleCallNotification);
              }
              break;
            default:
              console.log('Unknown call state:', callState.state);
              break;
          }
        }
      };


      clientRef.current.on('telnyx.notification', handleCallNotification);

    } catch (error) {
      console.error('Failed to start WebRTC call:', error);
      console.error(`Failed to start call: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    isDemoModeRef.current = false;
    


    if (callStatus === 'demo' || demoCallIdRef.current) {

      const endedCall = {
        callId: demoCallIdRef.current,
        status: 'ended',
        fromPhone: 'WebRTC Headset',
        toPhone: toPhone,
        provider: provider,
        demoMode: true
      };
      onCallStatusChange('ended', endedCall as any);
      demoCallIdRef.current = null; // Clear the stored call ID
    } else {
      onCallStatusChange('ready');
    }
  };


  return (
    <div className="webrtc-headset">
      <div className="webrtc-controls">
        <div className="button-group">
          {!isCallActive ? (
            <>
              <button
                onClick={() => {
                  handleStartCall();
                }}
                disabled={isLoading || !toPhone}
                className="primary-btn"
              >
                {isLoading ? 'Starting Call...' : 'Start WebRTC Call'}
              </button>
              <button
                onClick={testMicrophonePermission}
                disabled={isLoading}
                className="secondary-btn"
              >
                Test Microphone
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                handleEndCall();
              }}
              disabled={isLoading}
              className="danger-btn"
            >
              End Call
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebRTCHeadset;
