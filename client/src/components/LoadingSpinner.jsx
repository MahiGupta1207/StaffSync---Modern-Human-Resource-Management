import React from 'react';

const LoadingSpinner = ({ size = '', overlay = false, message = 'Loading...' }) => {
  if (overlay) {
    return (
      <div className="ss-loading-overlay">
        <div className={`ss-spinner ${size === 'lg' ? 'ss-spinner-lg' : ''}`} />
        <p>{message}</p>
      </div>
    );
  }
  return <div className={`ss-spinner ${size === 'sm' ? 'ss-spinner-sm' : size === 'lg' ? 'ss-spinner-lg' : ''}`} />;
};

export default LoadingSpinner;
