# StaffSync — Modern Human Resource Management System (HRMS)

StaffSync is an enterprise-grade Human Resource Management System built on the MERN stack (**MongoDB, Express.js, React + Vite, Node.js**) featuring granular Role-Based Access Control (**RBAC**) across HR Administrators, Managers, and Employees.

---

## 1. System Architecture & Features

### Core Modules
* **Role-Based Access Control (RBAC)**: Dedicated interfaces and server-side permissions for `HR_ADMIN`, `MANAGER`, and `EMPLOYEE`.
* **Employee Directory**: Complete lifecycle management, auto-generated employee codes (`EMP-1001`+), profile modals, and self-service contact updates.
* **Departments & Designations**: Organizational structuring and role grading.
* **Daily Attendance Tracking**: Clock-in and clock-out with server-verified timestamps, late detection (> 9:30 AM), duration calculations, duplicate check-in prevention via database compound indexes, and staff logs.
* **Leave Management**: Automatic quota allocation (`ANNUAL`: 18, `SICK`: 12, `CASUAL`: 10, etc.), conflict detection, multi-tier approval workflows, and balance deduction.
* **Company Announcements**: Notice board with category tags (`POLICY`, `EVENT`, `HOLIDAY`, `URGENT`), priority levels, and audience scoping (`ALL`, `MANAGERS`, `DEPARTMENT`).
* **Training & Development**: Skills workshop catalog, employee enrollment, and self-service progress tracking (0–100%).
* **Restricted Payroll**: Compensation statements, itemized allowances/deductions, gross and net calculations, and informational HR record disclaimers (no external banking gateway).
* **Workforce Analytics & Reports**: Real-time aggregated Recharts visualizations for department headcount distribution, attendance trends, leave utilization, and training completion.
* **Notifications & Audit Trails**: Real-time notification badge and system-wide activity audit logging.

---

## 2. Directory Structure

