import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService, employeeService } from '../../services/index';
import {
  User, Mail, Phone, MapPin, Shield, KeyRound,
  Building2, Briefcase, Calendar, CheckCircle2, AlertCircle
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorAlert from '../../components/ErrorAlert';
import { formatDate, getErrorMsg, initials, humanEnum } from '../../utils/helpers';

const ProfilePage = () => {
  const { user, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Contact Form
  const [contactForm, setContactForm] = useState({
    phone: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    emergencyName: '',
    emergencyRelation: '',
    emergencyPhone: ''
  });
  const [savingContact, setSavingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState('');
  const [contactError, setContactError] = useState('');

  // Password Form
  const [pwdForm, setPwdForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authService.getMe();
      const u = res.data.user;
      setProfileData(u);

      const emp = u.employee || {};
      const addr = emp.address || {};
      const emerg = emp.emergencyContact || {};

      setContactForm({
        phone: emp.phone || '',
        street: addr.street || '',
        city: addr.city || '',
        state: addr.state || '',
        postalCode: addr.postalCode || '',
        country: addr.country || '',
        emergencyName: emerg.name || '',
        emergencyRelation: emerg.relationship || '',
        emergencyPhone: emerg.phone || ''
      });
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handle Contact Details Update
  const handleSaveContact = async (e) => {
    e.preventDefault();
    setContactError('');
    setContactSuccess('');
    if (!profileData?.employee?._id) {
      setContactError('No employee profile linked to update.');
      return;
    }
    setSavingContact(true);
    try {
      await employeeService.update(profileData.employee._id, {
        phone: contactForm.phone,
        address: {
          street: contactForm.street,
          city: contactForm.city,
          state: contactForm.state,
          postalCode: contactForm.postalCode,
          country: contactForm.country
        },
        emergencyContact: {
          name: contactForm.emergencyName,
          relationship: contactForm.emergencyRelation,
          phone: contactForm.emergencyPhone
        }
      });
      setContactSuccess('Personal contact details updated successfully.');
      refreshUser();
    } catch (err) {
      setContactError(getErrorMsg(err));
    } finally {
      setSavingContact(false);
    }
  };

  // Handle Password Change
  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (pwdForm.newPassword.length < 8) {
      setPwdError('New password must be at least 8 characters.');
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }

    setSavingPwd(true);
    try {
      await authService.changePassword({
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword
      });
      setPwdSuccess('Password changed successfully.');
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwdError(getErrorMsg(err));
    } finally {
      setSavingPwd(false);
    }
  };

  if (loading) return <LoadingSpinner overlay message="Loading user profile..." />;
  if (error) return <ErrorAlert message={error} onRetry={fetchProfile} />;
  if (!profileData) return null;

  const emp = profileData.employee || {};

  return (
    <div style={{ animation: 'slideIn 0.3s ease' }}>
      {/* Header Profile Summary */}
      <div className="ss-card" style={{ marginBottom: 24, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'var(--ss-primary)',
            color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 800
          }}>
            {initials(profileData.name || 'User')}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{profileData.name}</h1>
              <span className="ss-badge ss-badge-teal">
                {humanEnum(profileData.role)}
              </span>
              {emp.employmentStatus && (
                <StatusBadge status={emp.employmentStatus} />
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6, color: 'var(--ss-text-muted)', fontSize: 13, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Mail size={14} /> {profileData.email}
              </span>
              {emp.employeeCode && (
                <span>&bull; Code: <strong>{emp.employeeCode}</strong></span>
              )}
              {emp.department && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Building2 size={14} /> {emp.department.name}
                </span>
              )}
              {emp.designation && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Briefcase size={14} /> {emp.designation.title}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Official Info & Password */}
        <div className="col-12 col-lg-5">
          {/* Official Position Details */}
          <div className="ss-card" style={{ marginBottom: 24 }}>
            <div className="ss-card-header">
              <h3 className="ss-card-title">Official Employment Details</h3>
            </div>
            <div className="ss-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--ss-text-muted)' }}>Employee ID:</span>
                  <span style={{ fontWeight: 600 }}>{emp.employeeCode || 'Not Assigned'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--ss-text-muted)' }}>Department:</span>
                  <span style={{ fontWeight: 600 }}>{emp.department?.name || 'Unassigned'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--ss-text-muted)' }}>Designation:</span>
                  <span style={{ fontWeight: 600 }}>{emp.designation?.title || 'Unassigned'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--ss-text-muted)' }}>Reporting Manager:</span>
                  <span style={{ fontWeight: 600 }}>
                    {emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : 'Direct / Self'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--ss-text-muted)' }}>Joining Date:</span>
                  <span style={{ fontWeight: 600 }}>{formatDate(emp.joiningDate)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--ss-text-muted)' }}>Employment Type:</span>
                  <span style={{ fontWeight: 600 }}>{humanEnum(emp.employmentType || 'FULL_TIME')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="ss-card">
            <div className="ss-card-header">
              <h3 className="ss-card-title">Account Security</h3>
            </div>
            <div className="ss-card-body">
              {pwdError && <ErrorAlert message={pwdError} onClose={() => setPwdError('')} />}
              {pwdSuccess && (
                <div className="ss-alert ss-alert-success" style={{ marginBottom: 16 }}>
                  <CheckCircle2 size={16} />
                  <span>{pwdSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSavePassword}>
                <div className="ss-form-group">
                  <label className="ss-label">Current Password</label>
                  <input
                    type="password"
                    className="ss-input"
                    value={pwdForm.currentPassword}
                    onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="ss-form-group">
                  <label className="ss-label">New Password</label>
                  <input
                    type="password"
                    className="ss-input"
                    placeholder="Minimum 8 characters"
                    value={pwdForm.newPassword}
                    onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                    required
                  />
                </div>
                <div className="ss-form-group">
                  <label className="ss-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="ss-input"
                    value={pwdForm.confirmPassword}
                    onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="ss-btn ss-btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                  disabled={savingPwd}
                >
                  {savingPwd ? <LoadingSpinner size="sm" /> : <><KeyRound size={16} /> Update Password</>}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Personal & Contact Details */}
        <div className="col-12 col-lg-7">
          <div className="ss-card">
            <div className="ss-card-header">
              <h3 className="ss-card-title">Personal Contact Details</h3>
            </div>
            <div className="ss-card-body">
              {contactError && <ErrorAlert message={contactError} onClose={() => setContactError('')} />}
              {contactSuccess && (
                <div className="ss-alert ss-alert-success" style={{ marginBottom: 16 }}>
                  <CheckCircle2 size={16} />
                  <span>{contactSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveContact}>
                <div className="ss-form-group">
                  <label className="ss-label">Phone Number</label>
                  <input
                    type="tel"
                    className="ss-input"
                    placeholder="+91 98765 43210"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  />
                </div>

                <h4 style={{ fontSize: 14, fontWeight: 700, marginTop: 24, marginBottom: 14, color: 'var(--ss-text)' }}>
                  Residential Address
                </h4>

                <div className="ss-form-group">
                  <label className="ss-label">Street Address</label>
                  <input
                    type="text"
                    className="ss-input"
                    placeholder="Apartment, suite, unit, building, street"
                    value={contactForm.street}
                    onChange={(e) => setContactForm({ ...contactForm, street: e.target.value })}
                  />
                </div>

                <div className="row g-3">
                  <div className="col-6">
                    <div className="ss-form-group">
                      <label className="ss-label">City</label>
                      <input
                        type="text"
                        className="ss-input"
                        value={contactForm.city}
                        onChange={(e) => setContactForm({ ...contactForm, city: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="ss-form-group">
                      <label className="ss-label">State / Province</label>
                      <input
                        type="text"
                        className="ss-input"
                        value={contactForm.state}
                        onChange={(e) => setContactForm({ ...contactForm, state: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-6">
                    <div className="ss-form-group">
                      <label className="ss-label">Postal / ZIP Code</label>
                      <input
                        type="text"
                        className="ss-input"
                        value={contactForm.postalCode}
                        onChange={(e) => setContactForm({ ...contactForm, postalCode: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="ss-form-group">
                      <label className="ss-label">Country</label>
                      <input
                        type="text"
                        className="ss-input"
                        value={contactForm.country}
                        onChange={(e) => setContactForm({ ...contactForm, country: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <h4 style={{ fontSize: 14, fontWeight: 700, marginTop: 24, marginBottom: 14, color: 'var(--ss-text)' }}>
                  Emergency Contact
                </h4>

                <div className="row g-3">
                  <div className="col-6">
                    <div className="ss-form-group">
                      <label className="ss-label">Contact Name</label>
                      <input
                        type="text"
                        className="ss-input"
                        placeholder="Full name"
                        value={contactForm.emergencyName}
                        onChange={(e) => setContactForm({ ...contactForm, emergencyName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="ss-form-group">
                      <label className="ss-label">Relationship</label>
                      <input
                        type="text"
                        className="ss-input"
                        placeholder="e.g. Spouse, Parent"
                        value={contactForm.emergencyRelation}
                        onChange={(e) => setContactForm({ ...contactForm, emergencyRelation: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="ss-form-group">
                  <label className="ss-label">Emergency Phone</label>
                  <input
                    type="tel"
                    className="ss-input"
                    placeholder="Phone number"
                    value={contactForm.emergencyPhone}
                    onChange={(e) => setContactForm({ ...contactForm, emergencyPhone: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  className="ss-btn ss-btn-primary"
                  style={{ marginTop: 12 }}
                  disabled={savingContact}
                >
                  {savingContact ? <LoadingSpinner size="sm" /> : 'Save Contact Details'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
