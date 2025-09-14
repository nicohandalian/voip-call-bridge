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
  const [currentProvider, setCurrentProvider] = useState<string>('telnyx');
  
  const { callStatuses, isConnected, connectionError } = useSocket();
  const { toasts, removeToast, showSuccess, showError, showInfo } = useToast();


  const allCallStatuses = [...callStatuses];
  const currentCall = activeCallId ? allCallStatuses.find(call => call.callId === activeCallId) : 
    (allCallStatuses.length > 0 ? allCallStatuses[0] : null);
  
  
  const timeInCall = useCallTimer(currentCall || null);




  const handleProviderChange = (provider: string, configured: boolean) => {
    setCurrentProvider(provider);
    const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
    showInfo(`Switched to ${providerName}`, `Now using ${providerName} for voice calls`, 3000);
  };


  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (connectionError) {
      showError('Connection Error', connectionError, 6000);
    }
  }, [connectionError, showError]);

  useEffect(() => {
    if (isConnected) {
      showSuccess('Connected', 'Real-time updates enabled', 2000);
    }
  }, [isConnected, showSuccess]);


  useEffect(() => {
    if (currentCall) {
      switch (currentCall.status) {
        case 'answered':
          if (currentCall.demoMode) {
            showInfo('Demo Call Answered!', 'Simulated call answered - this is demo mode', 3000);
          } else {
            showInfo('Call Answered!', 'First call answered, dialing second number...', 3000);
          }
          break;
        case 'bridged':
          if (currentCall.demoMode) {
            showSuccess('Demo Calls Bridged!', 'Simulated call bridge - this is demo mode', 4000);
          } else {
            showSuccess('Calls Bridged!', 'Both parties can now talk!', 4000);
          }
          break;
        case 'ended':
          if (currentCall.demoMode) {
            showInfo('Demo Call Ended', 'Simulated call completed', 2000);
          } else {
            showInfo('Call Ended', 'The call has been completed', 2000);
          }
          setActiveCallId(null);
          break;
        case 'error':
          if (currentCall.demoMode && currentCall.apiError) {
            showError('API Error - Demo Mode Active', `Telnyx API failed: ${currentCall.apiError}. Using demo mode for testing.`, 8000);
          } else {
            showError('Call Error', currentCall.error || 'An error occurred during the call', 5000);
          }
          if (!currentCall.demoMode) {
            setActiveCallId(null);
          }
          break;
      }
    }
  }, [currentCall, showSuccess, showError, showInfo]);


  const handleInitiateCall = useCallback(async () => {
    if (callMode === 'bridge') {
      if (!fromPhone || !toPhone) {
        const errorMsg = 'Please enter both phone numbers';
        setError(errorMsg);
        showError('Validation Error', errorMsg, 4000);
        return;
      }
      if (!validatePhoneNumber(fromPhone) || !validatePhoneNumber(toPhone)) {
        const errorMsg = 'Please enter valid phone numbers in international format (e.g., +1234567890)';
        setError(errorMsg);
        showError('Invalid Phone Numbers', errorMsg, 5000);
        return;
      }
      if (fromPhone === toPhone) {
        const errorMsg = 'From and To phone numbers cannot be the same';
        setError(errorMsg);
        showError('Invalid Configuration', errorMsg, 4000);
        return;
      }
    } else {
      if (!toPhone) {
        const errorMsg = 'Please enter a phone number to call';
        setError(errorMsg);
        showError('Validation Error', errorMsg, 4000);
        return;
      }
      if (!validatePhoneNumber(toPhone)) {
        const errorMsg = 'Please enter a valid phone number in international format (e.g., +1234567890)';
        setError(errorMsg);
        showError('Invalid Phone Number', errorMsg, 5000);
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
        const errorMsg = response.error || 'Failed to initiate call';
        setError(errorMsg);
        showError('Call Initiation Failed', errorMsg, 6000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate call';
      setError(errorMessage);
      
      let errorTitle = 'Call Initiation Failed';
      let errorDetails = errorMessage;
      
      if (err instanceof Error) {
        const status = (err as any).status;
        const details = (err as any).details;
        
        if (status === 422) {
          errorTitle = 'Invalid Parameters';
          errorDetails = details ? `Validation error: ${JSON.stringify(details)}` : errorMessage;
        } else if (status === 401) {
          errorTitle = 'Authentication Failed';
          errorDetails = 'Please check your API credentials';
        } else if (status === 403) {
          errorTitle = 'Access Denied';
          errorDetails = 'Your account does not have permission for this action';
        } else if (status >= 500) {
          errorTitle = 'Server Error';
          errorDetails = 'The server encountered an error. Please try again later.';
        }
      }
      
      showError(errorTitle, errorDetails, 8000);
    } finally {
      setIsLoading(false);
    }
  }, [callMode, fromPhone, toPhone, currentProvider, showSuccess, setError, showError]);

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
      const errorMessage = err instanceof Error ? err.message : 'Failed to end call';
      let errorTitle = 'Failed to End Call';
      let errorDetails = errorMessage;
      
      if (err instanceof Error) {
        const status = (err as any).status;
        const details = (err as any).details;
        
        if (status === 404) {
          errorTitle = 'Call Not Found';
          errorDetails = 'The call may have already ended or does not exist';
        } else if (status === 422) {
          errorTitle = 'Invalid Call State';
          errorDetails = details ? `Cannot end call: ${JSON.stringify(details)}` : errorMessage;
        } else if (status >= 500) {
          errorTitle = 'Server Error';
          errorDetails = 'Unable to end call due to server error. Please try again.';
        }
      }
      
      showError(errorTitle, errorDetails, 6000);
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
            <div className="connection-status">
              <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
                <span className="status-dot"></span>
                <span className="status-text">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
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
            <div className="call-mode-toggle">
              <div className="toggle-container">
                <button
                  type="button"
                  className={`toggle-option ${callMode === 'bridge' ? 'active' : ''}`}
                  onClick={() => handleModeChange('bridge')}
                >
                  <span className="toggle-icon">Bridge</span>
                  <span className="toggle-text">Call Bridge</span>
                  <span className="toggle-desc">Connect two external numbers</span>
                </button>
                <button
                  type="button"
                  className={`toggle-option ${callMode === 'headset' ? 'active' : ''}`}
                  onClick={() => handleModeChange('headset')}
                >
                  <span className="toggle-icon">Headset</span>
                  <span className="toggle-text">WebRTC Headset</span>
                  <span className="toggle-desc">Use your browser's mic & speakers</span>
                </button>
              </div>
            </div>

            {callMode === 'bridge' ? (
              <form onSubmit={(e) => { e.preventDefault(); handleInitiateCall(); }} title="Press Ctrl+Enter to start call">
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
                <div className="button-group">
                  {!activeCallId ? (
                    <button type="submit" disabled={isLoading} className="primary-btn">
                      {isLoading ? 'Initiating...' : 'Start Call Bridge'}
                    </button>
                  ) : (
                    <button type="button" onClick={handleEndCall} className="danger-btn" disabled={isLoading}>
                      {isLoading ? 'Ending...' : 'End Call'}
                    </button>
                  )}
                </div>
                {error && <div className="error-message">{error}</div>}
              </form>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleInitiateCall(); }} title="Press Ctrl+Enter to start call">
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
                <div className="button-group">
                  {!activeCallId ? (
                    <button type="submit" disabled={isLoading} className="primary-btn">
                      {isLoading ? 'Initiating...' : 'Start Call'}
                    </button>
                  ) : (
                    <button type="button" onClick={handleEndCall} className="danger-btn" disabled={isLoading}>
                      {isLoading ? 'Ending...' : 'End Call'}
                    </button>
                  )}
                </div>
                {error && <div className="error-message">{error}</div>}
              </form>
            )}
            
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
              call={currentCall!}
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
