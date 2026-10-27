import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, UserPlus, CheckCircle2, Building2, Briefcase, Mail, Lock, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/index';
import { getErrorMsg } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    gender: 'PREFER_NOT_TO_SAY',
    department: '',
    designation: ''
  });

  const [departments, setDepartments] = useState([]);
  const [allDesignations, setAllDesignations] = useState([]);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  // Fetch public departments and designations
  useEffect(() => {
    authService.getPublicDepartments()
      .then((res) => {
        setDepartments(res.data.departments || []);
        setAllDesignations(res.data.designations || []);
      })
      .catch(() => {});
  }, []);

  // Filter designations based on selected department
  const filteredDesignations = form.department
    ? allDesignations.filter((d) => (d.department?._id || d.department)?.toString() === form.department)
    : [];

  const handleChange = (field) => (e) => {
    const val = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: val };
      if (field === 'department') next.designation = '';
      return next;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
    if (error) setError('');
  };

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Please enter your full name.';
    if (!form.email.trim()) {
      e.email = 'Work email is required.';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      e.email = 'Enter a valid email address.';
    }
    if (!form.password) {
      e.password = 'Password is required.';
    } else if (form.password.length < 8) {
      e.password = 'Password must be at least 8 characters long.';
    }
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    setError('');
    setLoading(true);
    try {
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        gender: form.gender,
        department: form.department || undefined,
        designation: form.designation || undefined
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #176B65 0%, #0d423e 60%, #1a2e2b 100%)',
      padding: '24px 16px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 520,
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        overflow: 'hidden'
      }}>
        {/* Top Decorative Banner */}
        <div style={{
          background: 'linear-gradient(90deg, #176B65 0%, #26845B 100%)',
          padding: '28px 28px 24px',
          color: 'white',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.18)',
            marginBottom: 10
          }}>
            <UserPlus size={24} color="#DDF4E8" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px 0', letterSpacing: -0.3 }}>
            Join StaffSync
          </h1>
          <p style={{ fontSize: 13, color: '#DDF4E8', margin: 0, opacity: 0.9 }}>
            Create your new employee account to access attendance & self-service tools
          </p>
        </div>

        {/* Form Container */}
        <div style={{ padding: '24px 28px' }}>
          {error && (
            <div className="ss-alert ss-alert-danger" style={{ marginBottom: 20 }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Full Name */}
            <div className="ss-form-group">
              <label className="ss-label" htmlFor="fullName">
                Full Name <span style={{ color: 'var(--ss-danger)' }}>*</span>
              </label>
              <input
                id="fullName"
                type="text"
                className={`ss-input ${errors.fullName ? 'is-invalid' : ''}`}
                placeholder="e.g. Rahul Sharma"
                value={form.fullName}
                onChange={handleChange('fullName')}
                autoFocus
              />
              {errors.fullName && <div className="ss-invalid-feedback">{errors.fullName}</div>}
            </div>

            {/* Email */}
            <div className="ss-form-group">
              <label className="ss-label" htmlFor="email">
                Work Email <span style={{ color: 'var(--ss-danger)' }}>*</span>
              </label>
              <input
                id="email"
                type="email"
                className={`ss-input ${errors.email ? 'is-invalid' : ''}`}
                placeholder="you@staffsync.corp"
                value={form.email}
                onChange={handleChange('email')}
                autoComplete="email"
              />
              {errors.email && <div className="ss-invalid-feedback">{errors.email}</div>}
            </div>

            {/* Password */}
            <div className="ss-form-group">
              <label className="ss-label" htmlFor="password">
                Password <span style={{ color: 'var(--ss-danger)' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  className={`ss-input ${errors.password ? 'is-invalid' : ''}`}
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={handleChange('password')}
                  autoComplete="new-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--ss-text-muted)', display: 'flex', alignItems: 'center'
                  }}
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <div className="ss-invalid-feedback">{errors.password}</div>}
            </div>

            {/* Department & Designation in two columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <div className="ss-form-group">
                <label className="ss-label" htmlFor="department">Department</label>
                <select
                  id="department"
                  className="ss-input ss-select"
                  value={form.department}
                  onChange={handleChange('department')}
                >
                  <option value="">— Select —</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="ss-form-group">
                <label className="ss-label" htmlFor="designation">Designation</label>
                <select
                  id="designation"
                  className="ss-input ss-select"
                  value={form.designation}
                  onChange={handleChange('designation')}
                  disabled={!form.department}
                >
                  <option value="">— Select —</option>
                  {filteredDesignations.map((des) => (
                    <option key={des._id} value={des._id}>{des.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Phone & Gender in two columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <div className="ss-form-group">
                <label className="ss-label" htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  type="tel"
                  className="ss-input"
                  placeholder="+91 XXXXX XXXXX"
                  value={form.phone}
                  onChange={handleChange('phone')}
                />
              </div>

              <div className="ss-form-group">
                <label className="ss-label" htmlFor="gender">Gender</label>
                <select
                  id="gender"
                  className="ss-input ss-select"
                  value={form.gender}
                  onChange={handleChange('gender')}
                >
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            {/* Role Disclaimer Notice */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid var(--ss-border)',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 12,
              color: 'var(--ss-text-muted)',
              marginBottom: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <CheckCircle2 size={16} color="var(--ss-primary)" style={{ flexShrink: 0 }} />
              <span>
                New self-registered accounts are automatically provisioned as <strong>Staff Employee</strong> with self-service attendance, leave, and training privileges.
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="ss-btn ss-btn-primary ss-btn-lg"
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? (
                <><LoadingSpinner size="sm" />&nbsp;Creating Account…</>
              ) : (
                <><UserPlus size={16} />&nbsp;Create Employee Account</>
              )}
            </button>
          </form>

          {/* Back to Sign In Link */}
          <div style={{
            textAlign: 'center',
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid var(--ss-border)',
            fontSize: 13,
            color: 'var(--ss-text-muted)'
          }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--ss-primary)', fontWeight: 600, textDecoration: 'none' }}>
              Sign In &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
