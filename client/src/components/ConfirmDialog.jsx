import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

const ConfirmDialog = ({
  isOpen,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  variant      = 'danger',
  loading      = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="ss-modal-overlay" onClick={onCancel}>
      <div className="ss-modal ss-modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="ss-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={18} color="var(--ss-warning)" />
            <span className="ss-modal-title">{title}</span>
          </div>
          <button className="ss-modal-close" onClick={onCancel}><X size={14} /></button>
        </div>
        <div className="ss-modal-body">
          <p style={{ fontSize: 14, color: 'var(--ss-text)', lineHeight: 1.6 }}>{message}</p>
        </div>
        <div className="ss-modal-footer">
          <button className="ss-btn ss-btn-outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            className={`ss-btn ${variant === 'danger' ? 'ss-btn-danger' : 'ss-btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <><LoadingSpinner size="sm" />&nbsp;Processing…</> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