```
StaffSync HR System Development/
├── package.json               # Monorepo root scripts
├── .gitignore
├── README.md                  # Comprehensive project documentation
├── REQUIREMENTS.md            # Requirements checklist and implementation audit
│
├── client/                    # React 18 + Vite frontend
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── main.jsx           # Client entry point
│       ├── App.jsx            # React Router, AuthProvider, and ProtectedRoute guards
│       ├── components/        # Shared reusable UI components
│       │   ├── ConfirmDialog.jsx
│       │   ├── EmptyState.jsx
│       │   ├── ErrorAlert.jsx
│       │   ├── LoadingSpinner.jsx
│       │   ├── Pagination.jsx
│       │   ├── StatCard.jsx
│       │   └── StatusBadge.jsx
│       ├── context/           # React context state
│       │   └── AuthContext.jsx
│       ├── hooks/             # Custom React hooks
│       │   └── useApi.js
│       ├── layouts/           # Page layouts
│       │   └── AppLayout.jsx  # Role-based sidebar, header & notifications
│       ├── pages/             # Application views
│       │   ├── LoginPage.jsx
│       │   ├── dashboards/
│       │   │   ├── DashboardRouter.jsx
│       │   │   ├── HRDashboard.jsx
│       │   │   ├── ManagerDashboard.jsx
│       │   │   └── EmployeeDashboard.jsx
│       │   ├── employees/
│       │   │   ├── EmployeesPage.jsx
│       │   │   ├── EmployeeDetailModal.jsx
│       │   │   └── EmployeeFormModal.jsx
│       │   ├── departments/
│       │   │   └── DepartmentsPage.jsx
│       │   ├── attendance/
│       │   │   └── AttendancePage.jsx
│       │   ├── leave/
│       │   │   └── LeavePage.jsx
│       │   ├── announcements/
│       │   │   └── AnnouncementsPage.jsx
│       │   ├── training/
│       │   │   └── TrainingPage.jsx
│       │   ├── payroll/
│       │   │   └── PayrollPage.jsx
│       │   ├── reports/
│       │   │   └── ReportsPage.jsx
│       │   └── profile/
│       │       └── ProfilePage.jsx
│       ├── services/          # Axios HTTP service wrappers
│       │   ├── api.js
│       │   └── index.js
│       ├── styles/            # StaffSync Design System styles
│       │   └── index.css
│       └── utils/             # Formatters and date helpers
│           └── helpers.js
│
├── server/                    # Express.js REST API & Node.js backend
│   ├── server.js              # Server entry point & CORS configuration
│   ├── package.json
│   ├── .env                   # Environment variables (port, DB URI, JWT secret)
│   ├── .env.example
│   ├── config/
│   │   └── db.js              # Mongoose MongoDB connection
│   ├── controllers/           # Business logic & request controllers
│   │   ├── authController.js
│   │   ├── employeeController.js
│   │   ├── departmentController.js
│   │   ├── attendanceController.js
│   │   ├── leaveController.js
│   │   ├── announcementController.js
│   │   ├── trainingController.js
│   │   ├── payrollController.js
│   │   ├── dashboardController.js
│   │   ├── reportController.js
│   │   └── notificationController.js
│   ├── middleware/            # Auth, rate limiting & error handlers
│   │   ├── authMiddleware.js
│   │   ├── roleMiddleware.js
│   │   ├── rateLimiter.js
│   │   └── errorHandler.js
│   ├── models/                # Mongoose Database Schemas (13 models)
│   │   ├── User.js
│   │   ├── Employee.js
│   │   ├── Department.js
│   │   ├── Designation.js
│   │   ├── Attendance.js
│   │   ├── LeaveBalance.js
│   │   ├── LeaveRequest.js
│   │   ├── Announcement.js
│   │   ├── TrainingProgram.js
│   │   ├── TrainingEnrollment.js
│   │   ├── PayrollRecord.js
│   │   ├── Notification.js
│   │   └── ActivityLog.js
│   ├── routes/                # Express API Route handlers
│   ├── scripts/               # Administrative CLI scripts
│   │   └── setupAdmin.js      # Secure first-time administrator initialization
│   ├── tests/                 # Automated test suites
│   │   └── api.test.js        # Isolated integration test runner
│   └── utils/
│       ├── logger.js
│       └── timeUtils.js
│
└── data/                      # Local standalone database engine files
    ├── mongod.log
    └── db/                    # WiredTiger database data files
```

---

## 3. Pre-Seeded Personnel & Roles

The system is pre-configured with real user and employee profiles across key departments:

| Role | Name | Email | Password | Employee Code | Department |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **HR Administrator** | Mahak Gupta | `admin@staffsync.corp` | `Admin@1234` | `EMP-HR001` | Human Resources |
| **Manager** | Sara Joshi | `manager@staffsync.corp` | `Manager@1234` | `EMP-MGR01` | Engineering & IT |
| **Employee** | Pravesh Pacholi | `employee@staffsync.corp` | `Employee@1234` | `EMP-DEV01` | Engineering & IT |
| **Employee** | Mitali Sharma | `mitali.sharma@staffsync.corp` | `Mitali@1234` | `EMP-1001` | Human Resources |
| **Employee** | Prakhar Gupta | `prakhar.gupta@staffsync.corp` | `Prakhar@1234` | `EMP-1002` | Engineering & IT |
| **Employee** | Siya Tripathi | `siya.tripathi@staffsync.corp` | `Siya@1234` | `EMP-1003` | Sales & Marketing |
| **Employee** | Seher Khan | `seher.khan@staffsync.corp` | `Seher@1234` | `EMP-1004` | Design |
| **Employee** | Rohan Verma | `rohan.verma@staffsync.corp` | `Rohan@1234` | `EMP-1005` | Engineering & IT |
| **Employee** | Ananya Mehta | `ananya.mehta@staffsync.corp` | `Ananya@1234` | `EMP-1006` | Finance |
| **Employee** | Kabir Singh | `kabir.singh@staffsync.corp` | `Kabir@1234` | `EMP-1007` | Operations |
| **Employee** | Nisha Patel | `nisha.patel@staffsync.corp` | `Nisha@1234` | `EMP-1008` | Design |
| **Employee** | Arjun Kapoor | `arjun.kapoor@staffsync.corp` | `Arjun@1234` | `EMP-1009` | Engineering & IT |
| **Employee** | Pooja Rao | `pooja.rao@staffsync.corp` | `Pooja@1234` | `EMP-1010` | Sales & Marketing |

