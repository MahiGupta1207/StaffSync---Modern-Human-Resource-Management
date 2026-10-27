import React from 'react';
import { FolderOpen } from 'lucide-react';

const EmptyState = ({ icon: Icon = FolderOpen, title = 'Nothing here yet', message = '', action }) => (
  <div className="ss-empty">
    <div className="ss-empty-icon">
      <Icon size={32} />
    </div>
    <h4>{title}</h4>
    {message && <p>{message}</p>}
    {action && <div style={{ marginTop: 16 }}>{action}</div>}
  </div>
);

export default EmptyState;
