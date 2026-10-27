import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import LoadingSpinner from './components/LoadingSpinner';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardRouter from './pages/dashboards/DashboardRouter';
import EmployeesPage from './pages/employees/EmployeesPage';
import DepartmentsPage from './pages/departments/DepartmentsPage';
import AttendancePage from './pages/attendance/AttendancePage';
import LeavePage from './pages/leave/LeavePage';
import AnnouncementsPage from './pages/announcements/AnnouncementsPage';
import TrainingPage from './pages/training/TrainingPage';
import PayrollPage from './pages/payroll/PayrollPage';
import ReportsPage from './pages/reports/ReportsPage';
import ProfilePage from './pages/profile/ProfilePage';

// Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner overlay message="Verifying session..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Public Route Guard (redirects authenticated users away from /login)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner overlay message="Loading..." />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Protected Routes inside AppLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardRouter />} />
        
        {/* Employees: HR Admin & Manager */}
        <Route
          path="employees"
          element={
            <ProtectedRoute allowedRoles={['HR_ADMIN', 'MANAGER']}>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />

        {/* Departments: All Authenticated Roles (Read), HR Admin (Write) */}
        <Route path="departments" element={<DepartmentsPage />} />

        {/* Attendance: All Authenticated Roles */}
        <Route path="attendance" element={<AttendancePage />} />

        {/* Leave Management: All Authenticated Roles */}
        <Route path="leave" element={<LeavePage />} />

        {/* Announcements: All Authenticated Roles */}
        <Route path="announcements" element={<AnnouncementsPage />} />

        {/* Training & Development: All Authenticated Roles */}
        <Route path="training" element={<TrainingPage />} />

        {/* Payroll: HR Admin and Employee (Managers restricted) */}
        <Route
          path="payroll"
          element={
            <ProtectedRoute allowedRoles={['HR_ADMIN', 'EMPLOYEE']}>
              <PayrollPage />
            </ProtectedRoute>
          }
        />

        {/* Reports & Analytics: HR Admin & Manager */}
        <Route
          path="reports"
          element={
            <ProtectedRoute allowedRoles={['HR_ADMIN', 'MANAGER']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Profile & Password: All Authenticated Roles */}
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Fallback Catch-All */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
