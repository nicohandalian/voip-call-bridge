import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CallStatus } from '../types/shared';
import './WebRTCHeadset.css';

interface SinchHeadsetProps {
  toPhone: string;
  onCallStatusChange: (status: string, call?: CallStatus) => void;
}

const SinchHeadset: React.FC<SinchHeadsetProps> = ({
  toPhone,
  onCallStatusChange
}) => {
  const [callStatus, setCallStatus] = useState<string>('ready');
  const [microphoneAllowed, setMicrophoneAllowed] = useState<boolean>(false);
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string>('');
  const isDemoModeRef = useRef<boolean>(false);

  const shouldBeInDemoMode = !process.env.REACT_APP_SINCH_API_KEY || 
                             process.env.REACT_APP_SINCH_API_KEY === 'demo' ||
                             process.env.REACT_APP_SINCH_SERVICE_PLAN_ID === 'demo';

  const generateCallId = () => `sinch-call-${Date.now()}`;

  const testMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      setMicrophoneAllowed(true);
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      mediaStreamRef.current = stream;
      
      setTimeout(() => {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
      }, 3000);
      
    } catch (error) {
      setMicrophoneAllowed(false);
      console.error('Microphone access denied:', error);
    }
  }, []);

  const initiateCall = useCallback(async () => {
    if (!toPhone.trim()) {
      console.error('Phone number is required');
      return;
    }

    const callId = generateCallId();
    callIdRef.current = callId;
    
    setCallStatus('initiating');
    onCallStatusChange('initiating', {
      callId,
      status: 'initiating',
      toPhone,
      timestamp: new Date(),
      callMode: 'headset',
      provider: 'sinch',
      fromPhone: 'Sinch Headset'
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      mediaStreamRef.current = stream;
      setMicrophoneAllowed(true);

      if (shouldBeInDemoMode) {
        isDemoModeRef.current = true;
        setCallStatus('demo');
        
        setTimeout(() => {
          setCallStatus('answered');
          onCallStatusChange('demo', {
            callId,
            status: 'answered',
            toPhone,
            timestamp: new Date(),
            callStartTime: new Date(),
            callMode: 'headset',
            provider: 'sinch',
            fromPhone: 'Sinch Headset',
            demoMode: true,
            apiError: 'Using demo mode - Sinch API not configured'
          });
        }, 2000);
        
        return;
      }

      const response = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromPhone: '',
          toPhone,
          callMode: 'headset',
          provider: 'sinch'
        })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setCallStatus('ringing');
        onCallStatusChange('ringing', {
          callId: result.callId,
          status: 'ringing',
          toPhone,
          timestamp: new Date(),
          callMode: 'headset',
          provider: 'sinch',
          fromPhone: 'Sinch Headset'
        });
        
        setTimeout(() => {
          setCallStatus('answered');
          onCallStatusChange('answered', {
            callId: result.callId,
            status: 'answered',
            toPhone,
            timestamp: new Date(),
            callStartTime: new Date(),
            callMode: 'headset',
            provider: 'sinch',
            fromPhone: 'Sinch Headset'
          });
        }, 3000);
      } else {
        throw new Error(result.error || 'Failed to initiate call');
      }

    } catch (error) {
      console.error('Sinch call initiation failed:', error);
      setCallStatus('error');
      onCallStatusChange('error', {
        callId,
        status: 'error',
        toPhone,
        timestamp: new Date(),
        callMode: 'headset',
        provider: 'sinch',
        fromPhone: 'Sinch Headset',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [toPhone, onCallStatusChange, shouldBeInDemoMode]);

  const endCall = useCallback(async () => {
    if (callStatus === 'demo') {
      setCallStatus('ended');
      onCallStatusChange('ended');
      isDemoModeRef.current = false;
      callIdRef.current = '';
      return;
    }

    if (!callIdRef.current) {
      return;
    }

    try {
      setCallStatus('ended');
      
      await fetch(`/api/calls/${callIdRef.current}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      onCallStatusChange('ended');
      callIdRef.current = '';

    } catch (error) {
      console.error('Failed to end Sinch call:', error);
    }
  }, [callStatus, onCallStatusChange]);

  const cleanup = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    setCallStatus('ready');
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);


  const isCallActive = callStatus === 'answered' || callStatus === 'demo';
  const canStartCall = callStatus === 'ready' && toPhone.trim() && microphoneAllowed;

  return (
    <div className="webrtc-headset">
      <div className="webrtc-controls">
        <div className="button-group">
          {!isCallActive ? (
            <>
              <button
                onClick={initiateCall}
                disabled={!canStartCall}
                className="primary-btn"
              >
                {callStatus === 'initiating' ? 'Starting Call...' : 'Start WebRTC Call'}
              </button>
              <button
                onClick={testMicrophone}
                disabled={isCallActive}
                className="secondary-btn"
              >
                Test Microphone
              </button>
            </>
          ) : (
            <button
              onClick={endCall}
              disabled={false}
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

export default SinchHeadset;
