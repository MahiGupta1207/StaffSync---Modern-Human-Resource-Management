import API from './api';

export const authService = {
  login:                 (data) => API.post('/auth/login', data),
  register:              (data) => API.post('/auth/register', data),
  getMe:                 ()     => API.get('/auth/me'),
  logout:                ()     => API.post('/auth/logout'),
  changePassword:        (data) => API.put('/auth/change-password', data),
  getPublicDepartments: ()     => API.get('/auth/departments'),
};

export const employeeService = {
  getAll:         (params) => API.get('/employees', { params }),
  getById:        (id)     => API.get(`/employees/${id}`),
  create:         (data)   => API.post('/employees', data),
  update:         (id, data) => API.put(`/employees/${id}`, data),
  toggleStatus:   (id, data) => API.patch(`/employees/${id}/status`, data),
  remove:         (id)     => API.delete(`/employees/${id}`),
};

export const departmentService = {
  getAll:          (params) => API.get('/departments', { params }),
  create:          (data)   => API.post('/departments', data),
  update:          (id, data) => API.put(`/departments/${id}`, data),
  remove:          (id)     => API.delete(`/departments/${id}`),
  getDesignations: (params) => API.get('/departments/designations', { params }),
  createDesignation:(data)  => API.post('/departments/designations', data),
};

export const attendanceService = {
  checkIn:      (data)   => API.post('/attendance/check-in', data),
  checkOut:     (data)   => API.post('/attendance/check-out', data),
  getToday:     ()       => API.get('/attendance/today'),
  getMyHistory: (params) => API.get('/attendance/my-history', { params }),
  getRecords:   (params) => API.get('/attendance/records', { params }),
  manualMark:   (data)   => API.post('/attendance/manual', data),
};

export const leaveService = {
  apply:        (data)   => API.post('/leaves/apply', data),
  getMyLeaves:  ()       => API.get('/leaves/my-requests'),
  getBalances:  ()       => API.get('/leaves/my-balances'),
  getManagement:(params) => API.get('/leaves/management', { params }),
  review:       (id, data) => API.patch(`/leaves/${id}/review`, data),
  cancel:       (id)     => API.patch(`/leaves/${id}/cancel`),
};

export const announcementService = {
  getAll:   (params) => API.get('/announcements', { params }),
  create:   (data)   => API.post('/announcements', data),
  update:   (id, data) => API.put(`/announcements/${id}`, data),
  remove:   (id)     => API.delete(`/announcements/${id}`),
};

export const trainingService = {
  getAll:          (params) => API.get('/training', { params }),
  create:          (data)   => API.post('/training', data),
  enroll:          (id, data) => API.post(`/training/${id}/enroll`, data),
  getEnrollments:  (id)     => API.get(`/training/${id}/enrollments`),
  updateProgress:  (enrollmentId, data) => API.patch(`/training/progress/${enrollmentId}`, data),
};

export const payrollService = {
  getAll:       (params) => API.get('/payroll', { params }),
  create:       (data)   => API.post('/payroll', data),
  updateStatus: (id, data) => API.patch(`/payroll/${id}/status`, data),
};

export const dashboardService = {
  getHR:       () => API.get('/dashboard/hr'),
  getManager:  () => API.get('/dashboard/manager'),
  getEmployee: () => API.get('/dashboard/employee'),
};

export const reportService = {
  getAnalytics: (params) => API.get('/reports/analytics', { params }),
};

export const notificationService = {
  getAll:      () => API.get('/notifications'),
  markRead:    (id) => API.patch(`/notifications/${id}/read`),
  markAllRead: () => API.patch('/notifications/read-all'),
};
