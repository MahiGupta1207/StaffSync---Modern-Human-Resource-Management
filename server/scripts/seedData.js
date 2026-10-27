/**
 * StaffSync — Seed Script
 * Adds sample employees, departments, designations, and announcements.
 * SAFE: Never drops or resets staffsync_db. Uses upsert / skip-if-exists.
 * Run: node server/scripts/seedData.js
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const path     = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// ─── Models ────────────────────────────────────────────────────────────────
const User         = require('../models/User');
const Employee     = require('../models/Employee');
const Department   = require('../models/Department');
const Designation  = require('../models/Designation');
const LeaveBalance = require('../models/LeaveBalance');
const Announcement = require('../models/Announcement');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/staffsync_db';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB:', MONGO_URI);

  // ── 1. Ensure departments exist ─────────────────────────────────────────
  const deptDefs = [
    { name: 'Human Resources',    code: 'HR',   description: 'People operations and HR functions' },
    { name: 'Engineering & IT',   code: 'IT',   description: 'Software development and IT operations' },
    { name: 'Sales & Marketing',  code: 'SALES',description: 'Revenue generation and brand growth' },
    { name: 'Finance',            code: 'FIN',  description: 'Financial planning and accounting' },
    { name: 'Design',             code: 'DES',  description: 'UI/UX and visual design' },
    { name: 'Operations',         code: 'OPS',  description: 'Business operations and support' },
  ];

  const deptMap = {};
  for (const d of deptDefs) {
    let dept = await Department.findOne({ code: d.code });
    if (!dept) {
      dept = await Department.create(d);
      console.log(`  ➕ Department created: ${d.name}`);
    } else {
      console.log(`  ✔  Department exists:  ${d.name}`);
    }
    deptMap[d.code] = dept;
  }

  // ── 2. Ensure designations exist ────────────────────────────────────────
  const desgDefs = [
    { title: 'HR Administrator',        key: 'HR-ADM', department: 'HR' },
    { title: 'HR Operations Executive', key: 'HR-OPS', department: 'HR' },
    { title: 'HR Business Partner',     key: 'HR-BP',  department: 'HR' },
    { title: 'Engineering Manager',     key: 'ENG-MGR',department: 'IT' },
    { title: 'Software Engineer',       key: 'SWE',    department: 'IT' },
    { title: 'Senior Software Engineer',key: 'SSWE',   department: 'IT' },
    { title: 'QA Engineer',             key: 'QAE',    department: 'IT' },
    { title: 'Sales Executive',         key: 'SALES-E',department: 'SALES' },
    { title: 'Sales Manager',           key: 'SALES-M',department: 'SALES' },
    { title: 'Finance Analyst',         key: 'FIN-A',  department: 'FIN' },
    { title: 'Finance Manager',         key: 'FIN-M',  department: 'FIN' },
    { title: 'UI/UX Designer',          key: 'UXDES',  department: 'DES' },
    { title: 'Senior Designer',         key: 'SRDES',  department: 'DES' },
    { title: 'Operations Coordinator',  key: 'OPS-C',  department: 'OPS' },
  ];

  const desgMap = {};
  for (const d of desgDefs) {
    const deptId = deptMap[d.department]._id;
    let desg = await Designation.findOne({ title: d.title, department: deptId });
    if (!desg) {
      desg = await Designation.create({
        title: d.title,
        department: deptId,
      });
      console.log(`  ➕ Designation created: ${d.title}`);
    } else {
      console.log(`  ✔  Designation exists:  ${d.title}`);
    }
    desgMap[d.key] = desg;
  }

  // ── 3. Get existing employees for manager refs ──────────────────────────
  const mahakEmp = await Employee.findOne({ employeeCode: 'EMP-HR001' });
  const saraEmp  = await Employee.findOne({ employeeCode: 'EMP-MGR01' });

  // Helper — hash password
  const hashPwd = (p) => bcrypt.hash(p, 12);

  // Helper — get next employee code
  async function nextCode() {
    const emps = await Employee.find({}, 'employeeCode').sort({ employeeCode: -1 });
    const nums = emps.map(e => {
      const m = e.employeeCode.match(/(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    });
    const max = Math.max(0, ...nums);
    const next = Math.max(max + 1, 1001);
    return `EMP-${String(next).padStart(4, '0')}`;
  }

  // Helper — init leave balance
  async function initLeaveBalance(employeeId) {
    const exists = await LeaveBalance.findOne({ employee: employeeId });
    if (!exists) {
      await LeaveBalance.create({
        employee: employeeId,
        year: new Date().getFullYear(),
        annual: { total: 18, used: 0 },
        sick:   { total: 12, used: 0 },
        casual: { total: 6,  used: 0 },
      });
    }
  }

  // Helper — create or skip employee + user
  async function ensureEmployee({ firstName, lastName, email, password, role, empCode, deptCode, desgCode, managerEmp, gender, phone, joiningDate, baseSalary }) {
    let emp = await Employee.findOne({ email });
    if (emp) {
      console.log(`  ✔  Employee exists:  ${firstName} ${lastName} (${email})`);
      return emp;
    }

    const code = empCode || await nextCode();

    let user = await User.findOne({ email });
    if (!user) {
      const hashed = await hashPwd(password);
      user = await User.create({ name: `${firstName} ${lastName}`, email, password: hashed, role });
    }

    emp = await Employee.create({
      employeeCode: code,
      user: user._id,
      firstName, lastName, email,
      phone: phone || '',
      gender: gender || 'PREFER_NOT_TO_SAY',
      joiningDate: new Date(joiningDate || '2024-01-15'),
      department: deptMap[deptCode]?._id || null,
      designation: desgMap[desgCode]?._id || null,
      manager: managerEmp?._id || null,
      employmentStatus: 'ACTIVE',
      employmentType: 'FULL_TIME',
      baseSalary: baseSalary || 45000,
    });

    // Link user → employee
    user.employee = emp._id;
    await user.save();

    await initLeaveBalance(emp._id);

    console.log(`  ➕ Employee created: ${firstName} ${lastName} (${code})`);
    return emp;
  }

  // ── 4. Seed sample employees ────────────────────────────────────────────
  // Also init leave balance for existing employees
  if (mahakEmp) await initLeaveBalance(mahakEmp._id);
  if (saraEmp)  await initLeaveBalance(saraEmp._id);
  const praveshEmp = await Employee.findOne({ employeeCode: 'EMP-DEV01' });
  if (praveshEmp) await initLeaveBalance(praveshEmp._id);

  await ensureEmployee({
    firstName: 'Mitali', lastName: 'Sharma',
    email: 'mitali.sharma@staffsync.corp',
    password: 'Mitali@1234',
    role: 'EMPLOYEE',
    deptCode: 'HR', desgCode: 'HR-OPS',
    managerEmp: mahakEmp,
    gender: 'FEMALE', phone: '+91 98765 11001',
    joiningDate: '2024-03-01', baseSalary: 42000,
  });

  await ensureEmployee({
    firstName: 'Prakhar', lastName: 'Gupta',
    email: 'prakhar.gupta@staffsync.corp',
    password: 'Prakhar@1234',
    role: 'EMPLOYEE',
    deptCode: 'IT', desgCode: 'SSWE',
    managerEmp: saraEmp,
    gender: 'MALE', phone: '+91 98765 11002',
    joiningDate: '2023-07-15', baseSalary: 72000,
  });

  await ensureEmployee({
    firstName: 'Siya', lastName: 'Tripathi',
    email: 'siya.tripathi@staffsync.corp',
    password: 'Siya@1234',
    role: 'EMPLOYEE',
    deptCode: 'SALES', desgCode: 'SALES-E',
    gender: 'FEMALE', phone: '+91 98765 11003',
    joiningDate: '2024-06-01', baseSalary: 38000,
  });

  await ensureEmployee({
    firstName: 'Seher', lastName: 'Khan',
    email: 'seher.khan@staffsync.corp',
    password: 'Seher@1234',
    role: 'EMPLOYEE',
    deptCode: 'DES', desgCode: 'UXDES',
    gender: 'FEMALE', phone: '+91 98765 11004',
    joiningDate: '2024-04-10', baseSalary: 55000,
  });

  await ensureEmployee({
    firstName: 'Rohan', lastName: 'Verma',
    email: 'rohan.verma@staffsync.corp',
    password: 'Rohan@1234',
    role: 'EMPLOYEE',
    deptCode: 'IT', desgCode: 'SWE',
    managerEmp: saraEmp,
    gender: 'MALE', phone: '+91 98765 11005',
    joiningDate: '2024-01-20', baseSalary: 58000,
  });

  await ensureEmployee({
    firstName: 'Ananya', lastName: 'Mehta',
    email: 'ananya.mehta@staffsync.corp',
    password: 'Ananya@1234',
    role: 'EMPLOYEE',
    deptCode: 'FIN', desgCode: 'FIN-A',
    gender: 'FEMALE', phone: '+91 98765 11006',
    joiningDate: '2023-11-01', baseSalary: 48000,
  });

  await ensureEmployee({
    firstName: 'Kabir', lastName: 'Singh',
    email: 'kabir.singh@staffsync.corp',
    password: 'Kabir@1234',
    role: 'EMPLOYEE',
    deptCode: 'OPS', desgCode: 'OPS-C',
    gender: 'MALE', phone: '+91 98765 11007',
    joiningDate: '2024-08-15', baseSalary: 35000,
  });

  await ensureEmployee({
    firstName: 'Nisha', lastName: 'Patel',
    email: 'nisha.patel@staffsync.corp',
    password: 'Nisha@1234',
    role: 'EMPLOYEE',
    deptCode: 'DES', desgCode: 'SRDES',
    gender: 'FEMALE', phone: '+91 98765 11008',
    joiningDate: '2023-05-01', baseSalary: 65000,
  });

  await ensureEmployee({
    firstName: 'Arjun', lastName: 'Kapoor',
    email: 'arjun.kapoor@staffsync.corp',
    password: 'Arjun@1234',
    role: 'EMPLOYEE',
    deptCode: 'IT', desgCode: 'QAE',
    managerEmp: saraEmp,
    gender: 'MALE', phone: '+91 98765 11009',
    joiningDate: '2024-02-01', baseSalary: 50000,
  });

  await ensureEmployee({
    firstName: 'Pooja', lastName: 'Rao',
    email: 'pooja.rao@staffsync.corp',
    password: 'Pooja@1234',
    role: 'EMPLOYEE',
    deptCode: 'SALES', desgCode: 'SALES-E',
    gender: 'FEMALE', phone: '+91 98765 11010',
    joiningDate: '2024-09-01', baseSalary: 36000,
  });

  // ── 5. Seed announcements ───────────────────────────────────────────────
  const mahakUser = mahakEmp ? await User.findById(mahakEmp.user) : null;

  const announcements = [
    {
      title: 'Welcome to Q4 2026 — Stronger Together!',
      content: `Dear Team,\n\nAs we step into the final quarter of 2026, we want to take a moment to celebrate the incredible milestones we've achieved together. From successful product launches to record client satisfaction scores, your hard work and dedication have made it all possible.\n\nLet's close the year on a high note. Stay motivated, support each other, and remember — every effort counts!\n\nWith gratitude,\nHR Team`,
      category: 'GENERAL',
      priority: 'MEDIUM',
      targetAudience: 'ALL',
      status: 'PUBLISHED',
      publishedAt: new Date('2026-10-01'),
    },
    {
      title: 'Updated Work From Home Policy — Effective November 2026',
      content: `We are pleased to announce the updated Work From Home (WFH) policy, effective 1st November 2026.\n\nKey Highlights:\n• Employees may work from home up to 2 days per week.\n• WFH days must be pre-approved by your direct manager.\n• Core hours (10 AM – 4 PM IST) must be observed on all days.\n• All WFH requests must be logged in StaffSync under the Attendance module.\n\nPlease reach out to HR if you have any questions.`,
      category: 'POLICY',
      priority: 'HIGH',
      targetAudience: 'ALL',
      status: 'PUBLISHED',
      publishedAt: new Date('2026-10-10'),
    },
    {
      title: 'Annual Company Celebration — December 2026',
      content: `🎉 Save the Date!\n\nWe are thrilled to announce the StaffSync Annual Company Celebration this December!\n\n📅 Date: Saturday, 20th December 2026\n📍 Venue: The Grand Ballroom, Hotel Meridian, New Delhi\n🕖 Time: 6:30 PM onwards\n\nThe evening will feature:\n• Awards & Recognitions\n• Cultural performances\n• Gala dinner & networking\n\nFormal invitations will be sent shortly. Attendance is strongly encouraged for all team members. Partners are welcome!\n\nStay tuned for more details.`,
      category: 'EVENT',
      priority: 'MEDIUM',
      targetAudience: 'ALL',
      status: 'PUBLISHED',
      publishedAt: new Date('2026-10-15'),
    },
    {
      title: 'Public Holiday Notice — Diwali 2026',
      content: `Dear All,\n\nPlease note that the office will remain closed on the following dates in observance of Diwali:\n\n🪔 Thursday, 29th October 2026 — Dhanteras\n🪔 Friday, 30th October 2026 — Diwali\n🪔 Monday, 2nd November 2026 — Bhai Dooj\n\nWishing you and your families a very Happy, Safe, and Prosperous Diwali! ✨\n\n– HR Department`,
      category: 'HOLIDAY',
      priority: 'HIGH',
      targetAudience: 'ALL',
      status: 'PUBLISHED',
      publishedAt: new Date('2026-10-20'),
    },
    {
      title: '🔐 IT Security Alert — Mandatory Password Reset',
      content: `URGENT: All employees are required to reset their StaffSync account passwords immediately.\n\nReason: As part of our quarterly security audit, IT has identified that several accounts are using passwords that do not meet the updated security standards.\n\nAction Required:\n1. Log in to StaffSync.\n2. Go to My Profile → Change Password.\n3. Set a new password with at least 8 characters, including uppercase, lowercase, a number, and a special character.\n\nDeadline: 31st October 2026\n\nAccounts not updated by the deadline may be temporarily suspended. Contact IT support if you face any issues.`,
      category: 'URGENT',
      priority: 'HIGH',
      targetAudience: 'ALL',
      status: 'PUBLISHED',
      publishedAt: new Date('2026-10-22'),
    },
    {
      title: 'New Training Programs Available — Q4 2026',
      content: `We are excited to announce the launch of four new professional development programs for Q4 2026:\n\n📘 1. Leadership Essentials (for L3+ employees)\n📗 2. Advanced Excel & Data Analysis\n📙 3. Effective Communication Skills\n📕 4. Agile Project Management (SCRUM Fundamentals)\n\nEnrollment is now open on StaffSync under the Training section. Programs are available in both online and in-person formats.\n\nSpots are limited — enroll today!`,
      category: 'GENERAL',
      priority: 'MEDIUM',
      targetAudience: 'ALL',
      status: 'PUBLISHED',
      publishedAt: new Date('2026-10-25'),
    },
    {
      title: 'Year-End Performance Review Cycle Begins',
      content: `Dear Team,\n\nThe Year-End Performance Review Cycle for 2026 will commence from 1st December 2026.\n\nTimeline:\n• Self-Assessment Submissions: 1–10 December\n• Manager Reviews: 11–20 December\n• HR Calibration: 21–24 December\n• Final Ratings Released: 31st December 2026\n\nMore details and the self-assessment form will be shared on StaffSync closer to the date. Ensure your goals and achievements are up to date in your profile.\n\nFor queries, contact hr@staffsync.corp`,
      category: 'GENERAL',
      priority: 'HIGH',
      targetAudience: 'ALL',
      status: 'PUBLISHED',
      publishedAt: new Date('2026-10-27'),
    },
  ];

  for (const ann of announcements) {
    const exists = await Announcement.findOne({ title: ann.title });
    if (!exists) {
      await Announcement.create({ ...ann, author: mahakUser?._id || null });
      console.log(`  ➕ Announcement created: "${ann.title}"`);
    } else {
      console.log(`  ✔  Announcement exists:  "${ann.title}"`);
    }
  }

  console.log('\n🎉 Seed complete!');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
