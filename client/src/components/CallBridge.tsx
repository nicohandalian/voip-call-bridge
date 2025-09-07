import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { useCallTimer } from '../hooks/useCallTimer';
import { useToast } from '../hooks/useToast';
import { validatePhoneNumber, getStatusColor, getStatusText } from '../utils/callUtils';
import ProviderSelector from './ProviderSelector';
import CallStatusDisplay from './CallStatus';
import ToastContainer from './ToastContainer';
import './CallBridge.css';


const CallBridge: React.FC = () => {
  const [fromPhone, setFromPhone] = useState('');
  const [toPhone, setToPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [callMode, setCallMode] = useState<'bridge' | 'headset'>('bridge');

  const handleModeChange = (mode: 'bridge' | 'headset') => {
    setCallMode(mode);
    setError(null);
    if (mode === 'headset') {
      setFromPhone('');
    }
  };
  const [webrtcError, setWebrtcError] = useState<string | null>(null);
  const [currentProvider, setCurrentProvider] = useState<string>('telnyx');
  
  const { callStatuses } = useSocket();
  const { toasts, removeToast, showSuccess, showError, showInfo } = useToast();

  const currentCall = activeCallId ? callStatuses.find(call => call.callId === activeCallId) : null;
  const timeInCall = useCallTimer(currentCall || null);


  const handleProviderChange = (provider: string, configured: boolean) => {
    setCurrentProvider(provider);
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
    showInfo(`Switched to ${providerName}`, `Now using ${providerName} for voice calls`, 3000);
  };


  useEffect(() => {
    if (error || webrtcError) {
      const timer = setTimeout(() => {
        setError(null);
        setWebrtcError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, webrtcError]);


  useEffect(() => {
    if (currentCall) {
      switch (currentCall.status) {
        case 'answered':
          showInfo('Call Answered!', 'First call answered, dialing second number...', 3000);
          break;
        case 'bridged':
          showSuccess('Calls Bridged!', 'Both parties can now talk!', 4000);
          break;
        case 'ended':
          showInfo('Call Ended', 'The call has been completed', 2000);
          setActiveCallId(null);
          break;
        case 'error':
          showError('Call Error', currentCall.error || 'An error occurred during the call', 5000);
          setActiveCallId(null);
          break;
      }
    }
  }, [currentCall, showSuccess, showError, showInfo]);


  const handleInitiateCall = useCallback(async () => {
    if (callMode === 'bridge') {
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
    } else {
      if (!toPhone) {
        setError('Please enter a phone number to call');
        return;
      }
      if (!validatePhoneNumber(toPhone)) {
        setError('Please enter a valid phone number in international format (e.g., +1234567890)');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload = callMode === 'bridge' 
        ? { fromPhone, toPhone, provider: currentProvider, callMode }
        : { toPhone, provider: currentProvider, callMode };
      
      const response = await apiService.initiateCall(payload);

      if (response.success && response.callId) {
        setActiveCallId(response.callId);
        setFromPhone('');
        setToPhone('');
        showSuccess('Call Started!', 'Your call is being initiated...', 3000);
      } else {
        setError(response.error || 'Failed to initiate call');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate call');
    } finally {
      setIsLoading(false);
    }
  }, [callMode, fromPhone, toPhone, currentProvider, showSuccess, setError]);

  const handleEndCall = useCallback(async () => {
    if (!activeCallId) {
      showError('No Active Call', 'There is no active call to end', 3000);
      return;
    }

    setIsLoading(true);
    try {
      await apiService.endCall(activeCallId);
      setActiveCallId(null);
    } catch (err) {
      showError('Failed to End Call', err instanceof Error ? err.message : 'Failed to end call', 5000);
    } finally {
      setIsLoading(false);
    }
  }, [activeCallId, showError]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (!isLoading && !activeCallId) {
          handleInitiateCall();
        }
      }
      if (e.key === 'Escape' && activeCallId) {
        e.preventDefault();
        handleEndCall();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isLoading, activeCallId, handleInitiateCall, handleEndCall]);

  return (
    <div className="call-bridge">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-title">
            <h1>VoIP Call Bridge</h1>
            <p className="header-subtitle">Professional Call Bridging</p>
          </div>
        </div>
      </div>

        <div className="dashboard-grid">
          <div className="dashboard-section call-controls">
            <div className="section-header">
              <h2>Call Controls</h2>
              <p>Initiate and manage call bridges</p>
            </div>
            <div className="controls-row">
              <div className="controls-provider">
                <ProviderSelector onProviderChange={handleProviderChange} />
              </div>
              <div className="controls-separator"></div>
              <div className="controls-main">
          <div className="call-form">
            <form onSubmit={(e) => { e.preventDefault(); handleInitiateCall(); }} title="Press Ctrl+Enter to start call">
              {callMode === 'bridge' ? (
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="fromPhone">From Number</label>
                    <input
                      type="tel"
                      id="fromPhone"
                      value={fromPhone}
                      onChange={(e) => setFromPhone(e.target.value)}
                      placeholder="+1234567890"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="toPhone">To Number</label>
                    <input
                      type="tel"
                      id="toPhone"
                      value={toPhone}
                      onChange={(e) => setToPhone(e.target.value)}
                      placeholder="+0987654321"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="toPhone">Phone Number to Call</label>
                        <input
                          type="tel"
                          id="toPhone"
                          value={toPhone}
                          onChange={(e) => setToPhone(e.target.value)}
                          placeholder="+1234567890"
                          required
                        />
                  </div>
                </div>
              )}
              <div className="call-mode-toggle">
                <div className="toggle-container">
                  <button
                    type="button"
                    className={`toggle-option ${callMode === 'bridge' ? 'active' : ''}`}
                    onClick={() => handleModeChange('bridge')}
                  >
                    <span className="toggle-icon">🌐</span>
                    <span className="toggle-text">Call Bridge</span>
                    <span className="toggle-desc">Connect two external numbers</span>
                  </button>
                  <button
                    type="button"
                    className={`toggle-option ${callMode === 'headset' ? 'active' : ''}`}
                    onClick={() => handleModeChange('headset')}
                  >
                    <span className="toggle-icon">🎧</span>
                    <span className="toggle-text">WebRTC Headset</span>
                    <span className="toggle-desc">Use your browser's mic & speakers</span>
                  </button>
                </div>
              </div>

              <div className="button-group">
                {!activeCallId ? (
                  callMode === 'bridge' ? (
                    <button type="submit" disabled={isLoading} className="primary-btn">
                      {isLoading ? 'Initiating...' : 'Start Call Bridge'}
                    </button>
                  ) : (
                    <button type="submit" disabled={isLoading} className="primary-btn">
                      {isLoading ? 'Starting...' : 'Start WebRTC Call'}
                    </button>
                  )
                ) : (
                  <button type="button" onClick={handleEndCall} className="danger-btn" disabled={isLoading}>
                    {isLoading ? 'Ending...' : 'End Call'}
                  </button>
                )}
              </div>
            </form>
            {error && <div className="error-message">{error}</div>}
            {webrtcError && <div className="error-message">{webrtcError}</div>}
          </div>
              </div>
            </div>
          </div>

        {currentCall && (
          <div className="dashboard-section call-status-section">
            <div className="section-header">
              <h2>Active Call Status</h2>
              <p>Real-time call information</p>
            </div>
            <CallStatusDisplay
              call={currentCall}
              timeInCall={timeInCall}
              getStatusColor={getStatusColor}
              getStatusText={getStatusText}
              callMode={callMode}
            />
          </div>
        )}


      </div>

      <ToastContainer
        toasts={toasts}
        onRemoveToast={removeToast}
      />
    </div>
  );
};

export default CallBridge;
