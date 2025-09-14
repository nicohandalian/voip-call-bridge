import React, { useState } from 'react';
import telnyxLogo from '../assets/telnyx.svg';
import sinchLogo from '../assets/sinch.png';
import infobipLogo from '../assets/infobip.png';
import './ProviderSelector.css';

interface Provider {
  type: string;
  name: string;
  configured: boolean;
}

interface ProviderSelectorProps {
  onProviderChange: (provider: string, configured: boolean) => void;
}

const ProviderSelector: React.FC<ProviderSelectorProps> = ({ onProviderChange }) => {
  const [providers] = useState<Provider[]>([
    { type: 'telnyx', name: 'Telnyx', configured: true },
    { type: 'sinch', name: 'Sinch', configured: true },
    { type: 'infobip', name: 'Infobip', configured: true }
  ]);
  const [currentProvider, setCurrentProvider] = useState<string>('telnyx');

  const handleProviderChange = (providerType: string) => {
    setCurrentProvider(providerType);
    const provider = providers.find(p => p.type === providerType);
    onProviderChange(providerType, provider?.configured || false);
  };

  return (
    <div className="provider-selector">
      <div className="provider-header">
        <p>Select your preferred voice service</p>
      </div>
      <div className="provider-options">
        {providers.map((provider) => (
          <button
            key={`${provider.type}-${currentProvider}`}
            className={`provider-option ${currentProvider === provider.type ? 'active' : ''} ${!provider.configured ? 'demo-mode' : ''}`}
            onClick={() => handleProviderChange(provider.type)}
            disabled={false}
            title={`Switch to ${provider.name}${!provider.configured ? ' (Demo Mode)' : ''}`}
          >
            {!provider.configured && (
              <div className="demo-badge">Demo</div>
            )}
            <div className="provider-icon">
              {provider.type === 'telnyx' && <img src={telnyxLogo} alt="Telnyx" />}
              {provider.type === 'sinch' && <img src={sinchLogo} alt="Sinch" />}
              {provider.type === 'infobip' && <img src={infobipLogo} alt="Infobip" />}
            </div>
            <div className="provider-info">
              <div className="provider-name">{provider.name}</div>
            </div>
            {currentProvider === provider.type && (
              <div className="current-indicator">✓</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProviderSelector;
