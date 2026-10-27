import React from 'react';
import { useAuth } from '../../context/AuthContext';
import HRDashboard       from './HRDashboard';
import ManagerDashboard  from './ManagerDashboard';
import EmployeeDashboard from './EmployeeDashboard';

const DashboardRouter = () => {
  const { user } = useAuth();
  if (user?.role === 'HR_ADMIN') return <HRDashboard />;
  if (user?.role === 'MANAGER')  return <ManagerDashboard />;
  return <EmployeeDashboard />;
};

export default DashboardRouter;
