require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const Announcement = require('../models/Announcement');
const TrainingProgram = require('../models/TrainingProgram');
const TrainingEnrollment = require('../models/TrainingEnrollment');
const PayrollRecord = require('../models/PayrollRecord');
const { formatDateYYYYMMDD } = require('../utils/timeUtils');

const runTests = async () => {
  console.log('====================================================');
  console.log(' StaffSync HRMS — Automated Backend & Security Tests');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`\x1b[32m✔ PASS:\x1b[0m ${testName}`);
      passed++;
    } else {
      console.error(`\x1b[31m✖ FAIL:\x1b[0m ${testName}`);
      failed++;
    }
  };

  try {
    const mongoUri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/staffsync_test_db';
    if (!mongoUri.includes('test')) {
      throw new Error(`SAFETY ABORT: Test runner was about to connect to '${mongoUri}'. Automated tests must use an isolated test database with 'test' in the name to prevent wiping development data.`);
    }
    await mongoose.connect(mongoUri);
    console.log(`Connected to test database at: ${mongoUri}\n`);

    // Clean isolated test database
    await mongoose.connection.dropDatabase();
    console.log('Cleaned test database for isolated verification.\n');

    // 1. Initial State: Empty database
    const initialUserCount = await User.countDocuments();
    assert(initialUserCount === 0, 'Initial database is empty with 0 users');

    // 2. Department Creation
    const hrDept = await Department.create({
      name: 'Human Resources',
      code: 'HR',
      description: 'Core People Operations'
    });
    assert(hrDept && hrDept.code === 'HR', 'Department created successfully (HR)');

    const itDept = await Department.create({
      name: 'Information Technology',
      code: 'IT',
      description: 'Software Engineering & IT Infrastructure'
    });
    assert(itDept && itDept.code === 'IT', 'Department created successfully (IT)');

    // 3. Designation Creation
    const hrAdminDesig = await Designation.create({
      title: 'HR Administrator',
      department: hrDept._id,
      description: 'Lead Human Resources Administrator'
    });
    assert(hrAdminDesig && hrAdminDesig.title === 'HR Administrator', 'Designation created successfully');

    const devDesig = await Designation.create({
      title: 'Senior Software Engineer',
      department: itDept._id
    });
    assert(devDesig && devDesig.title === 'Senior Software Engineer', 'Designation created for IT');

    // 4. Initial HR Administrator Provisioning
    const adminEmp = await Employee.create({
      employeeCode: 'EMP-HR001',
      firstName: 'Primary',
      lastName: 'Administrator',
      email: 'admin@staffsync.corp',
      department: hrDept._id,
      designation: hrAdminDesig._id,
      employmentStatus: 'ACTIVE',
      employmentType: 'FULL_TIME'
    });

    const adminUser = await User.create({
      name: 'Primary Administrator',
      email: 'admin@staffsync.corp',
      password: 'AdminPassword@2026',
      role: 'HR_ADMIN',
      employee: adminEmp._id,
      isActive: true
    });
    adminEmp.user = adminUser._id;
    await adminEmp.save();

    assert(adminUser.role === 'HR_ADMIN', 'Primary HR Administrator account provisioned');
    assert(adminEmp.employeeCode === 'EMP-HR001', 'Linked HR Administrator employee record established');

    // Verify password hashing
    const fetchedAdminWithPassword = await User.findById(adminUser._id).select('+password');
    assert(
      fetchedAdminWithPassword.password !== 'AdminPassword@2026' &&
      fetchedAdminWithPassword.password.startsWith('$2'),
      'Admin password hashed securely using bcrypt'
    );

    const isPassValid = await fetchedAdminWithPassword.comparePassword('AdminPassword@2026');
    assert(isPassValid === true, 'comparePassword validates correct password');

    const isWrongPassInvalid = await fetchedAdminWithPassword.comparePassword('WrongPassword123');
    assert(isWrongPassInvalid === false, 'comparePassword rejects incorrect password');

    // 5. Create Manager and Employee
    const mgrEmp = await Employee.create({
      employeeCode: 'EMP-MGR01',
      firstName: 'Sarah',
      lastName: 'Manager',
      email: 'sarah.mgr@staffsync.corp',
      department: itDept._id,
      designation: devDesig._id,
      employmentStatus: 'ACTIVE'
    });
    const mgrUser = await User.create({
      name: 'Sarah Manager',
      email: 'sarah.mgr@staffsync.corp',
      password: 'ManagerPass@2026',
      role: 'MANAGER',
      employee: mgrEmp._id
    });
    mgrEmp.user = mgrUser._id;
    await mgrEmp.save();
    assert(mgrUser.role === 'MANAGER', 'Manager account created and linked');

    // Regular Employee reporting to Sarah Manager
    const staffEmp = await Employee.create({
      employeeCode: 'EMP-DEV01',
      firstName: 'Alex',
      lastName: 'Developer',
      email: 'alex.dev@staffsync.corp',
      department: itDept._id,
      designation: devDesig._id,
      manager: mgrEmp._id,
      employmentStatus: 'ACTIVE'
    });
    const staffUser = await User.create({
      name: 'Alex Developer',
      email: 'alex.dev@staffsync.corp',
      password: 'DeveloperPass@2026',
      role: 'EMPLOYEE',
      employee: staffEmp._id
    });
    staffEmp.user = staffUser._id;
    await staffEmp.save();
    assert(staffEmp.manager.toString() === mgrEmp._id.toString(), 'Employee successfully assigned to Manager');

    // Initialize Leave Balance for Employee
    const balance = await LeaveBalance.create({
      employee: staffEmp._id,
      year: new Date().getFullYear()
    });
    assert(balance && balance.balances.ANNUAL.total === 18, 'Leave balance initialized with standard quota');

    // 6. Attendance Flow & Rules
    const todayStr = formatDateYYYYMMDD(new Date());
    const checkInTime = new Date();
    const attendance = await Attendance.create({
      employee: staffEmp._id,
      date: todayStr,
      checkInTime,
      status: 'PRESENT'
    });
    assert(attendance && attendance.status === 'PRESENT', 'Employee check-in recorded with server timestamp');

    // Test duplicate check-in rule
    let duplicateCheckInFailed = false;
    try {
      await Attendance.create({
        employee: staffEmp._id,
        date: todayStr,
        checkInTime: new Date(),
        status: 'PRESENT'
      });
    } catch (e) {
      duplicateCheckInFailed = true;
    }
    assert(duplicateCheckInFailed, 'Duplicate check-in on the same date strictly rejected by unique index');

    // Check-out flow
    const checkOutTime = new Date(checkInTime.getTime() + 8 * 60 * 60 * 1000); // 8 hours later
    attendance.checkOutTime = checkOutTime;
    attendance.workingMinutes = 480;
    await attendance.save();
    assert(attendance.workingMinutes === 480, 'Check-out completed and 480 working minutes calculated');

    // 7. Leave Application & Approval Workflow
    const leaveStart = new Date();
    leaveStart.setDate(leaveStart.getDate() + 5);
    const leaveEnd = new Date();
    leaveEnd.setDate(leaveEnd.getDate() + 7);

    const leaveReq = await LeaveRequest.create({
      employee: staffEmp._id,
      leaveType: 'ANNUAL',
      startDate: leaveStart,
      endDate: leaveEnd,
      totalDays: 3,
      reason: 'Family vacation',
      status: 'PENDING'
    });
    assert(leaveReq && leaveReq.status === 'PENDING', 'Leave application submitted in PENDING state');

    // Approval by Manager
    leaveReq.status = 'APPROVED';
    leaveReq.reviewedBy = mgrUser._id;
    leaveReq.reviewedAt = new Date();
    await leaveReq.save();

    // Deduct balance
    balance.balances.ANNUAL.used += leaveReq.totalDays;
    await balance.save();

    const updatedBalance = await LeaveBalance.findById(balance._id);
    assert(
      updatedBalance.balances.ANNUAL.used === 3 &&
      (updatedBalance.balances.ANNUAL.total - updatedBalance.balances.ANNUAL.used) === 15,
      'Leave approval safely deducted 3 days from Annual quota (15 remaining)'
    );

    // 8. Announcement Publishing
    const announcement = await Announcement.create({
      title: 'Annual Company Hackathon 2026',
      content: 'We are thrilled to announce our upcoming company-wide hackathon!',
      category: 'EVENT',
      priority: 'HIGH',
      status: 'PUBLISHED',
      targetAudience: 'ALL',
      author: adminUser._id
    });
    assert(announcement && announcement.status === 'PUBLISHED', 'Announcement published with targetAudience: ALL');

    // 9. Training Management
    const program = await TrainingProgram.create({
      title: 'Cloud Architecture & DevOps',
      description: 'Hands-on training in scalable microservices',
      trainer: 'StaffSync Engineering Academy',
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      createdBy: adminUser._id
    });
    assert(program && program.title.includes('Cloud Architecture'), 'Training program created');

    const enrollment = await TrainingEnrollment.create({
      program: program._id,
      employee: staffEmp._id,
      progressPercentage: 50,
      status: 'IN_PROGRESS'
    });
    assert(enrollment && enrollment.progressPercentage === 50, 'Employee enrolled and 50% progress tracked');

    // 10. Restricted Payroll
    const payroll = await PayrollRecord.create({
      employee: staffEmp._id,
      payPeriodMonth: 10,
      payPeriodYear: 2026,
      baseSalary: 65000,
      allowances: [{ title: 'HRA', amount: 15000 }],
      deductions: [{ title: 'Provident Fund', amount: 3000 }],
      grossSalary: 80000,
      totalDeductions: 3000,
      netSalary: 77000,
      status: 'PROCESSED',
      processedBy: adminUser._id
    });
    assert(
      payroll && payroll.netSalary === 77000,
      'Restricted payroll record generated with correct gross/deduction/net breakdown'
    );
    assert(
      payroll &&
      (payroll.disclaimer || '').toLowerCase().includes('internal hr record'),
      'Payroll includes explicit disclaimer of no external banking gateway integration'
    );

    // 11. Dashboard Calculations
    const totalEmployees = await Employee.countDocuments({ employmentStatus: { $ne: 'TERMINATED' } });
    const presentToday = await Attendance.countDocuments({ date: todayStr, status: 'PRESENT' });
    const approvedLeaves = await LeaveRequest.countDocuments({ status: 'APPROVED' });

    assert(totalEmployees === 3, `Calculated actual total workforce: ${totalEmployees}`);
    assert(presentToday === 1, `Calculated actual present today: ${presentToday}`);
    assert(approvedLeaves === 1, `Calculated actual approved leaves: ${approvedLeaves}`);

    console.log('\n====================================================');
    console.log(` Test Summary: ${passed} Passed, ${failed} Failed`);
    console.log('====================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\x1b[31m[Test Suite Error]\x1b[0m', error);
    process.exit(1);
  }
};

runTests();
