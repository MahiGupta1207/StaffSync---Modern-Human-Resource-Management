import React from 'react';
import { X, Mail, Phone, Building2, Briefcase, Calendar, User } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { formatDate, humanEnum, initials } from '../../utils/helpers';

const Row = ({ label, value }) => (
  <div style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid var(--ss-border)' }}>
    <span style={{ width: 140, fontSize: 12, color: 'var(--ss-text-muted)', fontWeight: 600, flexShrink: 0 }}>{label}</span>
    <span style={{ fontSize: 13, color: 'var(--ss-text)' }}>{value || '—'}</span>
  </div>
);

const EmployeeDetailModal = ({ employee: emp, onClose }) => {
  if (!emp) return null;
  return (
    <div className="ss-modal-overlay" onClick={onClose}>
      <div className="ss-modal ss-modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="ss-modal-header">
          <span className="ss-modal-title">Employee Details</span>
          <button className="ss-modal-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="ss-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Profile Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 20,
            padding: '20px', background: 'var(--ss-bg)', borderRadius: 10, marginBottom: 24
          }}>
            <div className="ss-avatar" style={{ width: 64, height: 64, fontSize: 22 }}>
              {initials(`${emp.firstName} ${emp.lastName}`)}
            </div>
            <div>
              <h3 style={{ fontSize: 18, margin: 0 }}>{emp.firstName} {emp.lastName}</h3>
              <p style={{ fontSize: 13, color: 'var(--ss-text-muted)', margin: '4px 0' }}>
                {emp.designation?.title || 'No designation'} · {emp.department?.name || 'No department'}
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <StatusBadge status={emp.employmentStatus} />
                <span style={{ fontSize: 11, background: 'var(--ss-mint)', color: 'var(--ss-primary)', borderRadius: 12, padding: '2px 8px', fontWeight: 600 }}>
                  {emp.employeeCode}
                </span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--ss-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Personal</div>
              <Row label="Full Name"    value={`${emp.firstName} ${emp.lastName}`} />
              <Row label="Email"        value={emp.email} />
              <Row label="Phone"        value={emp.phone} />
              <Row label="Gender"       value={humanEnum(emp.gender || '')} />
              <Row label="Date of Birth"value={formatDate(emp.dateOfBirth)} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--ss-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Employment</div>
              <Row label="Department"       value={emp.department?.name} />
              <Row label="Designation"      value={emp.designation?.title} />
              <Row label="Employment Type"  value={humanEnum(emp.employmentType || '')} />
              <Row label="Joining Date"     value={formatDate(emp.joiningDate)} />
              <Row label="Reporting To"     value={emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : '—'} />
            </div>
          </div>

          {/* Address */}
          {(emp.address?.city || emp.address?.street) && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--ss-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Address</div>
              <p style={{ fontSize: 13 }}>
                {[emp.address?.street, emp.address?.city, emp.address?.state, emp.address?.postalCode, emp.address?.country]
                  .filter(Boolean).join(', ')}
              </p>
            </div>
          )}

          {/* Emergency Contact */}
          {(emp.emergencyContact?.name || emp.emergencyContact?.phone) && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--ss-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Emergency Contact</div>
              <Row label="Name"         value={emp.emergencyContact?.name} />
              <Row label="Relationship" value={emp.emergencyContact?.relationship} />
              <Row label="Phone"        value={emp.emergencyContact?.phone} />
            </div>
          )}
        </div>
        <div className="ss-modal-footer">
          <button className="ss-btn ss-btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetailModal;
