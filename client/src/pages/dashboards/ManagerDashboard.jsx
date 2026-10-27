import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dashboardService, leaveService } from '../../services/index';
import {
  Users, Clock, CalendarCheck, ClipboardList, CheckCircle2,
  CheckCircle, XCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorAlert from '../../components/ErrorAlert';
import EmptyState from '../../components/EmptyState';
import { timeAgo, todayFull, humanEnum, initials } from '../../utils/helpers';

const ManagerDashboard = () => {
  const { user } = useAuth();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [reviewingId, setReviewingId] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await dashboardService.getManager();
      setData(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReview = async (id, status) => {
    setReviewingId(id);
    setActionMsg('');
    setError('');
    try {
      await leaveService.review(id, {
        status,
        remarks: `Reviewed by manager ${user?.name || 'Sara Joshi'}`
      });
      setActionMsg(`Leave request marked as ${status.toLowerCase()} successfully.`);
      await fetchDashboard();
    } catch (err) {
      setError(err?.response?.data?.message || `Failed to ${status.toLowerCase()} leave request.`);
    } finally {
      setReviewingId(null);
    }
  };

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (loading) return <LoadingSpinner overlay message="Loading Manager Dashboard…" />;
  if (error)   return <ErrorAlert message={error} onRetry={fetchDashboard} />;
  if (!data)   return null;

  const { stats, teamMembers, teamAttendanceTrend, pendingTeamLeaves, announcements, teamEnrollments } = data;

  return (
    <div style={{ animation: 'slideIn 0.3s ease' }}>
      <div className="ss-welcome">
        <h2>Team Dashboard — {user?.name?.split(' ')[0]}</h2>
        <p>Monitor and support your team's daily activities.</p>
        <div className="date-chip"><Clock size={12} />{todayFull()}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Team Size"       value={stats.teamSize}       icon={Users}         color="#176B65" />
        <StatCard label="Present Today"   value={stats.presentToday}   icon={CheckCircle2}  color="#26845B" />
        <StatCard label="On Leave Today"  value={stats.onLeaveToday}   icon={CalendarCheck} color="#D98A25" />
        <StatCard label="Pending Requests"value={stats.pendingLeaves}  icon={ClipboardList} color="#C94C4C" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Team Attendance Trend */}
        <div className="ss-card">
          <div className="ss-card-header">
            <span className="ss-card-title">Team Attendance (7 Days)</span>
          </div>
          <div className="ss-card-body">
            {teamAttendanceTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={teamAttendanceTrend} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--ss-border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--ss-text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--ss-text-muted)' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="present" name="Present" fill="#176B65" radius={[3,3,0,0]} />
                  <Bar dataKey="late"    name="Late"    fill="#F4A261" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No attendance records" message="Team attendance data will appear here." />
            )}
          </div>
        </div>

        {/* Team Members */}
        <div className="ss-card">
          <div className="ss-card-header">
            <span className="ss-card-title">My Team ({stats.teamSize})</span>
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {teamMembers?.length > 0 ? teamMembers.map((emp) => (
              <div key={emp._id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 20px', borderBottom: '1px solid var(--ss-border)'
              }}>
                <div className="ss-avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
                  {initials(`${emp.firstName} ${emp.lastName}`)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{emp.firstName} {emp.lastName}</div>
                  <div style={{ fontSize: 11, color: 'var(--ss-text-muted)' }}>
                    {emp.designation?.title || '—'} · {emp.department?.name || '—'}
                  </div>
                </div>
                <StatusBadge status={emp.employmentStatus} />
              </div>
            )) : (
              <EmptyState title="No team members" message="Employees assigned to you will appear here." />
            )}
          </div>
        </div>
      </div>

      {actionMsg && (
        <div className="ss-alert ss-alert-success" style={{ marginBottom: 16 }}>
          <CheckCircle2 size={16} />
          <span>{actionMsg}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Pending Leave Requests */}
        <div className="ss-card">
          <div className="ss-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="ss-card-title">Pending Team Leaves</span>
            <Link to="/leave" style={{ fontSize: 12, color: 'var(--ss-primary)', fontWeight: 600, textDecoration: 'none' }}>
              Leave Hub &rarr;
            </Link>
          </div>
          {pendingTeamLeaves?.length > 0 ? (
            <div className="ss-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="ss-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Type</th>
                    <th>Days</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTeamLeaves.map((req) => (
                    <tr key={req._id}>
                      <td style={{ fontWeight: 500, fontSize: 13 }}>
                        <div>{req.employee?.firstName} {req.employee?.lastName}</div>
                        <div style={{ fontSize: 11, color: 'var(--ss-text-muted)' }}>{timeAgo(req.createdAt)}</div>
                      </td>
                      <td><StatusBadge status={req.leaveType} label={humanEnum(req.leaveType)} /></td>
                      <td>{req.totalDays}d</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="ss-btn ss-btn-primary ss-btn-sm"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() => handleReview(req._id, 'APPROVED')}
                            disabled={reviewingId === req._id}
                            title="Approve leave"
                          >
                            <CheckCircle size={13} /> Approve
                          </button>
                          <button
                            className="ss-btn ss-btn-danger ss-btn-sm"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() => handleReview(req._id, 'REJECTED')}
                            disabled={reviewingId === req._id}
                            title="Reject leave"
                          >
                            <XCircle size={13} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No pending requests" message="Your team has no pending leave requests." />
          )}
        </div>

        {/* Announcements */}
        <div className="ss-card">
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
              <EmptyState title="No announcements" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
