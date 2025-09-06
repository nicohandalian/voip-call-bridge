import React from 'react';

interface HeaderProps {
  isConnected: boolean;
}

const Header: React.FC<HeaderProps> = ({
  isConnected,
}) => {
  return (
    <div className="header">
      <h1>VoIP Call Bridge</h1>
      <div className="header-status-row">
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '🟢 Connected' : '🟡 Connecting...'}
        </div>
      </div>
    </div>
  );
};

export default Header;
