import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { attendanceService, departmentService, employeeService } from '../../services/index';
import {
  Clock, LogIn, LogOut, Calendar, CheckCircle2,
  AlertCircle, Users, Download, Plus, X, Building2, Home,
  CheckCircle, FileText, Activity, Timer
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorAlert from '../../components/ErrorAlert';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';
import { formatDate, formatTime, minutesToHM, getErrorMsg, toYYYYMMDD } from '../../utils/helpers';

const AttendancePage = () => {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'HR_ADMIN' || user?.role === 'MANAGER';
  const isAdmin = user?.role === 'HR_ADMIN';

  // Tabs: 'my' or 'organization'
  const [activeTab, setActiveTab] = useState('my');

  // Today status & Check-in preferences
  const [todayRecord, setTodayRecord] = useState(null);
  const [todayLoading, setTodayLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [workMode, setWorkMode] = useState('OFFICE'); // 'OFFICE' | 'WORK_FROM_HOME'
  const [notes, setNotes] = useState('');

  // Live Timer for Elapsed Time
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // My Attendance History & Monthly Analytics
  const [myHistory, setMyHistory] = useState([]);
  const [mySummary, setMySummary] = useState(null);
  const [myLoading, setMyLoading] = useState(false);
  const [myMonth, setMyMonth] = useState(new Date().getMonth() + 1);
  const [myYear, setMyYear] = useState(new Date().getFullYear());
  const [myPage, setMyPage] = useState(1);
  const [myTotalPages, setMyTotalPages] = useState(1);

  // Organization Records
  const [orgRecords, setOrgRecords] = useState([]);
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgDate, setOrgDate] = useState(toYYYYMMDD(new Date()));
  const [orgDept, setOrgDept] = useState('');
  const [orgStatus, setOrgStatus] = useState('');
  const [departments, setDepartments] = useState([]);
  const [orgPage, setOrgPage] = useState(1);
  const [orgTotalPages, setOrgTotalPages] = useState(1);
  const [orgStats, setOrgStats] = useState({ total: 0, present: 0, late: 0, wfh: 0, halfDay: 0 });

  // Regularization Modal (HR Admin)
  const [showRegModal, setShowRegModal] = useState(false);
  const [employeesList, setEmployeesList] = useState([]);
  const [regForm, setRegForm] = useState({
    employeeId: '',
    date: toYYYYMMDD(new Date()),
    checkInTime: '09:00',
    checkOutTime: '18:00',
    status: 'PRESENT',
    notes: 'Regularized by HR'
  });
  const [regSaving, setRegSaving] = useState(false);
  const [regError, setRegError] = useState('');

  // 1. Fetch Today Status
  const fetchToday = useCallback(async () => {
    setTodayLoading(true);
    setActionError('');
    try {
      const res = await attendanceService.getToday();
      setTodayRecord(res.data.attendance || null);
    } catch (err) {
      setTodayRecord(null);
    } finally {
      setTodayLoading(false);
    }
  }, []);

  // 2. Fetch My History
  const fetchMyHistory = useCallback(async () => {
    setMyLoading(true);
    try {
      const res = await attendanceService.getMyHistory({
        month: myMonth,
        year: myYear,
        page: myPage,
        limit: 15
      });
      const records = res.data.history || res.data.records || [];
      setMyHistory(records);
      setMyTotalPages(res.data.totalPages || 1);
      setMySummary(res.data.summary || null);
    } catch (err) {
      setMyHistory([]);
    } finally {
      setMyLoading(false);
    }
  }, [myMonth, myYear, myPage]);

  // 3. Fetch Organization Records
  const fetchOrgRecords = useCallback(async () => {
    if (!isManagerOrAdmin) return;
    setOrgLoading(true);
    try {
      const res = await attendanceService.getRecords({
        date: orgDate,
        department: orgDept || undefined,
        status: orgStatus || undefined,
        page: orgPage,
        limit: 15
      });
      const records = res.data.records || [];
      setOrgRecords(records);
      setOrgTotalPages(res.data.totalPages || 1);

      if (res.data.stats) {
        setOrgStats(res.data.stats);
      } else {
        const present = records.filter(r => r.status === 'PRESENT').length;
        const late = records.filter(r => r.status === 'LATE').length;
        const wfh = records.filter(r => r.status === 'WORK_FROM_HOME').length;
        setOrgStats({ total: res.data.total || records.length, present, late, wfh, halfDay: 0 });
      }
    } catch (err) {
      setOrgRecords([]);
    } finally {
      setOrgLoading(false);
    }
  }, [isManagerOrAdmin, orgDate, orgDept, orgStatus, orgPage]);

  // Load initial data
  useEffect(() => {
    fetchToday();
    if (isManagerOrAdmin) {
      departmentService.getAll().then(res => setDepartments(res.data.departments || [])).catch(() => {});
      employeeService.getAll({ limit: 100 }).then(res => setEmployeesList(res.data.employees || [])).catch(() => {});
    }
  }, [fetchToday, isManagerOrAdmin]);

  useEffect(() => {
    if (activeTab === 'my') {
      fetchMyHistory();
    } else if (activeTab === 'organization') {
      fetchOrgRecords();
    }
  }, [activeTab, fetchMyHistory, fetchOrgRecords]);

  // Real-time Live Stopwatch Timer
  useEffect(() => {
    if (todayRecord?.checkInTime && !todayRecord?.checkOutTime) {
      const checkInDate = new Date(todayRecord.checkInTime);
      const updateTimer = () => {
        const diffMs = Math.max(0, Date.now() - checkInDate.getTime());
        setElapsedSeconds(Math.floor(diffMs / 1000));
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedSeconds(0);
    }
  }, [todayRecord]);

  const formattedElapsed = useMemo(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const mins = Math.floor((elapsedSeconds % 3600) / 60);
    const secs = elapsedSeconds % 60;
    return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  }, [elapsedSeconds]);

  // Handle Check In
  const handleCheckIn = async () => {
    setActionLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await attendanceService.checkIn({
        workMode,
        notes: notes.trim() || undefined
      });
      setTodayRecord(res.data.attendance);
      setActionSuccess(`Clocked in successfully! Work mode: ${workMode === 'WORK_FROM_HOME' ? 'Remote (WFH)' : 'Office'}`);
      setNotes('');
      fetchMyHistory();
    } catch (err) {
      setActionError(getErrorMsg(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Check Out
  const handleCheckOut = async () => {
    setActionLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await attendanceService.checkOut({ notes: notes.trim() || undefined });
      setTodayRecord(res.data.attendance);
      setActionSuccess(res.data.message || 'Clocked out successfully!');
      setNotes('');
      fetchMyHistory();
    } catch (err) {
      setActionError(getErrorMsg(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Regularization (HR Admin)
  const handleRegularizeSubmit = async (e) => {
    e.preventDefault();
    setRegError('');
    if (!regForm.employeeId) {
      setRegError('Please select an employee.');
      return;
    }
    setRegSaving(true);
    try {
      await attendanceService.manualMark(regForm);
      setShowRegModal(false);
      setActionSuccess('Attendance record regularized successfully.');
      if (activeTab === 'organization') fetchOrgRecords();
      if (activeTab === 'my') fetchMyHistory();
    } catch (err) {
      setRegError(getErrorMsg(err));
    } finally {
      setRegSaving(false);
    }
  };

  // CSV Export for Organization
  const handleExportCSV = () => {
    if (orgRecords.length === 0) return;
    const headers = ['Employee Code', 'Employee Name', 'Department', 'Date', 'Check-In', 'Check-Out', 'Working Duration', 'Status', 'Notes'];
    const rows = orgRecords.map(r => [
      `"${r.employee?.employeeCode || ''}"`,
      `"${r.employee?.firstName || ''} ${r.employee?.lastName || ''}"`,
      `"${r.employee?.department?.name || ''}"`,
      `"${r.date || ''}"`,
      `"${r.checkInTime ? formatTime(r.checkInTime) : ''}"`,
      `"${r.checkOutTime ? formatTime(r.checkOutTime) : ''}"`,
      `"${r.workingMinutes ? minutesToHM(r.workingMinutes) : '0m'}"`,
      `"${r.status || ''}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `StaffSync_Attendance_${orgDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isCheckedIn = !!todayRecord?.checkInTime;
  const isCheckedOut = !!todayRecord?.checkOutTime;

  return (
    <div style={{ animation: 'slideIn 0.3s ease' }}>
      {/* Header */}
      <div className="ss-page-header">
        <div>
          <h1 className="ss-page-title">Attendance Tracking</h1>
          <p className="ss-page-subtitle">Real-time attendance tracking, remote check-ins, and organization logs</p>
        </div>
        {isAdmin && (
          <button
            className="ss-btn ss-btn-primary"
            onClick={() => {
              setRegError('');
              setShowRegModal(true);
            }}
          >
            <Plus size={15} /> Regularize Attendance
          </button>
        )}
      </div>

      {/* Action Notifications */}
      {actionError && <ErrorAlert message={actionError} onClose={() => setActionError('')} />}
      {actionSuccess && (
        <div className="ss-alert ss-alert-success" style={{ marginBottom: 20 }}>
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Clock In / Out Action Widget */}
      <div className="ss-card" style={{ marginBottom: 24, padding: 24 }}>
        <div className="row align-items-center g-3">
          <div className="col-12 col-md-5">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 58, height: 58, borderRadius: 12,
                background: isCheckedIn ? (isCheckedOut ? 'var(--ss-mint)' : 'var(--ss-orange-light)') : 'var(--ss-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isCheckedIn ? (isCheckedOut ? 'var(--ss-primary)' : 'var(--ss-orange)') : 'var(--ss-text-muted)'
              }}>
                <Clock size={30} />
              </div>
              <div>
                <div style={{ fontSize: 13, color: 'var(--ss-text-muted)', fontWeight: 500 }}>
                  Today's Status ({formatDate(new Date())})
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {todayLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : todayRecord ? (
                    <>
                      <StatusBadge status={todayRecord.status} />
                      {todayRecord.workingMinutes > 0 && (
                        <span style={{ fontSize: 13, color: 'var(--ss-text-muted)', fontWeight: 400 }}>
                          ({minutesToHM(todayRecord.workingMinutes)})
                        </span>
                      )}
                    </>
                  ) : (
                    <span style={{ color: 'var(--ss-text-muted)' }}>Not Clocked In</span>
                  )}
                </div>
                {/* Live Stopwatch Timer */}
                {isCheckedIn && !isCheckedOut && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, color: 'var(--ss-primary)', fontSize: 12, fontWeight: 600 }}>
                    <Timer size={14} />
                    <span>Working: {formattedElapsed}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {!isCheckedIn && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ss-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Work Location:
                  </label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                      type="button"
                      className={`ss-btn ss-btn-sm ${workMode === 'OFFICE' ? 'ss-btn-primary' : 'ss-btn-outline'}`}
                      onClick={() => setWorkMode('OFFICE')}
                      style={{ fontSize: 12, padding: '4px 10px' }}
                    >
                      <Building2 size={13} /> Office
                    </button>
                    <button
                      type="button"
                      className={`ss-btn ss-btn-sm ${workMode === 'WORK_FROM_HOME' ? 'ss-btn-primary' : 'ss-btn-outline'}`}
                      onClick={() => setWorkMode('WORK_FROM_HOME')}
                      style={{ fontSize: 12, padding: '4px 10px' }}
                    >
                      <Home size={13} /> Remote / WFH
                    </button>
                  </div>
                </div>
              )}

              <div style={{ fontSize: 12, color: 'var(--ss-text-muted)' }}>
                {isCheckedIn ? `Clocked in at: ${formatTime(todayRecord.checkInTime)}` : 'Shift begins at 09:00 AM (Grace period till 09:30 AM)'}
              </div>
              {isCheckedOut && (
                <div style={{ fontSize: 12, color: 'var(--ss-text-muted)' }}>
                  Clocked out at: {formatTime(todayRecord.checkOutTime)}
                </div>
              )}
              {!isCheckedOut && (
                <input
                  type="text"
                  className="ss-input ss-input-sm"
                  placeholder="Optional check-in notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ marginTop: 2 }}
                />
              )}
            </div>
          </div>

          <div className="col-12 col-md-3 text-md-end">
            {!isCheckedIn ? (
              <button
                className="ss-btn ss-btn-primary ss-btn-lg"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleCheckIn}
                disabled={actionLoading || todayLoading}
              >
                {actionLoading ? <LoadingSpinner size="sm" /> : <LogIn size={18} />}
                Clock In ({workMode === 'WORK_FROM_HOME' ? 'WFH' : 'Office'})
              </button>
            ) : !isCheckedOut ? (
              <button
                className="ss-btn ss-btn-secondary ss-btn-lg"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={handleCheckOut}
                disabled={actionLoading || todayLoading}
              >
                {actionLoading ? <LoadingSpinner size="sm" /> : <LogOut size={18} />}
                Clock Out
              </button>
            ) : (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ss-success)', fontWeight: 600, fontSize: 14 }}>
                <CheckCircle2 size={18} /> Shift Completed
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--ss-border)', paddingBottom: 8 }}>
        <button
          className={`ss-btn ${activeTab === 'my' ? 'ss-btn-primary' : 'ss-btn-outline'}`}
          onClick={() => setActiveTab('my')}
        >
          <Calendar size={16} /> My Attendance History
        </button>
        {isManagerOrAdmin && (
          <button
            className={`ss-btn ${activeTab === 'organization' ? 'ss-btn-primary' : 'ss-btn-outline'}`}
            onClick={() => setActiveTab('organization')}
          >
            <Users size={16} /> Team & Organization Log
          </button>
        )}
      </div>

      {/* Tab 1: My History */}
      {activeTab === 'my' && (
        <div>
          {/* Monthly Attendance Analytics Summary */}
          {mySummary && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 12,
              marginBottom: 16
            }}>
              <div className="ss-card" style={{ padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ss-text-muted)', textTransform: 'uppercase' }}>Days Logged</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ss-primary)', marginTop: 4 }}>{mySummary.totalDays}</div>
              </div>
              <div className="ss-card" style={{ padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ss-text-muted)', textTransform: 'uppercase' }}>Present (Office)</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#26845B', marginTop: 4 }}>{mySummary.presentCount}</div>
              </div>
              <div className="ss-card" style={{ padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ss-text-muted)', textTransform: 'uppercase' }}>Remote (WFH)</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#176B65', marginTop: 4 }}>{mySummary.wfhCount}</div>
              </div>
              <div className="ss-card" style={{ padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ss-text-muted)', textTransform: 'uppercase' }}>Late Arrivals</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#D98A25', marginTop: 4 }}>{mySummary.lateCount}</div>
              </div>
              <div className="ss-card" style={{ padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ss-text-muted)', textTransform: 'uppercase' }}>Total Hours</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ss-text)', marginTop: 4 }}>{mySummary.totalHours} hrs</div>
              </div>
              <div className="ss-card" style={{ padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ss-text-muted)', textTransform: 'uppercase' }}>Daily Avg</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ss-text)', marginTop: 4 }}>{mySummary.avgDailyHours} hrs</div>
              </div>
            </div>
          )}

          <div className="ss-card">
            <div className="ss-card-header">
              <h3 className="ss-card-title">My Clock History</h3>
              <div className="ss-card-actions">
                <select
                  className="ss-select ss-select-sm"
                  value={myMonth}
                  onChange={(e) => { setMyMonth(Number(e.target.value)); setMyPage(1); }}
                >
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select
                  className="ss-select ss-select-sm"
                  value={myYear}
                  onChange={(e) => { setMyYear(Number(e.target.value)); setMyPage(1); }}
                >
                  {[2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="ss-card-body" style={{ padding: 0 }}>
              {myLoading ? (
                <LoadingSpinner message="Loading attendance records..." />
              ) : myHistory.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No attendance entries found"
                  description={`No records logged for month ${myMonth}/${myYear}.`}
                />
              ) : (
                <div className="ss-table-wrapper">
                  <table className="ss-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Check-In</th>
                        <th>Check-Out</th>
                        <th>Working Time</th>
                        <th>Status</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myHistory.map((rec) => (
                        <tr key={rec._id}>
                          <td style={{ fontWeight: 600 }}>{formatDate(rec.date)}</td>
                          <td>{formatTime(rec.checkInTime)}</td>
                          <td>{rec.checkOutTime ? formatTime(rec.checkOutTime) : '—'}</td>
                          <td>{rec.workingMinutes ? minutesToHM(rec.workingMinutes) : '—'}</td>
                          <td><StatusBadge status={rec.status} /></td>
                          <td style={{ color: 'var(--ss-text-muted)', fontSize: 13 }}>{rec.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {myTotalPages > 1 && (
              <div style={{ padding: 16 }}>
                <Pagination
                  currentPage={myPage}
                  totalPages={myTotalPages}
                  onPageChange={setMyPage}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Organization / Team Records */}
      {activeTab === 'organization' && isManagerOrAdmin && (
        <div>
          {/* Daily Organization Pulse Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            marginBottom: 16
          }}>
            <div className="ss-card" style={{ padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ss-text-muted)', textTransform: 'uppercase' }}>Total Check-ins</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ss-primary)', marginTop: 4 }}>{orgStats.total}</div>
            </div>
            <div className="ss-card" style={{ padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ss-text-muted)', textTransform: 'uppercase' }}>In Office</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#26845B', marginTop: 4 }}>{orgStats.present}</div>
            </div>
            <div className="ss-card" style={{ padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ss-text-muted)', textTransform: 'uppercase' }}>Remote (WFH)</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#176B65', marginTop: 4 }}>{orgStats.wfh}</div>
            </div>
            <div className="ss-card" style={{ padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ss-text-muted)', textTransform: 'uppercase' }}>Late Arrivals</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#D98A25', marginTop: 4 }}>{orgStats.late}</div>
            </div>
            <div className="ss-card" style={{ padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ss-text-muted)', textTransform: 'uppercase' }}>On-Time Rate</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#176B65', marginTop: 4 }}>
                {orgStats.total > 0 ? `${Math.round(((orgStats.total - orgStats.late) / orgStats.total) * 100)}%` : '100%'}
              </div>
            </div>
          </div>

          <div className="ss-card">
            <div className="ss-card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h3 className="ss-card-title">Staff Daily Logs</h3>
                <button
                  className="ss-btn ss-btn-outline ss-btn-sm"
                  onClick={handleExportCSV}
                  disabled={orgRecords.length === 0}
                  title="Export records to CSV"
                >
                  <Download size={13} /> Export CSV
                </button>
              </div>

              <div className="ss-card-actions" style={{ flexWrap: 'wrap', gap: 8 }}>
                {/* Date Filter */}
                <input
                  type="date"
                  className="ss-input ss-input-sm"
                  value={orgDate}
                  onChange={(e) => { setOrgDate(e.target.value); setOrgPage(1); }}
                />
                {/* Department Filter */}
                {user.role === 'HR_ADMIN' && (
                  <select
                    className="ss-select ss-select-sm"
                    value={orgDept}
                    onChange={(e) => { setOrgDept(e.target.value); setOrgPage(1); }}
                  >
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                )}
                {/* Status Filter */}
                <select
                  className="ss-select ss-select-sm"
                  value={orgStatus}
                  onChange={(e) => { setOrgStatus(e.target.value); setOrgPage(1); }}
                >
                  <option value="">All Statuses</option>
                  <option value="PRESENT">Present (Office)</option>
                  <option value="WORK_FROM_HOME">Work from Home</option>
                  <option value="LATE">Late</option>
                  <option value="HALF_DAY">Half Day</option>
                </select>
              </div>
            </div>

            <div className="ss-card-body" style={{ padding: 0 }}>
              {orgLoading ? (
                <LoadingSpinner message="Fetching staff attendance records..." />
              ) : orgRecords.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No logs found for this filter"
                  description={`No staff attendance recorded on ${formatDate(orgDate)}.`}
                />
              ) : (
                <div className="ss-table-wrapper">
                  <table className="ss-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Department</th>
                        <th>Check-In</th>
                        <th>Check-Out</th>
                        <th>Duration</th>
                        <th>Status</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgRecords.map((r) => {
                        const emp = r.employee || {};
                        return (
                          <tr key={r._id}>
                            <td>
                              <div style={{ fontWeight: 600 }}>{emp.firstName} {emp.lastName}</div>
                              <div style={{ fontSize: 11, color: 'var(--ss-text-muted)' }}>{emp.employeeCode}</div>
                            </td>
                            <td>{emp.department?.name || '—'}</td>
                            <td>{formatTime(r.checkInTime)}</td>
                            <td>{r.checkOutTime ? formatTime(r.checkOutTime) : '—'}</td>
                            <td>{r.workingMinutes ? minutesToHM(r.workingMinutes) : '—'}</td>
                            <td><StatusBadge status={r.status} /></td>
                            <td style={{ color: 'var(--ss-text-muted)', fontSize: 13 }}>{r.notes || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {orgTotalPages > 1 && (
              <div style={{ padding: 16 }}>
                <Pagination
                  currentPage={orgPage}
                  totalPages={orgTotalPages}
                  onPageChange={setOrgPage}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Regularization Modal (HR Admin) */}
      {showRegModal && (
        <div className="ss-modal-overlay" onClick={() => setShowRegModal(false)}>
          <div className="ss-modal ss-modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="ss-modal-header">
              <span className="ss-modal-title">Regularize / Adjust Attendance</span>
              <button className="ss-modal-close" onClick={() => setShowRegModal(false)}><X size={14} /></button>
            </div>
            <form onSubmit={handleRegularizeSubmit}>
              <div className="ss-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {regError && <div className="ss-alert ss-alert-danger">{regError}</div>}

                <div className="ss-form-group">
                  <label className="ss-label">Employee <span style={{ color: 'var(--ss-danger)' }}>*</span></label>
                  <select
                    className="ss-input ss-select"
                    value={regForm.employeeId}
                    onChange={(e) => setRegForm({ ...regForm, employeeId: e.target.value })}
                    required
                  >
                    <option value="">— Select Employee —</option>
                    {employeesList.map(e => (
                      <option key={e._id} value={e._id}>
                        {e.firstName} {e.lastName} ({e.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ss-form-group">
                  <label className="ss-label">Date <span style={{ color: 'var(--ss-danger)' }}>*</span></label>
                  <input
                    type="date"
                    className="ss-input"
                    value={regForm.date}
                    onChange={(e) => setRegForm({ ...regForm, date: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="ss-form-group">
                    <label className="ss-label">Check-In Time</label>
                    <input
                      type="time"
                      className="ss-input"
                      value={regForm.checkInTime}
                      onChange={(e) => setRegForm({ ...regForm, checkInTime: e.target.value })}
                      required
                    />
                  </div>
                  <div className="ss-form-group">
                    <label className="ss-label">Check-Out Time</label>
                    <input
                      type="time"
                      className="ss-input"
                      value={regForm.checkOutTime}
                      onChange={(e) => setRegForm({ ...regForm, checkOutTime: e.target.value })}
                    />
                  </div>
                </div>

                <div className="ss-form-group">
                  <label className="ss-label">Status</label>
                  <select
                    className="ss-input ss-select"
                    value={regForm.status}
                    onChange={(e) => setRegForm({ ...regForm, status: e.target.value })}
                  >
                    <option value="PRESENT">Present (Office)</option>
                    <option value="WORK_FROM_HOME">Work From Home (WFH)</option>
                    <option value="LATE">Late</option>
                    <option value="HALF_DAY">Half Day</option>
                  </select>
                </div>

                <div className="ss-form-group">
                  <label className="ss-label">Reason / Notes</label>
                  <textarea
                    className="ss-input"
                    rows="2"
                    placeholder="e.g. On-site client meeting, attendance machine sync failure..."
                    value={regForm.notes}
                    onChange={(e) => setRegForm({ ...regForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="ss-modal-footer">
                <button type="button" className="ss-btn ss-btn-outline" onClick={() => setShowRegModal(false)} disabled={regSaving}>
                  Cancel
                </button>
                <button type="submit" className="ss-btn ss-btn-primary" disabled={regSaving}>
                  {regSaving ? <><LoadingSpinner size="sm" />&nbsp;Saving…</> : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendancePage;
