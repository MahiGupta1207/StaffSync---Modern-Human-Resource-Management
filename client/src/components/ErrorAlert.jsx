import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ErrorAlert = ({ message, onRetry }) => (
  <div className="ss-alert ss-alert-danger" style={{ margin: '12px 0' }}>
    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
    <div style={{ flex: 1 }}>
      <span>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginLeft: 12,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            fontWeight: 600,
            fontSize: 12,
            textDecoration: 'underline',
          }}
        >
          Retry
        </button>
      )}
    </div>
  </div>
);

export default ErrorAlert;
