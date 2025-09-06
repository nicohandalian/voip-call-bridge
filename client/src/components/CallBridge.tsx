import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { useCallTimer } from '../hooks/useCallTimer';
import { useToast } from '../hooks/useToast';
import { validatePhoneNumber, getStatusColor, getStatusText } from '../utils/callUtils';
import Header from './Header';
import CallForm from './CallForm';
import CallStatusDisplay from './CallStatus';
import CallHistory from './CallHistory';
import MessageDisplay from './MessageDisplay';
import WebRTCHeadset from './WebRTCHeadset';
import ToastContainer from './ToastContainer';
import './CallBridge.css';

const API_BASE_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';

const CallBridge: React.FC = () => {
  const [fromPhone, setFromPhone] = useState('');
  const [toPhone, setToPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [showWebRTC, setShowWebRTC] = useState(false);
  const [webrtcError, setWebrtcError] = useState<string | null>(null);
  
  const { isConnected, callStatuses } = useSocket();
  const { toasts, removeToast, showSuccess, showError, showInfo } = useToast();

  const currentCall = activeCallId ? callStatuses.find(call => call.callId === activeCallId) : null;
  const timeInCall = useCallTimer(currentCall || null);


  useEffect(() => {
    if (error || webrtcError) {
      const timer = setTimeout(() => {
        setError(null);
        setWebrtcError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, webrtcError]);

  // Show toast notifications for call status changes
  useEffect(() => {
    if (currentCall) {
      switch (currentCall.status) {
        case 'answered':
          showInfo('📞 Call Answered!', 'First call answered, dialing second number...', 3000);
          break;
        case 'bridged':
          showSuccess('🔗 Calls Bridged!', 'Both parties can now talk!', 4000);
          break;
        case 'ended':
          showInfo('📴 Call Ended', 'The call has been completed', 2000);
          setActiveCallId(null);
          break;
        case 'error':
          showError('❌ Call Error', currentCall.error || 'An error occurred during the call', 5000);
          setActiveCallId(null);
          break;
      }
    }
  }, [currentCall, showSuccess, showError, showInfo]);


  const handleInitiateCall = async () => {
    if (!fromPhone || !toPhone) {
      setError('Please enter both phone numbers');
      return;
    }

    if (!validatePhoneNumber(fromPhone) || !validatePhoneNumber(toPhone)) {
      setError('Please enter valid phone numbers in international format (e.g., +1234567890)');
      return;
    }

    if (fromPhone === toPhone) {
      setError('From and To phone numbers cannot be the same');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.initiateCall({
        fromPhone,
        toPhone,
      });

      if (response.success && response.callId) {
        setActiveCallId(response.callId);
        showSuccess('🚀 Call Started!', 'Your call is being initiated...', 3000);
      } else {
        setError(response.error || 'Failed to initiate call');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate call');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndCall = async () => {
    if (!activeCallId) return;

    setIsLoading(true);
    try {
      await apiService.endCall(activeCallId);
      setActiveCallId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end call');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/calls`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        showSuccess('🧹 History Cleared!', 'All call history has been removed', 2000);
      } else {
        const errorData = await response.json();
        setError(`Failed to clear history: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      setError('Failed to clear history');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="call-bridge">
      <Header
        isConnected={isConnected}
      />

      <CallForm
        fromPhone={fromPhone}
        toPhone={toPhone}
        isLoading={isLoading}
        hasActiveCall={!!activeCallId}
        showWebRTC={showWebRTC}
        onFromPhoneChange={setFromPhone}
        onToPhoneChange={setToPhone}
        onInitiateCall={handleInitiateCall}
        onEndCall={handleEndCall}
        onToggleWebRTC={() => setShowWebRTC(!showWebRTC)}
        validatePhoneNumber={validatePhoneNumber}
      />

      <MessageDisplay
        error={error}
        webrtcError={webrtcError}
      />

      {showWebRTC && (
        <WebRTCHeadset
          onCallStatusChange={(status, call) => {}}
          onError={(error) => {
            setWebrtcError(error);
          }}
        />
      )}

      {currentCall && (
        <CallStatusDisplay
          call={currentCall}
          timeInCall={timeInCall}
          getStatusColor={getStatusColor}
          getStatusText={getStatusText}
        />
      )}

      <CallHistory
        callStatuses={callStatuses}
        isLoading={isLoading}
        onClearHistory={handleClearHistory}
        getStatusColor={getStatusColor}
        getStatusText={getStatusText}
      />

      <ToastContainer
        toasts={toasts}
        onRemoveToast={removeToast}
      />
    </div>
  );
};

export default CallBridge;
