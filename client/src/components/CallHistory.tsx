import React from 'react';
import { CallStatus as CallStatusType } from '../types';

interface CallHistoryProps {
  callStatuses: CallStatusType[];
  isLoading: boolean;
  onClearHistory: () => void;
  getStatusColor: (status: CallStatusType['status']) => string;
  getStatusText: (status: CallStatusType['status']) => string;
}

const CallHistory: React.FC<CallHistoryProps> = ({
  callStatuses,
  isLoading,
  onClearHistory,
  getStatusColor,
  getStatusText,
}) => {
  return (
    <div className="call-history">
      <div className="history-header">
        <h3>Call History ({callStatuses.length} calls)</h3>
        {callStatuses.length > 0 && (
          <button 
            className="clear-history-btn"
            onClick={onClearHistory}
            disabled={isLoading}
          >
            Clear History
          </button>
        )}
      </div>
      {callStatuses.length > 0 ? (
        <div className="history-list">
          {callStatuses
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .map((call) => (
              <div key={call.callId} className="history-item">
                <div className="history-status">
                  <div
                    className="status-dot"
                    style={{ backgroundColor: getStatusColor(call.status) }}
                  />
                  <span>{getStatusText(call.status)}</span>
                </div>
                <div className="history-details">
                  <div>{call.fromPhone} → {call.toPhone}</div>
                  <div className="history-time">
                    {new Date(call.timestamp).toLocaleString()}
                  </div>
                  {call.callStartTime && call.status === 'ended' && (
                    <div className="call-duration">
                      Duration: {(() => {
                        const startTime = new Date(call.callStartTime!);
                        const endTime = new Date(call.timestamp);
                        const diffMs = endTime.getTime() - startTime.getTime();
                        const totalSeconds = Math.floor(diffMs / 1000);
                        const minutes = Math.floor(totalSeconds / 60);
                        const seconds = totalSeconds % 60;
                        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                      })()}
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="no-calls">
          <p>No calls yet. Start a call to see it here!</p>
        </div>
      )}
    </div>
  );
};

export default CallHistory;
