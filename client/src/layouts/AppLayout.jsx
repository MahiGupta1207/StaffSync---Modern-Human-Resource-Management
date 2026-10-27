import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Building2, Clock, CalendarDays,
  Megaphone, BookOpen, FileBarChart, DollarSign, Bell,
  LogOut, ChevronLeft, ChevronRight, Menu, X, User,
  Shield, Briefcase, Search, Settings
} from 'lucide-react';
import { initials, timeAgo, getErrorMsg } from '../utils/helpers';
import { notificationService } from '../services/index';
import LoadingSpinner from '../components/LoadingSpinner';

// ─── Nav config per role ─────────────────────────────────────
const HR_ADMIN_NAV = [
  { section: 'Overview', items: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ]},
  { section: 'People', items: [
    { path: '/employees',   label: 'Employees',    icon: Users },
    { path: '/departments', label: 'Departments',  icon: Building2 },
  ]},
  { section: 'Operations', items: [
    { path: '/attendance',  label: 'Attendance',   icon: Clock },
    { path: '/leave',       label: 'Leave',        icon: CalendarDays },
    { path: '/payroll',     label: 'Payroll',      icon: DollarSign },
  ]},
  { section: 'Communication', items: [
    { path: '/announcements', label: 'Announcements', icon: Megaphone },
    { path: '/training',      label: 'Training',      icon: BookOpen },
  ]},
  { section: 'Analytics', items: [
    { path: '/reports', label: 'Reports', icon: FileBarChart },
  ]},
];

const MANAGER_NAV = [
  { section: 'Overview', items: [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ]},
  { section: 'My Team', items: [
    { path: '/employees',  label: 'Team Members', icon: Users },
    { path: '/attendance', label: 'Attendance',   icon: Clock },
    { path: '/leave',      label: 'Leave Requests',icon: CalendarDays },
  ]},
  { section: 'Development', items: [
    { path: '/training',      label: 'Training',      icon: BookOpen },
    { path: '/announcements', label: 'Announcements', icon: Megaphone },
  ]},
  { section: 'Analytics', items: [
    { path: '/reports', label: 'Reports', icon: FileBarChart },
  ]},
];

const EMPLOYEE_NAV = [
  { section: 'Overview', items: [
    { path: '/dashboard', label: 'My Workspace', icon: LayoutDashboard },
  ]},
  { section: 'My Work', items: [
    { path: '/attendance', label: 'Attendance', icon: Clock },
    { path: '/leave',      label: 'My Leave',   icon: CalendarDays },
  ]},
  { section: 'Company', items: [
    { path: '/announcements', label: 'Announcements', icon: Megaphone },
    { path: '/training',      label: 'My Training',   icon: BookOpen },
  ]},
  { section: 'Profile', items: [
    { path: '/profile', label: 'My Profile', icon: User },
  ]},
];

const navForRole = (role) => {
  if (role === 'HR_ADMIN') return HR_ADMIN_NAV;
  if (role === 'MANAGER')  return MANAGER_NAV;
  return EMPLOYEE_NAV;
};

