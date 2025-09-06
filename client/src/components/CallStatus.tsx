import React from 'react';
import { CallStatus as CallStatusType } from '../types';

interface CallStatusDisplayProps {
  call: CallStatusType;
  timeInCall: string;
  getStatusColor: (status: CallStatusType['status']) => string;
  getStatusText: (status: CallStatusType['status']) => string;
}

const CallStatusDisplay: React.FC<CallStatusDisplayProps> = ({
  call,
  timeInCall,
  getStatusColor,
  getStatusText,
}) => {
  return (
    <div className="call-status">
      <h3>Call Status</h3>
      <div className="status-info">
        <div className="status-indicator">
          <div
            className="status-dot"
            style={{ backgroundColor: getStatusColor(call.status) }}
          />
          <span>{getStatusText(call.status)}</span>
        </div>
        <div className="call-details">
          <div><strong>From:</strong> {call.fromPhone}</div>
          <div><strong>To:</strong> {call.toPhone}</div>
          <div><strong>Call ID:</strong> {call.callId}</div>
          <div><strong>Started:</strong> {new Date(call.timestamp).toLocaleTimeString()}</div>
          {call.status === 'answered' && (
            <div className="call-phase">
              <strong>Phase:</strong> First call answered, dialing second number...
            </div>
          )}
          {call.status === 'ringing' && (
            <div className="call-phase">
              <strong>Phase:</strong> Calling second number...
            </div>
          )}
          {call.status === 'bridged' && (
            <div className="call-phase">
              <strong>Phase:</strong> Both calls connected and bridged
            </div>
          )}
          {timeInCall && (
            <div className="time-in-call">
              <strong>Time in call:</strong> 
              <span className="timer">{timeInCall}</span>
            </div>
          )}
        </div>
        {call.error && (
          <div className="error-details">
            <strong>Error:</strong> {call.error}
          </div>
        )}
      </div>
    </div>
  );
};

export default CallStatusDisplay;
