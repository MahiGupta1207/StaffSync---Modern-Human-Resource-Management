import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { employeeService, departmentService } from '../../services/index';
import { getErrorMsg } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';

const EmployeeFormModal = ({ employee, onClose, onSaved }) => {
  const isEdit = !!employee;
  const [form, setForm]     = useState({
    employeeCode: '',
    fullName: '', email: '', phone: '', gender: 'PREFER_NOT_TO_SAY',
    dateOfBirth: '', joiningDate: new Date().toISOString().split('T')[0],
    department: '', designation: '', manager: '', employmentStatus: 'ACTIVE', employmentType: 'FULL_TIME',
    baseSalary: '',
    createUserAccount: false, accountRole: 'EMPLOYEE', accountPassword: '',
    // address
    street: '', city: '', state: '', postalCode: '', country: 'India',
  });
  const [departments, setDepts] = useState([]);
  const [designations, setDesigs] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (isEdit && employee) {
      setForm({
        employeeCode: employee.employeeCode || '',
        fullName:  `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
        email:     employee.email     || '',
        phone:     employee.phone     || '',
        gender:    employee.gender    || 'PREFER_NOT_TO_SAY',
        dateOfBirth:  employee.dateOfBirth  ? employee.dateOfBirth.split('T')[0]  : '',
        joiningDate:  employee.joiningDate  ? employee.joiningDate.split('T')[0]  : '',
        department:   employee.department?._id || employee.department || '',
        designation:  employee.designation?._id || employee.designation || '',
        manager:      employee.manager?._id || employee.manager || '',
        employmentStatus: employee.employmentStatus || 'ACTIVE',
        employmentType:   employee.employmentType   || 'FULL_TIME',
        baseSalary: employee.baseSalary || '',
        createUserAccount: false, accountRole: 'EMPLOYEE', accountPassword: '',
        street:   employee.address?.street   || '',
        city:     employee.address?.city     || '',
        state:    employee.address?.state    || '',
        postalCode: employee.address?.postalCode || '',
        country:  employee.address?.country  || 'India',
      });
    }
  }, [employee, isEdit]);

  useEffect(() => {
    departmentService.getAll()
      .then((r) => setDepts(r.data.departments || []))
      .catch(() => {});

    // Fetch potential managers
    employeeService.getAll({ limit: 100 })
      .then((r) => {
        const list = (r.data.employees || []).filter(e => !employee || e._id !== employee._id);
        setManagers(list);
      })
      .catch(() => {});
  }, [employee]);

  useEffect(() => {
    if (form.department) {
      departmentService.getDesignations({ department: form.department })
        .then((r) => setDesigs(r.data.designations || []))
        .catch(() => {});
    } else {
      setDesigs([]);
    }
  }, [form.department]);

  const handleChange = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
    if (field === 'department') setForm((prev) => ({ ...prev, designation: '', [field]: val }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.fullName.trim() || !form.email) {
      setError('Full name and email are required.');
      return;
    }
    // Split full name → firstName + lastName
    const nameParts = form.fullName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName  = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0];

    setSaving(true);
    setError('');
    try {
      const payload = {
        employeeCode: form.employeeCode.trim().toUpperCase() || undefined,
        firstName, lastName, email: form.email,
        phone: form.phone, gender: form.gender,
        dateOfBirth: form.dateOfBirth || undefined,
        joiningDate: form.joiningDate || undefined,
        department:  form.department  || undefined,
        designation: form.designation || undefined,
        manager:     form.manager      || undefined,
        employmentStatus: form.employmentStatus,
        employmentType:   form.employmentType,
        baseSalary: form.baseSalary ? Number(form.baseSalary) : 0,
        address: { street: form.street, city: form.city, state: form.state, postalCode: form.postalCode, country: form.country },
        createUserAccount: form.createUserAccount,
        accountRole: form.accountRole,
        accountPassword: form.accountPassword,
      };
      if (isEdit) {
        await employeeService.update(employee._id, payload);
      } else {
        await employeeService.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const F = ({ label, children, required }) => (
    <div className="ss-form-group">
      <label className="ss-label">{label}{required && <span style={{ color: 'var(--ss-danger)' }}>*</span>}</label>
      {children}
    </div>
  );

  return (
    <div className="ss-modal-overlay" onClick={onClose}>
      <div className="ss-modal ss-modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="ss-modal-header">
          <span className="ss-modal-title">{isEdit ? 'Edit Employee' : 'Add New Employee'}</span>
          <button className="ss-modal-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="ss-modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          {error && (
            <div className="ss-alert ss-alert-danger" style={{ marginBottom: 16 }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <F label="Full Name" required>
                <input
                  className="ss-input"
                  value={form.fullName}
                  onChange={handleChange('fullName')}
                  placeholder="e.g. Mahak Gupta"
                  autoFocus
                />
              </F>
              <F label="Employee ID / Code">
                <input
                  className="ss-input"
                  value={form.employeeCode}
                  onChange={handleChange('employeeCode')}
                  placeholder={isEdit ? "e.g. EMP-1001" : "Auto-generated if blank"}
                />
              </F>
              <F label="Work Email" required>
                <input className="ss-input" type="email" value={form.email} onChange={handleChange('email')} placeholder="work@company.com" disabled={isEdit} />
              </F>
              <F label="Phone">
                <input className="ss-input" value={form.phone} onChange={handleChange('phone')} placeholder="+91 XXXXX XXXXX" />
              </F>
              <F label="Gender">
                <select className="ss-input ss-select" value={form.gender} onChange={handleChange('gender')}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </F>
              <F label="Date of Birth">
                <input className="ss-input" type="date" value={form.dateOfBirth} onChange={handleChange('dateOfBirth')} />
              </F>
              <F label="Joining Date">
                <input className="ss-input" type="date" value={form.joiningDate} onChange={handleChange('joiningDate')} />
              </F>
              <F label="Employment Type">
                <select className="ss-input ss-select" value={form.employmentType} onChange={handleChange('employmentType')}>
                  {['FULL_TIME','PART_TIME','CONTRACT','INTERN'].map((t) => (
                    <option key={t} value={t}>{t.replace('_',' ')}</option>
                  ))}
                </select>
              </F>
              <F label="Department">
                <select className="ss-input ss-select" value={form.department} onChange={handleChange('department')}>
                  <option value="">— Select Department —</option>
                  {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </F>
              <F label="Designation">
                <select className="ss-input ss-select" value={form.designation} onChange={handleChange('designation')} disabled={!form.department}>
                  <option value="">— Select Designation —</option>
                  {designations.map((d) => <option key={d._id} value={d._id}>{d.title}</option>)}
                </select>
              </F>
              <F label="Reporting Manager">
                <select className="ss-input ss-select" value={form.manager} onChange={handleChange('manager')}>
                  <option value="">— No Manager (Direct / Executive) —</option>
                  {managers.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.firstName} {m.lastName} ({m.employeeCode})
                    </option>
                  ))}
                </select>
              </F>
              <F label="Employment Status">
                <select className="ss-input ss-select" value={form.employmentStatus} onChange={handleChange('employmentStatus')}>
                  {['ACTIVE','ON_LEAVE','SUSPENDED','TERMINATED'].map((s) => (
                    <option key={s} value={s}>{s.replace('_',' ')}</option>
                  ))}
                </select>
              </F>
              <F label="Base Salary (₹)">
                <input className="ss-input" type="number" value={form.baseSalary} onChange={handleChange('baseSalary')} placeholder="e.g. 50000" min="0" />
              </F>
            </div>

            {/* Address */}
            <div style={{ marginTop: 8, marginBottom: 8, fontWeight: 600, fontSize: 12, color: 'var(--ss-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Address (optional)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <F label="Street">
                <input className="ss-input" value={form.street} onChange={handleChange('street')} placeholder="Street address" />
              </F>
              <F label="City">
                <input className="ss-input" value={form.city} onChange={handleChange('city')} placeholder="City" />
              </F>
              <F label="State">
                <input className="ss-input" value={form.state} onChange={handleChange('state')} placeholder="State" />
              </F>
              <F label="Country">
                <input className="ss-input" value={form.country} onChange={handleChange('country')} placeholder="Country" />
              </F>
            </div>

            {/* Create User Account (Add only) */}
            {!isEdit && (
              <div style={{ marginTop: 8, padding: 16, background: 'var(--ss-bg)', borderRadius: 8, border: '1px solid var(--ss-border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                  <input type="checkbox" checked={form.createUserAccount} onChange={handleChange('createUserAccount')} />
                  Create login account for this employee
                </label>
                {form.createUserAccount && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', marginTop: 12 }}>
                    <F label="System Role">
                      <select className="ss-input ss-select" value={form.accountRole} onChange={handleChange('accountRole')}>
                        <option value="EMPLOYEE">Employee</option>
                        <option value="MANAGER">Manager</option>
                        <option value="HR_ADMIN">HR Administrator</option>
                      </select>
                    </F>
                    <F label="Initial Password">
                      <input className="ss-input" type="password" value={form.accountPassword} onChange={handleChange('accountPassword')} placeholder="Min 8 characters" />
                    </F>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
        <div className="ss-modal-footer">
          <button className="ss-btn ss-btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="ss-btn ss-btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <><LoadingSpinner size="sm" />&nbsp;Saving…</> : isEdit ? 'Save Changes' : 'Add Employee'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeFormModal;
