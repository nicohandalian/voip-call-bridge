import React from 'react';

interface CallFormProps {
  fromPhone: string;
  toPhone: string;
  isLoading: boolean;
  hasActiveCall: boolean;
  showWebRTC: boolean;
  onFromPhoneChange: (phone: string) => void;
  onToPhoneChange: (phone: string) => void;
  onInitiateCall: () => void;
  onEndCall: () => void;
  onToggleWebRTC: () => void;
  validatePhoneNumber: (phone: string) => boolean;
}

const CallForm: React.FC<CallFormProps> = ({
  fromPhone,
  toPhone,
  isLoading,
  hasActiveCall,
  showWebRTC,
  onFromPhoneChange,
  onToPhoneChange,
  onInitiateCall,
  onEndCall,
  onToggleWebRTC,
  validatePhoneNumber,
}) => {
  return (
    <div className="call-form">
      <div className="form-group">
        <label htmlFor="fromPhone">From Phone Number</label>
        <input
          id="fromPhone"
          type="tel"
          value={fromPhone}
          onChange={(e) => onFromPhoneChange(e.target.value)}
          placeholder="+1234567890"
          disabled={isLoading || hasActiveCall}
          className={!fromPhone || validatePhoneNumber(fromPhone) ? '' : 'error'}
        />
      </div>

      <div className="form-group">
        <label htmlFor="toPhone">To Phone Number</label>
        <input
          id="toPhone"
          type="tel"
          value={toPhone}
          onChange={(e) => onToPhoneChange(e.target.value)}
          placeholder="+0987654321"
          disabled={isLoading || hasActiveCall}
          className={!toPhone || validatePhoneNumber(toPhone) ? '' : 'error'}
        />
      </div>

      <div className="button-group">
        {!hasActiveCall ? (
          <>
            <button
              onClick={onInitiateCall}
              disabled={isLoading}
              className="primary-button"
            >
              {isLoading ? 'Initiating...' : 'Dial'}
            </button>
            <button
              onClick={onToggleWebRTC}
              className="secondary-button"
            >
              {showWebRTC ? 'Hide' : 'Show'} WebRTC Headset
            </button>
          </>
        ) : (
          <button
            onClick={onEndCall}
            disabled={isLoading}
            className="danger-button"
          >
            {isLoading ? 'Ending...' : 'End Call'}
          </button>
        )}
      </div>
    </div>
  );
};

export default CallForm;