// ─── Notification dropdown ────────────────────────────────────
const NotificationDropdown = () => {
  const [open, setOpen]           = useState(false);
  const [notifs, setNotifs]       = useState([]);
  const [unread, setUnread]       = useState(0);
  const [loading, setLoading]     = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const res = await notificationService.getAll();
      setNotifs(res.data.notifications || []);
      setUnread(res.data.unreadCount || 0);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { fetchNotifs(); }, []);

  const handleOpen = () => {
    setOpen(!open);
    if (!open) fetchNotifs();
  };

  const markAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setUnread(0);
      setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch { /* silent */ }
  };

  return (
    <div className="ss-dropdown" ref={ref}>
      <button className="ss-icon-btn" onClick={handleOpen} title="Notifications">
        <Bell size={18} />
        {unread > 0 && <span className="ss-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="ss-notif-panel">
          <div className="ss-notif-header">
            <span className="ss-notif-title">Notifications {unread > 0 && `(${unread})`}</span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                style={{ fontSize: 11, color: 'var(--ss-primary)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="ss-notif-list">
            {loading && <div style={{ padding: 20, textAlign: 'center' }}><LoadingSpinner /></div>}
            {!loading && notifs.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--ss-text-muted)', fontSize: 13 }}>
                No notifications yet.
              </div>
            )}
            {!loading && notifs.map((n) => (
              <div key={n._id} className={`ss-notif-item ${!n.isRead ? 'unread' : ''}`}>
                {!n.isRead && <div className="ss-notif-dot" />}
                <div className="ss-notif-content">
                  <div className="ss-notif-msg">{n.title}: {n.message}</div>
                  <div className="ss-notif-time">{timeAgo(n.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Profile dropdown ─────────────────────────────────────────
const ProfileDropdown = ({ user, onLogout }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const roleLabel = { HR_ADMIN: 'HR Administrator', MANAGER: 'Manager', EMPLOYEE: 'Employee' };

  return (
    <div className="ss-dropdown" ref={ref}>
      <div
        className="ss-avatar"
        onClick={() => setOpen(!open)}
        title={user?.name}
        style={{ cursor: 'pointer' }}
      >
        {initials(user?.name || 'U')}
      </div>
      {open && (
        <div className="ss-dropdown-menu" style={{ minWidth: 200 }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--ss-border)' }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ss-text)' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--ss-text-muted)', marginTop: 2 }}>
              {roleLabel[user?.role] || user?.role}
            </div>
          </div>
          <NavLink to="/profile" onClick={() => setOpen(false)}>
            <div className="ss-dropdown-item">
              <User size={14} /> My Profile
            </div>
          </NavLink>
          <div className="ss-dropdown-divider" />
          <div
            className="ss-dropdown-item danger"
            onClick={() => { setOpen(false); onLogout(); }}
          >
            <LogOut size={14} /> Sign Out
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Breadcrumb helper ────────────────────────────────────────
const PAGE_TITLES = {
  '/dashboard':     { title: 'Dashboard',     path: 'Home / Dashboard' },
  '/employees':     { title: 'Employees',     path: 'Home / People / Employees' },
  '/departments':   { title: 'Departments',   path: 'Home / People / Departments' },
  '/attendance':    { title: 'Attendance',    path: 'Home / Operations / Attendance' },
  '/leave':         { title: 'Leave',         path: 'Home / Operations / Leave' },
  '/payroll':       { title: 'Payroll',       path: 'Home / Operations / Payroll' },
  '/announcements': { title: 'Announcements', path: 'Home / Communication' },
  '/training':      { title: 'Training & Development', path: 'Home / Learning' },
  '/reports':       { title: 'Reports',       path: 'Home / Analytics / Reports' },
  '/profile':       { title: 'My Profile',    path: 'Home / Profile' },
};

// ─── Main AppLayout ────────────────────────────────────────────
const AppLayout = ({ children }) => {
  const { user, logout }        = useAuth();
  const location                = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navSections = navForRole(user?.role);
  const pageInfo = PAGE_TITLES[location.pathname] || { title: 'StaffSync', path: 'Home' };

  return (
    <div className="ss-layout">
      {/* ── Sidebar ── */}
      <aside className={`ss-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        {/* Brand */}
        <div className="ss-sidebar-brand">
          <div className="brand-icon">S</div>
          <div className="brand-text">
            <span className="brand-name">StaffSync</span>
            <span className="brand-sub">HR Workspace</span>
          </div>
        </div>

        {/* Role indicator */}
        <div style={{ padding: '8px 16px 0', flexShrink: 0 }}>
          <div style={{
            background: 'rgba(244,162,97,0.18)',
            borderRadius: 6,
            padding: '5px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            {user?.role === 'HR_ADMIN'  && <Shield size={12} color="#F4A261" />}
            {user?.role === 'MANAGER'   && <Briefcase size={12} color="#F4A261" />}
            {user?.role === 'EMPLOYEE'  && <User size={12} color="#F4A261" />}
            <span style={{ fontSize: 11, color: '#F4A261', fontWeight: 600 }}>
              { { HR_ADMIN: 'HR Administrator', MANAGER: 'Manager', EMPLOYEE: 'Employee' }[user?.role] }
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="ss-sidebar-nav">
          {navSections.map(({ section, items }) => (
            <React.Fragment key={section}>
              <div className="ss-nav-section-label">{section}</div>
              {items.map(({ path, label, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) => `ss-nav-item${isActive ? ' active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={17} className="nav-icon" />
                  <span className="nav-label">{label}</span>
                </NavLink>
              ))}
            </React.Fragment>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="ss-sidebar-footer">
          <button
            className="ss-nav-item"
            style={{ width: '100%', cursor: 'pointer', border: 'none', background: 'none' }}
            onClick={logout}
          >
            <LogOut size={16} className="nav-icon" />
            <span className="nav-label">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            zIndex: 390, display: 'none'
          }}
          onClick={() => setSidebarOpen(false)}
          className="sidebar-overlay"
        />
      )}

      {/* ── Main Content ── */}
      <div className="ss-main">
        {/* Header */}
        <header className="ss-header">
          {/* Mobile menu toggle */}
          <button
            className="ss-icon-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ display: 'none' }}
            id="mobile-menu-btn"
            title="Toggle menu"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Breadcrumb */}
          <div className="ss-header-breadcrumb" style={{ flex: 1 }}>
            <div className="page-title">{pageInfo.title}</div>
            <div className="breadcrumb-path">{pageInfo.path}</div>
          </div>

          {/* Search */}
          <div className="ss-header-search">
            <Search size={14} color="var(--ss-text-muted)" />
            <input type="text" placeholder="Quick search…" readOnly />
          </div>

          {/* Actions */}
          <div className="ss-header-actions">
            <NotificationDropdown />
            <ProfileDropdown user={user} onLogout={logout} />
          </div>
        </header>

        {/* Page Content */}
        <main className="ss-content">
          {children || <Outlet />}
        </main>
      </div>

      {/* Mobile responsive style */}
      <style>{`
        @media (max-width: 900px) {
          #mobile-menu-btn { display: flex !important; }
          .sidebar-overlay { display: block !important; }
        }
      `}</style>
    </div>
  );
};

export default AppLayout;
