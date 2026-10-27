import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/index';
import {
  Users, Clock, CalendarCheck, ClipboardList,
  TrendingUp, Bell, AlertCircle, Cake, CheckCircle2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorAlert from '../../components/ErrorAlert';
import EmptyState from '../../components/EmptyState';
import { formatDate, timeAgo, todayFull, initials, humanEnum } from '../../utils/helpers';

const DEPT_COLORS = ['#176B65','#F4A261','#26845B','#1e6fa8','#D98A25','#C94C4C','#6B4E9E','#4E9E6B'];

const HRDashboard = () => {
  const { user }          = useAuth();
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await dashboardService.getHR();
      setData(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (loading) return <LoadingSpinner overlay message="Loading HR Dashboard…" />;
  if (error)   return <ErrorAlert message={error} onRetry={fetchDashboard} />;
  if (!data)   return null;

  const { stats, departmentDistribution, attendanceTrend, recentActivities,
          pendingLeaveApprovals, latestAnnouncements, upcomingBirthdays } = data;

  return (
    <div style={{ animation: 'slideIn 0.3s ease' }}>
      {/* Welcome Banner */}
      <div className="ss-welcome">
        <h2>Welcome back, {user?.name?.split(' ')[0]}! 👋</h2>
        <p>Here's your organization overview for today.</p>
        <div className="date-chip">
          <Clock size={12} />
          {todayFull()}
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Workforce"   value={stats.totalWorkforce}  icon={Users}         color="#176B65" />
        <StatCard label="Present Today"     value={stats.presentToday}    icon={CheckCircle2}  color="#26845B" />
        <StatCard label="On Leave Today"    value={stats.onLeaveToday}    icon={CalendarCheck} color="#D98A25" />
        <StatCard label="Pending Approvals" value={stats.pendingLeaves}   icon={ClipboardList} color="#C94C4C" />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Attendance Trend */}
        <div className="ss-card">
          <div className="ss-card-header">
            <span className="ss-card-title">Attendance Trend (7 Days)</span>
          </div>
          <div className="ss-card-body" style={{ padding: '16px 20px' }}>
            {attendanceTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={attendanceTrend} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--ss-border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--ss-text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--ss-text-muted)' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--ss-border)', fontSize: 12 }} />
                  <Bar dataKey="present" name="Present" fill="#176B65" radius={[3,3,0,0]} />
                  <Bar dataKey="late"    name="Late"    fill="#F4A261" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No attendance data" message="Attendance records will appear here." />
            )}
          </div>
        </div>

        {/* Department Distribution */}
        <div className="ss-card">
          <div className="ss-card-header">
            <span className="ss-card-title">Headcount by Department</span>
          </div>
          <div className="ss-card-body" style={{ padding: '16px 20px' }}>
            {departmentDistribution?.filter((d) => d.employeeCount > 0).length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={departmentDistribution.filter((d) => d.employeeCount > 0)}
                    dataKey="employeeCount"
                    nameKey="name"
                    cx="50%" cy="50%"
                    outerRadius={70}
                    label={({ name, employeeCount }) => `${name.substring(0,8)}: ${employeeCount}`}
                    labelLine={false}
                    fontSize={10}
                  >
                    {departmentDistribution.map((_, i) => (
                      <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No department data" message="Add employees to departments to see distribution." />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Pending Leave Approvals */}
        <div className="ss-card">
          <div className="ss-card-header">
            <span className="ss-card-title">Pending Leave Approvals</span>
            <span className="ss-status ss-status-warning">{stats.pendingLeaves} pending</span>
          </div>
          <div>
            {pendingLeaveApprovals?.length > 0 ? (
              <div className="ss-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table className="ss-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Type</th>
                      <th>Days</th>
                      <th>Applied</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingLeaveApprovals.map((req) => (
                      <tr key={req._id}>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>
                            {req.employee?.firstName} {req.employee?.lastName}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--ss-text-muted)' }}>
                            {req.employee?.employeeCode}
                          </div>
                        </td>
                        <td><StatusBadge status={req.leaveType} label={humanEnum(req.leaveType)} /></td>
                        <td>{req.totalDays}d</td>
                        <td style={{ fontSize: 12, color: 'var(--ss-text-muted)' }}>{timeAgo(req.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No pending requests" message="All leave requests have been processed." />
            )}
          </div>
        </div>

        {/* Latest Announcements + Birthdays */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="ss-card">
            <div className="ss-card-header">
              <span className="ss-card-title">Latest Announcements</span>
            </div>
            <div style={{ padding: '8px 0' }}>
              {latestAnnouncements?.length > 0 ? latestAnnouncements.map((ann) => (
                <div key={ann._id} style={{ padding: '10px 20px', borderBottom: '1px solid var(--ss-border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ss-text)' }}>{ann.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ss-text-muted)', marginTop: 2 }}>
                    {ann.author?.name} · {timeAgo(ann.publishedAt)}
                  </div>
                </div>
              )) : (
                <EmptyState title="No announcements" message="Published announcements will appear here." />
              )}
            </div>
          </div>

          {upcomingBirthdays?.length > 0 && (
            <div className="ss-card">
              <div className="ss-card-header">
                <span className="ss-card-title">🎂 Birthdays this Month</span>
              </div>
              <div style={{ padding: '8px 0' }}>
                {upcomingBirthdays.map((emp) => (
                  <div key={emp._id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 20px', borderBottom: '1px solid var(--ss-border)'
                  }}>
                    <div className="ss-avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
                      {initials(`${emp.firstName} ${emp.lastName}`)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{emp.firstName} {emp.lastName}</div>
                      <div style={{ fontSize: 11, color: 'var(--ss-text-muted)' }}>
                        {new Date(emp.dateOfBirth).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
