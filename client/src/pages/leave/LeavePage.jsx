import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { leaveService } from '../../services/index';
import {
  CalendarDays, Plus, CheckCircle, XCircle, Clock,
  AlertCircle, CheckCircle2, X, FileText, Ban
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorAlert from '../../components/ErrorAlert';
import EmptyState from '../../components/EmptyState';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatDate, getErrorMsg, humanEnum } from '../../utils/helpers';

const LEAVE_TYPES = [
  { value: 'ANNUAL', label: 'Annual Leave' },
  { value: 'SICK', label: 'Sick Leave' },
  { value: 'CASUAL', label: 'Casual Leave' },
  { value: 'MATERNITY', label: 'Maternity Leave' },
  { value: 'PATERNITY', label: 'Paternity Leave' },
  { value: 'UNPAID', label: 'Unpaid Leave' },
];

const LeavePage = () => {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'HR_ADMIN' || user?.role === 'MANAGER';

  const [activeTab, setActiveTab] = useState('my');
  const [balances, setBalances] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [mgmtRequests, setMgmtRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Apply Modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState({
    leaveType: 'ANNUAL',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState('');

  // Review Modal
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewAction, setReviewAction] = useState('APPROVED'); // 'APPROVED' or 'REJECTED'
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // Cancel Dialog
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Status Filter for Management Tab
  const [mgmtStatusFilter, setMgmtStatusFilter] = useState('PENDING');

  // Fetch balances and personal requests
  const fetchMyData = useCallback(async () => {
    try {
      const [balRes, reqRes] = await Promise.all([
        leaveService.getBalances(),
        leaveService.getMyLeaves()
      ]);
      setBalances(balRes.data.leaveBalance?.balances || balRes.data.balances || null);
      setMyRequests(reqRes.data.leaves || reqRes.data.leaveRequests || []);
    } catch (err) {
      setError(getErrorMsg(err));
    }
  }, []);

  // Fetch management requests
  const fetchMgmtData = useCallback(async () => {
    if (!isManagerOrAdmin) return;
    try {
      const res = await leaveService.getManagement({
        status: mgmtStatusFilter === 'ALL' ? undefined : mgmtStatusFilter
      });
      setMgmtRequests(res.data.requests || res.data.leaveRequests || []);
    } catch (err) {
      setError(getErrorMsg(err));
    }
  }, [isManagerOrAdmin, mgmtStatusFilter]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    await fetchMyData();
    if (isManagerOrAdmin) {
      await fetchMgmtData();
    }
    setLoading(false);
  }, [fetchMyData, fetchMgmtData, isManagerOrAdmin]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Handle Apply Submission
  const handleApply = async (e) => {
    e.preventDefault();
    setApplyError('');
    if (!applyForm.startDate || !applyForm.endDate || !applyForm.reason.trim()) {
      setApplyError('Please fill out all required fields.');
      return;
    }
    setApplyLoading(true);
    try {
      await leaveService.apply(applyForm);
      setShowApplyModal(false);
      setApplyForm({ leaveType: 'ANNUAL', startDate: '', endDate: '', reason: '' });
      setSuccessMsg('Leave request submitted successfully.');
      loadAll();
    } catch (err) {
      setApplyError(getErrorMsg(err));
    } finally {
      setApplyLoading(false);
    }
  };

  // Handle Review Submission
  const handleReview = async () => {
    if (!reviewTarget) return;
    setReviewLoading(true);
    try {
      await leaveService.review(reviewTarget._id, {
        status: reviewAction,
        remarks: reviewComment,
        reviewComment
      });
      setReviewTarget(null);
      setReviewComment('');
      setSuccessMsg(`Leave request marked as ${reviewAction}.`);
      loadAll();
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setReviewLoading(false);
    }
  };

  // Handle Cancel Submission
  const handleCancel = async () => {
    if (!cancellingId) return;
    setCancelLoading(true);
    try {
      await leaveService.cancel(cancellingId);
      setCancellingId(null);
      setSuccessMsg('Leave request cancelled successfully.');
      loadAll();
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setCancelLoading(false);
    }
  };

  // Calculate day count preview
  const calculateDays = () => {
    if (!applyForm.startDate || !applyForm.endDate) return null;
    const s = new Date(applyForm.startDate);
    const e = new Date(applyForm.endDate);
    if (e < s) return 0;
    const diff = Math.abs(e - s);
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const calculatedDays = calculateDays();

  return (
    <div style={{ animation: 'slideIn 0.3s ease' }}>
      {/* Header */}
      <div className="ss-page-header">
        <div>
          <h1 className="ss-page-title">Leave Management</h1>
          <p className="ss-page-subtitle">Track your leave balances, apply for time off, and manage approvals</p>
        </div>
        <button
          className="ss-btn ss-btn-primary"
          onClick={() => { setShowApplyModal(true); setApplyError(''); }}
        >
          <Plus size={16} /> Apply for Leave
        </button>
      </div>

      {error && <ErrorAlert message={error} onClose={() => setError('')} />}
      {successMsg && (
        <div className="ss-alert ss-alert-success" style={{ marginBottom: 20 }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Leave Balance Quota Cards */}
      {balances && (
        <div className="row g-3 mb-4">
          {Object.entries(balances).map(([type, quota]) => {
            const remaining = quota.total - quota.used;
            return (
              <div key={type} className="col-12 col-sm-6 col-md-4 col-xl-2">
                <div className="ss-card" style={{ padding: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ss-text-muted)', letterSpacing: 0.5 }}>
                    {humanEnum(type)}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ss-primary)', marginTop: 4 }}>
                    {remaining} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--ss-text-muted)' }}>/ {quota.total}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ss-text-muted)', marginTop: 2 }}>
                    {quota.used} used days
                  </div>
                  <div style={{ height: 4, width: '100%', background: 'var(--ss-border)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, (quota.used / (quota.total || 1)) * 100)}%`,
                      background: remaining === 0 ? 'var(--ss-danger)' : 'var(--ss-primary)',
                      borderRadius: 2
                    }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--ss-border)', paddingBottom: 8 }}>
        <button
          className={`ss-btn ${activeTab === 'my' ? 'ss-btn-primary' : 'ss-btn-secondary'}`}
          onClick={() => setActiveTab('my')}
        >
          <CalendarDays size={16} /> My Leave Requests
        </button>
        {isManagerOrAdmin && (
          <button
            className={`ss-btn ${activeTab === 'review' ? 'ss-btn-primary' : 'ss-btn-secondary'}`}
            onClick={() => { setActiveTab('review'); fetchMgmtData(); }}
          >
            <Clock size={16} /> Team Approvals
            {mgmtRequests.filter(r => r.status === 'PENDING').length > 0 && (
              <span className="ss-badge ss-badge-orange" style={{ marginLeft: 6 }}>
                {mgmtRequests.filter(r => r.status === 'PENDING').length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Tab 1: My Requests */}
      {activeTab === 'my' && (
        <div className="ss-card">
          <div className="ss-card-header">
            <h3 className="ss-card-title">My Application History</h3>
          </div>
          <div className="ss-card-body" style={{ padding: 0 }}>
            {loading ? (
              <LoadingSpinner message="Loading your leave applications..." />
            ) : myRequests.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No leave requests submitted"
                description="You haven't submitted any leave applications yet. Click 'Apply for Leave' to request time off."
              />
            ) : (
              <div className="ss-table-wrapper">
                <table className="ss-table">
                  <thead>
                    <tr>
                      <th>Leave Type</th>
                      <th>Dates</th>
                      <th>Days</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Reviewer Notes</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRequests.map((req) => (
                      <tr key={req._id}>
                        <td style={{ fontWeight: 600 }}>{humanEnum(req.leaveType)}</td>
                        <td>{formatDate(req.startDate)} – {formatDate(req.endDate)}</td>
                        <td>{req.totalDays} day{req.totalDays > 1 ? 's' : ''}</td>
                        <td style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {req.reason}
                        </td>
                        <td><StatusBadge status={req.status} /></td>
                        <td style={{ fontSize: 13, color: 'var(--ss-text-muted)' }}>
                          {req.reviewRemarks || req.reviewComment || '—'}
                        </td>
                        <td>
                          {req.status === 'PENDING' && (
                            <button
                              className="ss-btn ss-btn-danger ss-btn-sm"
                              onClick={() => setCancellingId(req._id)}
                            >
                              <Ban size={14} /> Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Review & Approvals */}
      {activeTab === 'review' && isManagerOrAdmin && (
        <div className="ss-card">
          <div className="ss-card-header">
            <h3 className="ss-card-title">Pending & Past Approvals</h3>
            <div className="ss-card-actions">
              <select
                className="ss-select ss-select-sm"
                value={mgmtStatusFilter}
                onChange={(e) => setMgmtStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending Only</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
          <div className="ss-card-body" style={{ padding: 0 }}>
            {loading ? (
              <LoadingSpinner message="Loading team leave requests..." />
            ) : mgmtRequests.length === 0 ? (
              <EmptyState
                icon={CheckCircle}
                title="All caught up!"
                description="There are no leave requests matching this filter."
              />
            ) : (
              <div className="ss-table-wrapper">
                <table className="ss-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Type</th>
                      <th>Dates</th>
                      <th>Days</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mgmtRequests.map((req) => {
                      const emp = req.employee || {};
                      return (
                        <tr key={req._id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{emp.firstName} {emp.lastName}</div>
                            <div style={{ fontSize: 11, color: 'var(--ss-text-muted)' }}>{emp.employeeCode}</div>
                          </td>
                          <td>{humanEnum(req.leaveType)}</td>
                          <td>{formatDate(req.startDate)} – {formatDate(req.endDate)}</td>
                          <td>{req.totalDays}</td>
                          <td style={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {req.reason}
                          </td>
                          <td><StatusBadge status={req.status} /></td>
                          <td>
                            {req.status === 'PENDING' ? (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  className="ss-btn ss-btn-primary ss-btn-sm"
                                  onClick={() => {
                                    setReviewTarget(req);
                                    setReviewAction('APPROVED');
                                    setReviewComment('');
                                  }}
                                >
                                  <CheckCircle size={14} /> Approve
                                </button>
                                <button
                                  className="ss-btn ss-btn-danger ss-btn-sm"
                                  onClick={() => {
                                    setReviewTarget(req);
                                    setReviewAction('REJECTED');
                                    setReviewComment('');
                                  }}
                                >
                                  <XCircle size={14} /> Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--ss-text-muted)' }}>
                                {req.reviewedBy ? `Reviewed` : '—'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="ss-modal-backdrop">
          <div className="ss-modal" style={{ maxWidth: 520 }}>
            <div className="ss-modal-header">
              <h3 className="ss-modal-title">Apply for Leave</h3>
              <button className="ss-modal-close" onClick={() => setShowApplyModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleApply}>
              <div className="ss-modal-body">
                {applyError && <ErrorAlert message={applyError} onClose={() => setApplyError('')} />}

                <div className="ss-form-group">
                  <label className="ss-label">Leave Category</label>
                  <select
                    className="ss-select"
                    value={applyForm.leaveType}
                    onChange={(e) => setApplyForm({ ...applyForm, leaveType: e.target.value })}
                  >
                    {LEAVE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="row g-3">
                  <div className="col-6">
                    <div className="ss-form-group">
                      <label className="ss-label">Start Date</label>
                      <input
                        type="date"
                        className="ss-input"
                        value={applyForm.startDate}
                        onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="ss-form-group">
                      <label className="ss-label">End Date</label>
                      <input
                        type="date"
                        className="ss-input"
                        value={applyForm.endDate}
                        onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                {calculatedDays !== null && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: calculatedDays > 0 ? 'var(--ss-mint)' : 'var(--ss-danger-bg)',
                    color: calculatedDays > 0 ? 'var(--ss-primary)' : 'var(--ss-danger)',
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 16
                  }}>
                    {calculatedDays > 0
                      ? `Duration: ${calculatedDays} calendar day${calculatedDays > 1 ? 's' : ''}`
                      : 'End date must be on or after start date.'}
                  </div>
                )}

                <div className="ss-form-group">
                  <label className="ss-label">Reason for Request</label>
                  <textarea
                    className="ss-textarea"
                    rows={3}
                    placeholder="Briefly describe the purpose of this leave request..."
                    value={applyForm.reason}
                    onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="ss-modal-footer">
                <button
                  type="button"
                  className="ss-btn ss-btn-secondary"
                  onClick={() => setShowApplyModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ss-btn ss-btn-primary"
                  disabled={applyLoading || calculatedDays <= 0}
                >
                  {applyLoading ? <LoadingSpinner size="sm" /> : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewTarget && (
        <div className="ss-modal-backdrop">
          <div className="ss-modal" style={{ maxWidth: 480 }}>
            <div className="ss-modal-header">
              <h3 className="ss-modal-title">
                {reviewAction === 'APPROVED' ? 'Approve Leave Request' : 'Reject Leave Request'}
              </h3>
              <button className="ss-modal-close" onClick={() => setReviewTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="ss-modal-body">
              <p style={{ fontSize: 14, color: 'var(--ss-text-muted)', marginBottom: 16 }}>
                You are about to mark this {reviewTarget.totalDays}-day {humanEnum(reviewTarget.leaveType)} request for{' '}
                <strong>{reviewTarget.employee?.firstName} {reviewTarget.employee?.lastName}</strong> as{' '}
                <strong style={{ color: reviewAction === 'APPROVED' ? 'var(--ss-success)' : 'var(--ss-danger)' }}>
                  {reviewAction}
                </strong>.
              </p>

              <div className="ss-form-group">
                <label className="ss-label">Review Comment (Optional)</label>
                <textarea
                  className="ss-textarea"
                  rows={3}
                  placeholder="Add feedback or note for the employee..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
              </div>
            </div>
            <div className="ss-modal-footer">
              <button
                className="ss-btn ss-btn-secondary"
                onClick={() => setReviewTarget(null)}
              >
                Back
              </button>
              <button
                className={`ss-btn ${reviewAction === 'APPROVED' ? 'ss-btn-primary' : 'ss-btn-danger'}`}
                onClick={handleReview}
                disabled={reviewLoading}
              >
                {reviewLoading ? <LoadingSpinner size="sm" /> : `Confirm ${reviewAction}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={!!cancellingId}
        title="Cancel Leave Application"
        message="Are you sure you want to cancel this leave application? This action cannot be undone."
        confirmLabel="Cancel Application"
        danger
        loading={cancelLoading}
        onConfirm={handleCancel}
        onCancel={() => setCancellingId(null)}
      />
    </div>
  );
};

export default LeavePage;
