import React from 'react';
import { CallStatus as CallStatusType } from '../types';

interface CallStatusDisplayProps {
  call: CallStatusType;
  timeInCall: string;
  getStatusColor: (status: CallStatusType['status']) => string;
  getStatusText: (status: CallStatusType['status']) => string;
  callMode?: 'bridge' | 'headset';
}

const CallStatusDisplay: React.FC<CallStatusDisplayProps> = ({
  call,
  timeInCall,
  getStatusColor,
  getStatusText,
  callMode = 'bridge',
}) => {

  return (
    <div className="call-status-minimal">
      <div className="status-header-minimal">
        <div className="status-indicator">
          <div
            className="status-dot-minimal"
            style={{ backgroundColor: getStatusColor(call.status) }}
          />
          <span className="status-text-minimal">{getStatusText(call.status)}</span>
        </div>
        {timeInCall && (
          <div className="call-timer-minimal">{timeInCall}</div>
        )}
      </div>

      <div className="call-numbers-minimal">
        {(() => {
          const mode = call.callMode || callMode;
          
          if (mode === 'headset') {
            return (
              <div className="phone-minimal">
                <span className="phone-label-minimal">Calling</span>
                <span className="phone-value-minimal">{call.toPhone}</span>
              </div>
            );
          } else {
            return (
              <>
                <div className="phone-minimal">
                  <span className="phone-label-minimal">From</span>
                  <span className="phone-value-minimal">{call.fromPhone}</span>
                </div>
                <span className="arrow-minimal">→</span>
                <div className="phone-minimal">
                  <span className="phone-label-minimal">To</span>
                  <span className="phone-value-minimal">{call.toPhone}</span>
                </div>
              </>
            );
          }
        })()}
      </div>

      {call.error && (
        <div className="error-minimal">
          <span className="error-icon-minimal">⚠️</span>
          <span className="error-text-minimal">{call.error}</span>
        </div>
      )}
    </div>
  );
};

export default CallStatusDisplay;
