import React from 'react';

interface MessageDisplayProps {
  error: string | null;
  webrtcError: string | null;
}

const MessageDisplay: React.FC<MessageDisplayProps> = ({
  error,
  webrtcError,
}) => {
  return (
    <>
      {error && (
        <div className="message error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {webrtcError && (
        <div className="message error">
          <span>⚠️</span>
          <span>{webrtcError}</span>
        </div>
      )}
    </>
  );
};

export default MessageDisplay;
