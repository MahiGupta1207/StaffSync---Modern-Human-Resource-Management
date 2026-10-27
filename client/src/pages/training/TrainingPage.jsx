import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { trainingService, departmentService, employeeService } from '../../services/index';
import {
  BookOpen, Plus, Users, Calendar, Award,
  CheckCircle2, Clock, X, Sliders, ChevronRight
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorAlert from '../../components/ErrorAlert';
import EmptyState from '../../components/EmptyState';
import { formatDate, getErrorMsg, humanEnum } from '../../utils/helpers';

const TrainingPage = () => {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'HR_ADMIN' || user?.role === 'MANAGER';

  const [programs, setPrograms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create Program Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    trainer: '',
    startDate: '',
    endDate: '',
    department: '',
    maxParticipants: 30
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Update Progress Modal (Employee)
  const [progressTarget, setProgressTarget] = useState(null); // { programTitle, enrollmentId, currentPct, currentFeedback }
  const [progressPct, setProgressPct] = useState(0);
  const [progressFeedback, setProgressFeedback] = useState('');
  const [updatingProgress, setUpdatingProgress] = useState(false);

  // Enroll Employees Modal (HR/Manager)
  const [enrollTargetProgram, setEnrollTargetProgram] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [enrolling, setEnrolling] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);

  // View Participants Modal (HR/Manager)
  const [viewEnrollmentsProgram, setViewEnrollmentsProgram] = useState(null);
  const [programEnrollments, setProgramEnrollments] = useState([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);

  // Fetch Programs
  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await trainingService.getAll({ status: statusFilter || undefined });
      setPrograms(res.data.programs || []);
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPrograms();
    if (isManagerOrAdmin) {
      departmentService.getAll()
        .then(res => setDepartments(res.data.departments || []))
        .catch(() => {});
    }
  }, [fetchPrograms, isManagerOrAdmin]);

  // Create Program Handler
  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!createForm.title.trim() || !createForm.trainer.trim() || !createForm.startDate || !createForm.endDate) {
      setCreateError('Please fill out all required fields.');
      return;
    }
    setCreating(true);
    try {
      await trainingService.create({
        ...createForm,
        department: createForm.department || null,
        maxParticipants: Number(createForm.maxParticipants) || 30
      });
      setShowCreateModal(false);
      setSuccessMsg('Training program created successfully.');
      setCreateForm({
        title: '',
        description: '',
        trainer: '',
        startDate: '',
        endDate: '',
        department: '',
        maxParticipants: 30
      });
      fetchPrograms();
    } catch (err) {
      setCreateError(getErrorMsg(err));
    } finally {
      setCreating(false);
    }
  };

  // Update Progress Handler
  const handleUpdateProgress = async (e) => {
    e.preventDefault();
    if (!progressTarget) return;
    setUpdatingProgress(true);
    try {
      await trainingService.updateProgress(progressTarget.enrollmentId, {
        progressPercentage: progressPct,
        feedback: progressFeedback
      });
      setProgressTarget(null);
      setSuccessMsg(`Progress updated to ${progressPct}%.`);
      fetchPrograms();
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setUpdatingProgress(false);
    }
  };

  // Open Enroll Modal
  const handleOpenEnroll = async (program) => {
    setEnrollTargetProgram(program);
    setSelectedStaffIds([]);
    setStaffLoading(true);
    try {
      const res = await employeeService.getAll({ limit: 100, status: 'ACTIVE' });
      setStaffList(res.data.employees || []);
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setStaffLoading(false);
    }
  };

  // Submit Enrollment
  const handleSubmitEnroll = async () => {
    if (!enrollTargetProgram || selectedStaffIds.length === 0) return;
    setEnrolling(true);
    try {
      await trainingService.enroll(enrollTargetProgram._id, { employeeIds: selectedStaffIds });
      setEnrollTargetProgram(null);
      setSuccessMsg('Selected employees enrolled successfully.');
      fetchPrograms();
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setEnrolling(false);
    }
  };

  // Open View Participants Modal
  const handleViewParticipants = async (program) => {
    setViewEnrollmentsProgram(program);
    setEnrollmentsLoading(true);
    try {
      const res = await trainingService.getEnrollments(program._id);
      setProgramEnrollments(res.data.enrollments || []);
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setEnrollmentsLoading(false);
    }
  };

  return (
    <div style={{ animation: 'slideIn 0.3s ease' }}>
      {/* Header */}
      <div className="ss-page-header">
        <div>
          <h1 className="ss-page-title">Training & Development</h1>
          <p className="ss-page-subtitle">Upskilling workshops, skill certifications, and team development tracks</p>
        </div>
        {isManagerOrAdmin && (
          <button className="ss-btn ss-btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> New Training Program
          </button>
        )}
      </div>

      {error && <ErrorAlert message={error} onClose={() => setError('')} />}
      {successMsg && (
        <div className="ss-alert ss-alert-success" style={{ marginBottom: 20 }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="ss-card" style={{ marginBottom: 20, padding: '14px 20px' }}>
        <div className="row g-2 align-items-center">
          <div className="col-12 col-sm-6 col-md-3">
            <select
              className="ss-select ss-select-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Programs</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="ONGOING">Ongoing</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
          {statusFilter && (
            <div className="col-auto">
              <button className="ss-btn ss-btn-secondary ss-btn-sm" onClick={() => setStatusFilter('')}>
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Program Cards */}
      {loading ? (
        <LoadingSpinner message="Loading training catalog..." />
      ) : programs.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No training programs available"
          description={user.role === 'EMPLOYEE'
            ? "You are not enrolled in any training programs at this moment."
            : "No training programs currently scheduled. Click 'New Training Program' to create one."
          }
        />
      ) : (
        <div className="row g-3">
          {programs.map((prog) => {
            const myEnr = prog.myEnrollment;
            return (
              <div key={prog._id} className="col-12 col-lg-6">
                <div className="ss-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div className="ss-card-header" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <StatusBadge status={prog.status} />
                        {prog.department && (
                          <span className="ss-badge ss-badge-teal">
                            {prog.department.name}
                          </span>
                        )}
                        <span style={{ fontSize: 12, color: 'var(--ss-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={13} /> {formatDate(prog.startDate)} – {formatDate(prog.endDate)}
                        </span>
                      </div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--ss-text)' }}>
                        {prog.title}
                      </h3>
                      <div style={{ fontSize: 12, color: 'var(--ss-text-muted)', marginTop: 4 }}>
                        Conducted by: <strong>{prog.trainer}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="ss-card-body" style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--ss-text)', lineHeight: 1.6, marginBottom: 16 }}>
                      {prog.description || 'No detailed course description provided.'}
                    </p>

                    {/* Progress tracking for employee */}
                    {myEnr && (
                      <div style={{ background: 'var(--ss-bg)', padding: 14, borderRadius: 8, marginTop: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>Your Course Completion</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ss-primary)' }}>
                            {myEnr.progressPercentage}%
                          </span>
                        </div>
                        <div style={{ height: 6, width: '100%', background: 'var(--ss-border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${myEnr.progressPercentage}%`,
                            background: myEnr.progressPercentage === 100 ? 'var(--ss-success)' : 'var(--ss-primary)',
                            borderRadius: 3
                          }} />
                        </div>
                      </div>
                    )}

                    {/* Summary stats for Manager/Admin */}
                    {isManagerOrAdmin && (
                      <div style={{ display: 'flex', gap: 16, marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--ss-border)' }}>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--ss-text-muted)' }}>Enrolled Staff</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ss-primary)' }}>
                            {prog.enrolledCount ?? 0}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--ss-text-muted)' }}>Completed</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ss-success)' }}>
                            {prog.completedCount ?? 0}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{
                    padding: '12px 20px',
                    background: 'var(--ss-bg)',
                    borderTop: '1px solid var(--ss-border)',
                    borderBottomLeftRadius: 'var(--ss-radius)',
                    borderBottomRightRadius: 'var(--ss-radius)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8
                  }}>
                    {myEnr && (
                      <button
                        className="ss-btn ss-btn-primary ss-btn-sm"
                        onClick={() => {
                          setProgressTarget({
                            programTitle: prog.title,
                            enrollmentId: myEnr._id,
                            currentPct: myEnr.progressPercentage,
                            currentFeedback: myEnr.feedback || ''
                          });
                          setProgressPct(myEnr.progressPercentage);
                          setProgressFeedback(myEnr.feedback || '');
                        }}
                      >
                        <Sliders size={14} /> Update Progress
                      </button>
                    )}

                    {isManagerOrAdmin && (
                      <>
                        <button
                          className="ss-btn ss-btn-secondary ss-btn-sm"
                          onClick={() => handleViewParticipants(prog)}
                        >
                          <Users size={14} /> Participants ({prog.enrolledCount ?? 0})
                        </button>
                        <button
                          className="ss-btn ss-btn-primary ss-btn-sm"
                          onClick={() => handleOpenEnroll(prog)}
                        >
                          <Plus size={14} /> Enroll Staff
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Program Modal */}
      {showCreateModal && (
        <div className="ss-modal-backdrop">
          <div className="ss-modal" style={{ maxWidth: 540 }}>
            <div className="ss-modal-header">
              <h3 className="ss-modal-title">Create Training Program</h3>
              <button className="ss-modal-close" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="ss-modal-body">
                {createError && <ErrorAlert message={createError} onClose={() => setCreateError('')} />}

                <div className="ss-form-group">
                  <label className="ss-label">Program Title</label>
                  <input
                    type="text"
                    className="ss-input"
                    placeholder="e.g. Scalable Microservices Architecture"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="row g-3">
                  <div className="col-6">
                    <div className="ss-form-group">
                      <label className="ss-label">Lead Trainer / Instructor</label>
                      <input
                        type="text"
                        className="ss-input"
                        placeholder="Instructor name or academy"
                        value={createForm.trainer}
                        onChange={(e) => setCreateForm({ ...createForm, trainer: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="ss-form-group">
                      <label className="ss-label">Target Department (Optional)</label>
                      <select
                        className="ss-select"
                        value={createForm.department}
                        onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                      >
                        <option value="">All Departments</option>
                        {departments.map((d) => (
                          <option key={d._id} value={d._id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-6">
                    <div className="ss-form-group">
                      <label className="ss-label">Start Date</label>
                      <input
                        type="date"
                        className="ss-input"
                        value={createForm.startDate}
                        onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
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
                        value={createForm.endDate}
                        onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="ss-form-group">
                  <label className="ss-label">Max Capacity</label>
                  <input
                    type="number"
                    className="ss-input"
                    value={createForm.maxParticipants}
                    onChange={(e) => setCreateForm({ ...createForm, maxParticipants: e.target.value })}
                    min="1"
                    max="500"
                  />
                </div>

                <div className="ss-form-group">
                  <label className="ss-label">Program Overview</label>
                  <textarea
                    className="ss-textarea"
                    rows={3}
                    placeholder="Objectives, syllabus, prerequisites..."
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="ss-modal-footer">
                <button
                  type="button"
                  className="ss-btn ss-btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ss-btn ss-btn-primary"
                  disabled={creating}
                >
                  {creating ? <LoadingSpinner size="sm" /> : 'Create Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Progress Modal (Employee) */}
      {progressTarget && (
        <div className="ss-modal-backdrop">
          <div className="ss-modal" style={{ maxWidth: 460 }}>
            <div className="ss-modal-header">
              <h3 className="ss-modal-title">Update Course Progress</h3>
              <button className="ss-modal-close" onClick={() => setProgressTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateProgress}>
              <div className="ss-modal-body">
                <div style={{ fontSize: 13, color: 'var(--ss-text-muted)', marginBottom: 16 }}>
                  Course: <strong>{progressTarget.programTitle}</strong>
                </div>

                <div className="ss-form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label className="ss-label" style={{ margin: 0 }}>Progress Percentage</label>
                    <span style={{ fontWeight: 700, color: 'var(--ss-primary)' }}>{progressPct}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    className="w-100"
                    value={progressPct}
                    onChange={(e) => setProgressPct(Number(e.target.value))}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ss-text-muted)', marginTop: 4 }}>
                    <span>0% (Just started)</span>
                    <span>50% (In Progress)</span>
                    <span>100% (Completed)</span>
                  </div>
                </div>

                <div className="ss-form-group">
                  <label className="ss-label">Feedback / Completion Notes</label>
                  <textarea
                    className="ss-textarea"
                    rows={3}
                    placeholder="Provide thoughts, feedback, or verification link..."
                    value={progressFeedback}
                    onChange={(e) => setProgressFeedback(e.target.value)}
                  />
                </div>
              </div>
              <div className="ss-modal-footer">
                <button
                  type="button"
                  className="ss-btn ss-btn-secondary"
                  onClick={() => setProgressTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ss-btn ss-btn-primary"
                  disabled={updatingProgress}
                >
                  {updatingProgress ? <LoadingSpinner size="sm" /> : 'Save Progress'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Employees Modal (HR/Manager) */}
      {enrollTargetProgram && (
        <div className="ss-modal-backdrop">
          <div className="ss-modal" style={{ maxWidth: 520 }}>
            <div className="ss-modal-header">
              <h3 className="ss-modal-title">Enroll Staff in {enrollTargetProgram.title}</h3>
              <button className="ss-modal-close" onClick={() => setEnrollTargetProgram(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="ss-modal-body">
              <p style={{ fontSize: 13, color: 'var(--ss-text-muted)', marginBottom: 16 }}>
                Select team members to assign to this training program.
              </p>

              {staffLoading ? (
                <LoadingSpinner message="Fetching employee directory..." />
              ) : staffList.length === 0 ? (
                <EmptyState title="No active employees found" />
              ) : (
                <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--ss-border)', borderRadius: 8, padding: 8 }}>
                  {staffList.map((emp) => {
                    const isSelected = selectedStaffIds.includes(emp._id);
                    return (
                      <div
                        key={emp._id}
                        onClick={() => {
                          setSelectedStaffIds(prev =>
                            isSelected ? prev.filter(id => id !== emp._id) : [...prev, emp._id]
                          );
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '8px 12px',
                          borderRadius: 6,
                          background: isSelected ? 'var(--ss-mint)' : 'transparent',
                          cursor: 'pointer',
                          marginBottom: 4
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{emp.firstName} {emp.lastName}</div>
                          <div style={{ fontSize: 11, color: 'var(--ss-text-muted)' }}>
                            {emp.employeeCode} &bull; {emp.department?.name || 'No Dept'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="ss-modal-footer">
              <button
                className="ss-btn ss-btn-secondary"
                onClick={() => setEnrollTargetProgram(null)}
              >
                Cancel
              </button>
              <button
                className="ss-btn ss-btn-primary"
                onClick={handleSubmitEnroll}
                disabled={enrolling || selectedStaffIds.length === 0}
              >
                {enrolling ? <LoadingSpinner size="sm" /> : `Enroll (${selectedStaffIds.length}) Staff`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Participants Modal */}
      {viewEnrollmentsProgram && (
        <div className="ss-modal-backdrop">
          <div className="ss-modal" style={{ maxWidth: 600 }}>
            <div className="ss-modal-header">
              <h3 className="ss-modal-title">Enrolled Participants — {viewEnrollmentsProgram.title}</h3>
              <button className="ss-modal-close" onClick={() => setViewEnrollmentsProgram(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="ss-modal-body" style={{ padding: 0 }}>
              {enrollmentsLoading ? (
                <div style={{ padding: 24 }}>
                  <LoadingSpinner message="Loading participant list..." />
                </div>
              ) : programEnrollments.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No staff enrolled yet"
                  description="Use the 'Enroll Staff' option on the course card to add participants."
                />
              ) : (
                <div className="ss-table-wrapper">
                  <table className="ss-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Progress</th>
                        <th>Status</th>
                        <th>Enrolled Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {programEnrollments.map((enr) => {
                        const emp = enr.employee || {};
                        return (
                          <tr key={enr._id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{emp.firstName} {emp.lastName}</div>
                              <div style={{ fontSize: 11, color: 'var(--ss-text-muted)' }}>{emp.employeeCode}</div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ height: 6, width: 80, background: 'var(--ss-border)', borderRadius: 3, overflow: 'hidden' }}>
                                  <div style={{
                                    height: '100%',
                                    width: `${enr.progressPercentage}%`,
                                    background: enr.progressPercentage === 100 ? 'var(--ss-success)' : 'var(--ss-primary)'
                                  }} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600 }}>{enr.progressPercentage}%</span>
                              </div>
                            </td>
                            <td><StatusBadge status={enr.status} /></td>
                            <td style={{ fontSize: 12, color: 'var(--ss-text-muted)' }}>{formatDate(enr.enrollmentDate)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="ss-modal-footer">
              <button
                className="ss-btn ss-btn-secondary"
                onClick={() => setViewEnrollmentsProgram(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingPage;
