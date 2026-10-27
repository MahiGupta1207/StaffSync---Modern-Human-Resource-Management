import React from 'react';
import { initials } from '../utils/helpers';

const StatCard = ({ label, value, icon: Icon, color = 'var(--ss-primary)', bg }) => (
  <div className="ss-stat-card">
    <div
      className="ss-stat-icon"
      style={{ background: bg || `${color}18`, color }}
    >
      {Icon && <Icon size={22} />}
    </div>
    <div className="ss-stat-info">
      <div className="ss-stat-value">{value ?? '—'}</div>
      <div className="ss-stat-label">{label}</div>
    </div>
  </div>
);

export default StatCard;
