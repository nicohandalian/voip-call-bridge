import React, { useEffect, useState } from 'react';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 4000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'warning': return '!';
      case 'info': return 'i';
      default: return 'i';
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div
      className={`toast ${isVisible ? 'toast-visible' : 'toast-hidden'} ${getBgColor()}`}
      onClick={() => {
        setIsVisible(false);
        setTimeout(() => onClose(id), 300);
      }}
    >
      <div className="toast-content">
        <div className="toast-icon">{getIcon()}</div>
        <div className="toast-text">
          <div className="toast-title">{title}</div>
          {message && <div className="toast-message">{message}</div>}
        </div>
        <button className="toast-close" onClick={(e) => {
          e.stopPropagation();
          setIsVisible(false);
          setTimeout(() => onClose(id), 300);
        }}>
          ×
        </button>
      </div>
    </div>
  );
};

export default Toast;
