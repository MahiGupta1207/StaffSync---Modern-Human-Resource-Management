import React from 'react';
import { humanEnum } from '../utils/helpers';

const STATUS_MAP = {
  // Leave
  PENDING:  'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED:'neutral',
  // Employment
  ACTIVE:     'success',
  ON_LEAVE:   'warning',
  SUSPENDED:  'danger',
  TERMINATED: 'neutral',
  // Attendance
  PRESENT:          'success',
  LATE:             'warning',
  HALF_DAY:         'info',
  WORK_FROM_HOME:   'mint',
  ABSENT:           'danger',
  // Training
  ENROLLED:   'info',
  IN_PROGRESS:'warning',
  COMPLETED:  'success',
  DROPPED:    'neutral',
  UPCOMING:   'info',
  // Announcement
  PUBLISHED: 'success',
  DRAFT:     'neutral',
  ARCHIVED:  'neutral',
  // Payroll
  PROCESSED: 'info',
  PAID:      'success',
};

const StatusBadge = ({ status, label }) => {
  const variant = STATUS_MAP[status] || 'neutral';
  return (
    <span className={`ss-status ss-status-${variant}`}>
      {label || humanEnum(status)}
    </span>
  );
};

export default StatusBadge;
