import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { reportService } from '../../services/index';
import {
  FileBarChart, Users, Clock, CalendarDays,
  Award, TrendingUp, RefreshCw, AlertCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import StatCard from '../../components/StatCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorAlert from '../../components/ErrorAlert';
import EmptyState from '../../components/EmptyState';
import { getErrorMsg, humanEnum } from '../../utils/helpers';

const DEPT_COLORS = ['#176B65', '#F4A261', '#26845B', '#1e6fa8', '#D98A25', '#C94C4C', '#6B4E9E', '#4E9E6B'];
const STATUS_COLORS = {
  PRESENT: '#26845B',
  LATE: '#D98A25',
  HALF_DAY: '#1e6fa8',
  WORK_FROM_HOME: '#176B65',
  ABSENT: '#C94C4C'
};

const ReportsPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await reportService.getAnalytics();
      setData(res.data);
    } catch (err) {
      setError(getErrorMsg(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) return <LoadingSpinner overlay message="Generating HR analytics..." />;
  if (error) return <ErrorAlert message={error} onRetry={fetchAnalytics} />;
  if (!data) return null;

  const { headcountByDept = [], attendanceSummary = [], leaveBreakdown = [], trainingStats = {} } = data;

  const totalHeadcount = headcountByDept.reduce((acc, d) => acc + (d.count || 0), 0);
  const totalAttendanceLogged = attendanceSummary.reduce((acc, a) => acc + (a.count || 0), 0);
  const totalLeaveDays = leaveBreakdown.reduce((acc, l) => acc + (l.totalDays || 0), 0);

  // Format Attendance data for Pie Chart
  const pieAttendanceData = attendanceSummary.map(a => ({
    name: humanEnum(a._id),
    value: a.count,
    color: STATUS_COLORS[a._id] || '#6b7c79'
  }));

  // Format Leave data
  const barLeaveData = leaveBreakdown.map(l => ({
    name: humanEnum(l._id),
    requests: l.count,
    days: l.totalDays
  }));

  return (
    <div style={{ animation: 'slideIn 0.3s ease' }}>
      {/* Header */}
      <div className="ss-page-header">
        <div>
          <h1 className="ss-page-title">Workforce Analytics & Reports</h1>
          <p className="ss-page-subtitle">Department headcount, attendance trends, leave utilization, and skill progress</p>
        </div>
        <button className="ss-btn ss-btn-secondary" onClick={fetchAnalytics}>
          <RefreshCw size={16} /> Refresh Metrics
        </button>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            label="Total Active Workforce"
            value={totalHeadcount}
            icon={Users}
            variant="teal"
            subtext="Across active departments"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            label="Today's Recorded Logs"
            value={totalAttendanceLogged}
            icon={Clock}
            variant="mint"
            subtext="Check-ins recorded today"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            label="Leave Days Utilized"
            value={totalLeaveDays}
            icon={CalendarDays}
            variant="orange"
            subtext="Approved leave time off"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            label="Training Completions"
            value={trainingStats.completed || 0}
            icon={Award}
            variant="purple"
            subtext={`${trainingStats.enrolled || 0} staff currently enrolled`}
          />
        </div>
      </div>

      {/* Charts Row 1: Headcount & Attendance */}
      <div className="row g-3 mb-4">
        {/* Headcount by Department */}
        <div className="col-12 col-lg-7">
          <div className="ss-card" style={{ height: '100%' }}>
            <div className="ss-card-header">
              <h3 className="ss-card-title">Department Headcount Distribution</h3>
            </div>
            <div className="ss-card-body">
              {headcountByDept.length === 0 ? (
                <EmptyState title="No department data available" />
              ) : (
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={headcountByDept} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-15} textAnchor="end" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: '1px solid #ddd' }}
                        formatter={(val) => [`${val} staff`, 'Headcount']}
                      />
                      <Bar dataKey="count" fill="var(--ss-primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Today Attendance Distribution */}
        <div className="col-12 col-lg-5">
          <div className="ss-card" style={{ height: '100%' }}>
            <div className="ss-card-header">
              <h3 className="ss-card-title">Today's Attendance Status</h3>
            </div>
            <div className="ss-card-body">
              {pieAttendanceData.length === 0 ? (
                <EmptyState title="No attendance logs recorded today" />
              ) : (
                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={pieAttendanceData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {pieAttendanceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Leave & Training */}
      <div className="row g-3">
        {/* Leave Type Breakdown */}
        <div className="col-12 col-lg-7">
          <div className="ss-card" style={{ height: '100%' }}>
            <div className="ss-card-header">
              <h3 className="ss-card-title">Leave Utilization Breakdown</h3>
            </div>
            <div className="ss-card-body">
              {barLeaveData.length === 0 ? (
                <EmptyState title="No leave records available" />
              ) : (
                <div style={{ width: '100%', height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={barLeaveData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: '1px solid #ddd' }}
                        formatter={(val, name) => [`${val} ${name === 'days' ? 'days' : 'requests'}`, name === 'days' ? 'Total Days' : 'Request Count']}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="days" fill="var(--ss-orange)" name="Days" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="requests" fill="var(--ss-primary)" name="Requests" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Training Track Overview */}
        <div className="col-12 col-lg-5">
          <div className="ss-card" style={{ height: '100%' }}>
            <div className="ss-card-header">
              <h3 className="ss-card-title">Skill & Training Performance</h3>
            </div>
            <div className="ss-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>Completed Certifications</span>
                    <strong>{trainingStats.completed || 0}</strong>
                  </div>
                  <div style={{ height: 8, width: '100%', background: 'var(--ss-border)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${trainingStats.enrolled ? Math.round(((trainingStats.completed || 0) / trainingStats.enrolled) * 100) : 0}%`,
                      background: 'var(--ss-success)',
                      borderRadius: 4
                    }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>In-Progress Workshops</span>
                    <strong>{trainingStats.inProgress || 0}</strong>
                  </div>
                  <div style={{ height: 8, width: '100%', background: 'var(--ss-border)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${trainingStats.enrolled ? Math.round(((trainingStats.inProgress || 0) / trainingStats.enrolled) * 100) : 0}%`,
                      background: 'var(--ss-orange)',
                      borderRadius: 4
                    }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>Total Staff Enrolled</span>
                    <strong>{trainingStats.enrolled || 0}</strong>
                  </div>
                  <div style={{ height: 8, width: '100%', background: 'var(--ss-border)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: '100%',
                      background: 'var(--ss-primary)',
                      borderRadius: 4
                    }} />
                  </div>
                </div>

                <div style={{
                  padding: 14,
                  background: 'var(--ss-bg)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--ss-text-muted)',
                  lineHeight: 1.6,
                  marginTop: 10
                }}>
                  Analytics are computed dynamically from real database entities across current attendance logs, active leave balances, and enrollment records.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