*Direct Reports to Sara Joshi*: Pravesh Pacholi, Prakhar Gupta, Rohan Verma, Arjun Kapoor.

---

## 4. Database Models

| Model | Key Fields | Description |
| :--- | :--- | :--- |
| **`User`** | `name`, `email`, `password`, `role` (`HR_ADMIN`, `MANAGER`, `EMPLOYEE`), `employee`, `isActive`, `lastLogin` | Authentication credentials with bcrypt hashing and JWT generation. |
| **`Employee`** | `employeeCode`, `firstName`, `lastName`, `email`, `phone`, `department`, `designation`, `manager`, `employmentStatus`, `baseSalary` | Primary employee master entity. |
| **`Department`** | `name`, `code`, `description`, `headOfDepartment`, `isActive` | Organizational divisions. |
| **`Designation`** | `title`, `department`, `description`, `level`, `isActive` | Role hierarchy and titles within departments. |
| **`Attendance`** | `employee`, `date`, `checkInTime`, `checkOutTime`, `workingMinutes`, `status` (`PRESENT`, `LATE`, `HALF_DAY`, `WORK_FROM_HOME`) | Daily attendance logs with compound unique index on `(employee, date)`. |
| **`LeaveBalance`**| `employee`, `year`, `balances` (`ANNUAL`, `SICK`, `CASUAL`, `MATERNITY`, `PATERNITY`, `UNPAID`) | Allotted and consumed leave quotas per year. |
| **`LeaveRequest`**| `employee`, `leaveType`, `startDate`, `endDate`, `totalDays`, `status` (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`), `reason`, `reviewedBy` | Employee leave applications and approval lifecycles. |
| **`Announcement`**| `title`, `content`, `category`, `priority`, `status`, `targetAudience`, `targetDepartment`, `author` | Company-wide notices and departmental bulletins. |
| **`TrainingProgram`**| `title`, `description`, `trainer`, `startDate`, `endDate`, `department`, `maxParticipants`, `status` | Upskilling workshops and course tracks. |
| **`TrainingEnrollment`**| `program`, `employee`, `progressPercentage` (0–100%), `status`, `completionDate`, `feedback` | Individual employee progress tracking. |
| **`PayrollRecord`**| `employee`, `payPeriodMonth`, `payPeriodYear`, `baseSalary`, `allowances`, `deductions`, `grossSalary`, `netSalary`, `status`, `disclaimer` | Informational compensation statements. |
| **`Notification`**| `recipient`, `title`, `message`, `type`, `isRead`, `link` | Internal event alerts. |
| **`ActivityLog`** | `actor`, `action`, `module`, `targetId`, `details`, `ipAddress` | Audit trail for security events and record modifications. |

---

## 5. API Endpoints

### Authentication (`/api/auth`)
* `POST /api/auth/login`: Authenticate with work email and password (rate limited).
* `GET /api/auth/me`: Get current authenticated user profile and permissions.
* `PUT /api/auth/change-password`: Update authenticated user password.
* `POST /api/auth/logout`: Log out and invalidate session.

### Employee Management (`/api/employees`)
* `GET /api/employees`: Paginated directory (scoped: HR Admin sees all, Manager sees direct reports).
* `GET /api/employees/:id`: Retrieve single employee details.
* `POST /api/employees`: Register new employee & provision user account (`HR_ADMIN` only).
* `PUT /api/employees/:id`: Update employee details including Employee Code and Manager (`HR_ADMIN` full edit; `EMPLOYEE`/`MANAGER` self-service contact update).
* `PATCH /api/employees/:id/status`: Toggle employment status (`HR_ADMIN` only).
* `DELETE /api/employees/:id`: Permanently remove employee, unlinking direct reports and cleaning credentials (`HR_ADMIN` only).

### Departments & Designations (`/api/departments`)
* `GET /api/departments`: List all active departments.
* `POST /api/departments`: Create department (`HR_ADMIN` only).
* `PUT /api/departments/:id`: Update department (`HR_ADMIN` only).
* `DELETE /api/departments/:id`: Delete department (`HR_ADMIN` only).
* `GET /api/departments/designations`: List designations.
* `POST /api/departments/designations`: Create designation (`HR_ADMIN` only).

### Attendance (`/api/attendance`)
* `POST /api/attendance/check-in`: Record today's clock-in (Office or Remote WFH).
* `POST /api/attendance/check-out`: Record today's clock-out and calculate working duration.
* `GET /api/attendance/today`: Check user's current day clock-in status.
* `GET /api/attendance/my-history`: Personal monthly attendance log with KPI statistics.
* `GET /api/attendance/records`: Organization / team attendance logs (`HR_ADMIN`, `MANAGER`).
* `POST /api/attendance/manual`: Regularize or override attendance entry (`HR_ADMIN` only).

### Leave Management (`/api/leaves`)
* `POST /api/leaves/apply`: Submit time-off request with automatic conflict checking.
* `GET /api/leaves/my-requests`: List personal leave history.
* `GET /api/leaves/my-balances`: View current annual quota and remaining balances.
* `GET /api/leaves/management`: View team/organization requests for review (`HR_ADMIN`, `MANAGER`).
* `PATCH /api/leaves/:id/review`: Approve or reject leave request (`HR_ADMIN`, `MANAGER`).
* `PATCH /api/leaves/:id/cancel`: Cancel pending leave application.

### Announcements (`/api/announcements`)
* `GET /api/announcements`: List published bulletins (role & department targeted).
* `POST /api/announcements`: Publish announcement (`HR_ADMIN` only).
* `PUT /api/announcements/:id`: Update announcement (`HR_ADMIN` only).
* `DELETE /api/announcements/:id`: Delete announcement (`HR_ADMIN` only).

### Training & Upskilling (`/api/training`)
* `GET /api/training`: List programs (employees view enrolled courses; managers/admins view catalog).
* `POST /api/training`: Create training program (`HR_ADMIN`, `MANAGER`).
* `POST /api/training/:id/enroll`: Enroll employees (`HR_ADMIN`, `MANAGER`).
* `GET /api/training/:id/enrollments`: View course participants (`HR_ADMIN`, `MANAGER`).
* `PATCH /api/training/progress/:enrollmentId`: Update progress percentage (0–100%) and feedback.

### Restricted Payroll (`/api/payroll`)
* `GET /api/payroll`: View payroll statements (`HR_ADMIN` sees all; `EMPLOYEE` sees own; `MANAGER` restricted).
* `POST /api/payroll`: Generate salary record (`HR_ADMIN` only).
* `PATCH /api/payroll/:id/status`: Transition record status to `PAID` (`HR_ADMIN` only).

### Workforce Reports & Dashboards (`/api/reports` & `/api/dashboard`)
* `GET /api/reports/analytics`: Aggregate department headcount, attendance trends, and leave usage.
* `GET /api/dashboard/hr`: HR Administrator KPIs and department breakdowns.
* `GET /api/dashboard/manager`: Manager team oversight and pending reviews.
* `GET /api/dashboard/employee`: Employee self-service dashboard.

---

## 6. Environment Variables (`server/.env`)

Configure the following variables in [server/.env](file:///c:/Users/MAHI%20GUPTA/Desktop/StaffSync%20HR%20System%20Development/server/.env):

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/staffsync_db
JWT_SECRET=staffsync_secure_key_9f823a84e209bc298da7b54128f09d8e
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

---

## 7. How to Run the Application

Open Windows PowerShell in the project root: `c:\Users\MAHI GUPTA\Desktop\StaffSync HR System Development`.

### Step 1: Start MongoDB
Ensure the local MongoDB service is running on port 27017:
```powershell
# If running as a standalone binary:
& "C:\Program Files\MongoDB\Server\9.0\bin\mongod.exe" --dbpath "data\db" --logpath "data\mongod.log"
```

### Step 2: Start the Backend Server
In PowerShell:
```powershell
npm run server
```
The Express server will start listening at `http://localhost:5000`.

### Step 3: Start the Frontend Client
In a separate PowerShell terminal:
```powershell
npm run client
```
The Vite development server will start at `http://localhost:5173`. Open your browser to begin using StaffSync.

### Step 4: Sign In
Use the **⚡ One-Click Instant Sign In** cards right on the login screen:
* **👑 HR Administrator**: `admin@staffsync.corp` (Mahak Gupta)
* **👔 Department Manager**: `manager@staffsync.corp` (Sara Joshi)
* **💼 Staff Employee**: `employee@staffsync.corp` (Pravesh Pacholi)
* Plus quick sign-in buttons for **Mitali Sharma**, **Prakhar Gupta**, **Siya Tripathi**, and **Seher Khan**.

---

## 8. Running the Automated Test Suite

To verify backend models, role-based workflows, and database security without wiping development data:

```powershell
cd server
npm test
```

### Test Results
```
====================================================
 StaffSync HRMS — Automated Backend & Security Tests
====================================================
Connected to test database at: mongodb://127.0.0.1:27017/staffsync_test_db
Cleaned test database for isolated verification.

✔ PASS: Initial database is empty with 0 users
✔ PASS: Department created successfully (HR)
✔ PASS: Department created successfully (IT)
✔ PASS: Designation created successfully
✔ PASS: Designation created for IT
✔ PASS: Primary HR Administrator account provisioned
✔ PASS: Linked HR Administrator employee record established
✔ PASS: Admin password hashed securely using bcrypt
✔ PASS: comparePassword validates correct password
✔ PASS: comparePassword rejects incorrect password
✔ PASS: Manager account created and linked
✔ PASS: Employee successfully assigned to Manager
✔ PASS: Leave balance initialized with standard quota
✔ PASS: Employee check-in recorded with server timestamp
✔ PASS: Duplicate check-in on the same date strictly rejected by unique index
✔ PASS: Check-out completed and 480 working minutes calculated
✔ PASS: Leave application submitted in PENDING state
✔ PASS: Leave approval safely deducted 3 days from Annual quota (15 remaining)
✔ PASS: Announcement published with targetAudience: ALL
✔ PASS: Training program created
✔ PASS: Employee enrolled and 50% progress tracked
✔ PASS: Restricted payroll record generated with correct gross/deduction/net breakdown
✔ PASS: Payroll includes explicit disclaimer of no external banking gateway integration
✔ PASS: Calculated actual total workforce: 3
✔ PASS: Calculated actual present today: 1
✔ PASS: Calculated actual approved leaves: 1

====================================================
 Test Summary: 26 Passed, 0 Failed
====================================================
```

---

## 9. Security & Best Practices
* **Zero Hardcoded Secrets**: Sensitive credentials and secrets are managed strictly through environment variables.
* **Database Isolation**: The test runner utilizes `staffsync_test_db`, with strict guards preventing accidental drops of the development database.
* **Brute-Force Protection**: Login endpoints are guarded with IP-based rate limiting (10 requests per 15 minutes).
* **True Server-Side RBAC**: Role restrictions are enforced at the API route and controller level, not just visually in the frontend.
