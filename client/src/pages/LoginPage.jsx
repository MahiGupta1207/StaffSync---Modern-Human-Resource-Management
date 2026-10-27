import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, LogIn, Zap, Shield, Users, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getErrorMsg } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';

const DEMO_PERSONAS = [
  {
    role: 'HR_ADMIN',
    title: 'HR Admin (Mahak Gupta)',
    email: 'admin@staffsync.corp',
    password: 'Admin@1234',
    icon: Shield,
    badge: 'Full Access',
    color: '#176B65'
  },
  {
    role: 'MANAGER',
    title: 'Manager (Sara Joshi)',
    email: 'manager@staffsync.corp',
    password: 'Manager@1234',
    icon: Users,
    badge: 'Team Approvals',
    color: '#1e6fa8'
  },
  {
    role: 'EMPLOYEE',
    title: 'Employee (Pravesh Pacholi)',
    email: 'employee@staffsync.corp',
    password: 'Employee@1234',
    icon: User,
    badge: 'Self-Service',
    color: '#26845B'
  }
];

const MORE_EMPLOYEES = [
  { name: 'Mitali Sharma', email: 'mitali.sharma@staffsync.corp', password: 'Mitali@1234', dept: 'HR' },
  { name: 'Prakhar Gupta', email: 'prakhar.gupta@staffsync.corp', password: 'Prakhar@1234', dept: 'IT' },
  { name: 'Siya Tripathi', email: 'siya.tripathi@staffsync.corp', password: 'Siya@1234', dept: 'Sales' },
  { name: 'Seher Khan', email: 'seher.khan@staffsync.corp', password: 'Seher@1234', dept: 'Design' }
];

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Pre-filled with Admin by default for zero-effort sign-in
  const [form, setForm] = useState({
    email: 'admin@staffsync.corp',
    password: 'Admin@1234'
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quickLoadingRole, setQuickLoadingRole] = useState(null);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = 'Work email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email address.';
    if (!form.password) e.password = 'Password is required.';
    return e;
  };

  const handleLoginWithCredentials = async (email, password) => {
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setLoading(false);
      setQuickLoadingRole(null);
    }
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setErrors({});
    await handleLoginWithCredentials(form.email, form.password);
  };

  const handleQuickLogin = async (persona) => {
    setForm({ email: persona.email, password: persona.password });
    setQuickLoadingRole(persona.role);
    await handleLoginWithCredentials(persona.email, persona.password);
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    if (error) setError('');
  };

  return (
    <div className="ss-login-wrapper">
      {/* ── Brand panel ─────────────────── */}
      <div className="ss-login-brand">
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            border: '2px solid rgba(255,255,255,0.25)'
          }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: 'white' }}>S</span>
          </div>
          <h1 style={{ color: 'white', fontSize: 32, fontWeight: 800, letterSpacing: '-0.5px' }}>
            StaffSync
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', marginTop: 8, fontSize: 15, lineHeight: 1.6 }}>
            Modern Human Resource<br />Management System
          </p>
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['Employee Management', 'Attendance & Leave Tracking', 'Training & Development', 'HR Analytics & Reports'].map((f) => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ss-orange)' }} />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Login form ──────────────────── */}
      <div className="ss-login-form-panel">
        <div className="ss-login-form-box">
          {/* Mobile logo */}
          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: 'var(--ss-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: 'white', fontWeight: 800, fontSize: 18 }}>S</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--ss-text)' }}>StaffSync</div>
              <div style={{ fontSize: 11, color: 'var(--ss-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>HR Workspace</div>
            </div>
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Sign in to your workspace</h2>
          <p style={{ color: 'var(--ss-text-muted)', fontSize: 13, marginBottom: 20 }}>
            Choose a role below for instant 1-click access, or enter credentials.
          </p>

          {/* ⚡ Instant 1-Click Login Cards */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--ss-primary)',
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <Zap size={14} /> One-Click Instant Sign In
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEMO_PERSONAS.map((p) => {
                const IconComponent = p.icon;
                const isLoggingInThis = quickLoadingRole === p.role;
                return (
                  <button
                    key={p.role}
                    type="button"
                    onClick={() => handleQuickLogin(p)}
                    disabled={loading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid var(--ss-border)',
                      background: 'white',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.borderColor = p.color;
                        e.currentTarget.style.background = 'var(--ss-bg)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.currentTarget.style.borderColor = 'var(--ss-border)';
                        e.currentTarget.style.background = 'white';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 6,
                        background: `${p.color}15`, color: p.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <IconComponent size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ss-text)' }}>
                          {p.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ss-text-muted)' }}>
                          {p.email}
                        </div>
                      </div>
                    </div>
                    <div>
                      {isLoggingInThis ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: `${p.color}15`,
                          color: p.color
                        }}>
                          {p.badge} &rarr;
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Test Other Team Members */}
            <div style={{ marginTop: 12, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px dashed var(--ss-border)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ss-text-muted)', marginBottom: 6 }}>
                Quick Sign-in (Other Team Members):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {MORE_EMPLOYEES.map((emp) => (
                  <button
                    key={emp.email}
                    type="button"
                    onClick={() => handleQuickLogin({ email: emp.email, password: emp.password, role: 'EMPLOYEE' })}
                    disabled={loading}
                    style={{
                      fontSize: 11,
                      padding: '3px 8px',
                      background: 'white',
                      border: '1px solid var(--ss-border)',
                      borderRadius: 4,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      color: 'var(--ss-text)'
                    }}
                  >
                    <span>{emp.name}</span>
                    <span style={{ fontSize: 9, color: 'var(--ss-text-muted)' }}>({emp.dept})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{
            position: 'relative',
            textAlign: 'center',
            marginBottom: 20
          }}>
            <div style={{ position: 'absolute', left: 0, top: '50%', width: '100%', height: 1, background: 'var(--ss-border)' }} />
            <span style={{ position: 'relative', background: 'white', padding: '0 10px', fontSize: 12, color: 'var(--ss-text-muted)' }}>
              or sign in with credentials
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="ss-alert ss-alert-danger" style={{ marginBottom: 20 }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="ss-form-group">
              <label className="ss-label" htmlFor="email">Work Email</label>
              <input
                id="email"
                type="email"
                className={`ss-input ${errors.email ? 'is-invalid' : ''}`}
                placeholder="you@company.com"
                value={form.email}
                onChange={handleChange('email')}
                autoComplete="username"
              />
              {errors.email && <div className="ss-invalid-feedback">{errors.email}</div>}
            </div>

            {/* Password */}
            <div className="ss-form-group">
              <label className="ss-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  className={`ss-input ${errors.password ? 'is-invalid' : ''}`}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange('password')}
                  autoComplete="current-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--ss-text-muted)', display: 'flex', alignItems: 'center',
                  }}
                  tabIndex={-1}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <div className="ss-invalid-feedback">{errors.password}</div>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="ss-btn ss-btn-primary ss-btn-lg"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              disabled={loading}
            >
              {loading && !quickLoadingRole
                ? <><LoadingSpinner size="sm" />&nbsp;Signing in…</>
                : <><LogIn size={16} />&nbsp;Sign In</>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
