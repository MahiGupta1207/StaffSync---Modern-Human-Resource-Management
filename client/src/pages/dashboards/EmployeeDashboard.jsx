import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dashboardService, attendanceService } from '../../services/index';
import { Clock, LogIn, LogOut, CalendarDays, BookOpen, Megaphone } from 'lucide-react';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorAlert from '../../components/ErrorAlert';
import EmptyState from '../../components/EmptyState';
import { formatDate, formatTime, todayFull, minutesToHM, humanEnum, timeAgo, getErrorMsg } from '../../utils/helpers';

const EmployeeDashboard = () => {
  const { user }                = useAuth();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await dashboardService.getEmployee();
      setData(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    setActionMsg('');
    try {
      await attendanceService.checkIn({});
      setActionMsg('✓ Checked in successfully!');
      await fetchDashboard();
    } catch (err) {
      setActionMsg(getErrorMsg(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    setActionMsg('');
    try {
      await attendanceService.checkOut({});
      setActionMsg('✓ Checked out successfully!');
      await fetchDashboard();
    } catch (err) {
      setActionMsg(getErrorMsg(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingSpinner overlay message="Loading your workspace…" />;
  if (error)   return <ErrorAlert message={error} onRetry={fetchDashboard} />;
  if (!data)   return null;

  const { todayAttendance, leaveBalance, recentLeaves, trainingEnrollments, announcements } = data;

  const balances = leaveBalance?.balances || {};
  const annualRemaining = balances.ANNUAL ? balances.ANNUAL.total - balances.ANNUAL.used : 0;
  const sickRemaining   = balances.SICK   ? balances.SICK.total   - balances.SICK.used   : 0;
  const casualRemaining = balances.CASUAL ? balances.CASUAL.total - balances.CASUAL.used : 0;

  return (
    <div style={{ animation: 'slideIn 0.3s ease' }}>
      {/* Welcome Banner */}
      <div className="ss-welcome">
        <h2>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}! 👋</h2>
        <p>Welcome to your StaffSync workspace.</p>
        <div className="date-chip"><Clock size={12} />{todayFull()}</div>
      </div>

      {/* Check In/Out + Today Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 24 }}>
        {/* Attendance Action */}
        <div className="ss-card">
          <div className="ss-card-header">
            <span className="ss-card-title">Today's Attendance</span>
            {todayAttendance && <StatusBadge status={todayAttendance.status} />}
          </div>
          <div className="ss-card-body">
            {todayAttendance ? (
              <div>
                <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--ss-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Check-in</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ss-primary)' }}>
                      {formatTime(todayAttendance.checkInTime)}
                    </div>
                  </div>
                  {todayAttendance.checkOutTime && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--ss-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Check-out</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ss-orange)' }}>
                        {formatTime(todayAttendance.checkOutTime)}
                      </div>
                    </div>
                  )}
                  {todayAttendance.checkOutTime && (
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--ss-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>Duration</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ss-success)' }}>
                        {minutesToHM(todayAttendance.workingMinutes)}
                      </div>
                    </div>
                  )}
                </div>
                {!todayAttendance.checkOutTime && (
                  <button
                    className="ss-btn ss-btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={handleCheckOut}
                    disabled={actionLoading}
                  >
                    {actionLoading ? <LoadingSpinner size="sm" /> : <LogOut size={15} />}
                    &nbsp;Check Out
                  </button>
                )}
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: 'var(--ss-text-muted)', marginBottom: 16 }}>
                  You haven't checked in today yet.
                </p>
                <button
                  className="ss-btn ss-btn-teal"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                >
                  {actionLoading ? <LoadingSpinner size="sm" /> : <LogIn size={15} />}
                  &nbsp;Check In Now
                </button>
              </div>
            )}
            {actionMsg && (
              <div style={{
                marginTop: 12, fontSize: 12, padding: '6px 10px', borderRadius: 6,
                background: actionMsg.startsWith('✓') ? 'var(--ss-success-bg)' : 'var(--ss-danger-bg)',
                color: actionMsg.startsWith('✓') ? 'var(--ss-success)' : 'var(--ss-danger)'
              }}>
                {actionMsg}
              </div>
            )}
          </div>
        </div>

        {/* Leave Balances */}
        <div className="ss-card">
          <div className="ss-card-header">
            <span className="ss-card-title">Leave Balances ({new Date().getFullYear()})</span>
          </div>
          <div className="ss-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { type: 'Annual',   remaining: annualRemaining, total: balances.ANNUAL?.total || 18,  color: 'var(--ss-primary)' },
                { type: 'Sick',     remaining: sickRemaining,   total: balances.SICK?.total   || 12,  color: 'var(--ss-warning)' },
                { type: 'Casual',   remaining: casualRemaining, total: balances.CASUAL?.total || 10,  color: 'var(--ss-info)' },
              ].map(({ type, remaining, total, color }) => (
                <div key={type} style={{
                  background: 'var(--ss-bg)', borderRadius: 8, padding: 14, textAlign: 'center', border: '1px solid var(--ss-border)'
                }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color }}>{remaining}</div>
                  <div style={{ fontSize: 11, color: 'var(--ss-text-muted)', marginTop: 2 }}>{type} Days Left</div>
                  <div style={{ height: 4, background: 'var(--ss-border)', borderRadius: 2, marginTop: 8 }}>
                    <div style={{
                      height: '100%', borderRadius: 2, background: color,
                      width: `${total > 0 ? (remaining / total) * 100 : 0}%`,
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ss-text-muted)', marginTop: 4 }}>of {total}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Recent Leaves */}
        <div className="ss-card">
          <div className="ss-card-header">
            <span className="ss-card-title">Recent Leave Requests</span>
          </div>
          {recentLeaves?.length > 0 ? (
            <div className="ss-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="ss-table">
                <thead><tr><th>Type</th><th>Duration</th><th>Status</th><th>Applied</th></tr></thead>
                <tbody>
                  {recentLeaves.map((lv) => (
                    <tr key={lv._id}>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>{humanEnum(lv.leaveType)}</td>
                      <td style={{ fontSize: 12 }}>{lv.totalDays}d ({formatDate(lv.startDate)})</td>
                      <td><StatusBadge status={lv.status} /></td>
                      <td style={{ fontSize: 12, color: 'var(--ss-text-muted)' }}>{timeAgo(lv.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={CalendarDays} title="No leave requests" message="Your leave history will appear here." />
          )}
        </div>

        {/* Training & Announcements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="ss-card" style={{ flex: '0 0 auto' }}>
            <div className="ss-card-header">
              <span className="ss-card-title">My Training Programs</span>
            </div>
            <div style={{ padding: '8px 0' }}>
              {trainingEnrollments?.length > 0 ? trainingEnrollments.map((enr) => (
                <div key={enr._id} style={{ padding: '10px 20px', borderBottom: '1px solid var(--ss-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{enr.program?.title}</div>
                    <StatusBadge status={enr.status} />
                  </div>
                  <div style={{ height: 4, background: 'var(--ss-border)', borderRadius: 2, marginTop: 8 }}>
                    <div style={{
                      height: '100%', borderRadius: 2, background: 'var(--ss-primary)',
                      width: `${enr.progressPercentage || 0}%`
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ss-text-muted)', marginTop: 4 }}>
                    {enr.progressPercentage || 0}% complete
                  </div>
                </div>
              )) : (
                <EmptyState icon={BookOpen} title="No training programs" message="Assigned programs will appear here." />
              )}
            </div>
          </div>

          <div className="ss-card" style={{ flex: '1 1 auto' }}>
            <div className="ss-card-header">
              <span className="ss-card-title">Announcements</span>
            </div>
            <div style={{ padding: '8px 0' }}>
              {announcements?.length > 0 ? announcements.map((ann) => (
                <div key={ann._id} style={{ padding: '10px 20px', borderBottom: '1px solid var(--ss-border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{ann.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--ss-text-muted)', marginTop: 2 }}>
                    {ann.author?.name} · {timeAgo(ann.publishedAt)}
                  </div>
                </div>
              )) : (
                <EmptyState icon={Megaphone} title="No announcements" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
