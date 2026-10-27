/**
 * StaffSync — Seed Training Programs & Historical Attendance
 * Run: node server/scripts/seedTrainingAndAttendance.js
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const TrainingProgram = require('../models/TrainingProgram');
const TrainingEnrollment = require('../models/TrainingEnrollment');
const Attendance = require('../models/Attendance');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/staffsync_db';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB:', MONGO_URI);

  // 1. Fetch Users & Employees & Departments
  const adminUser = await User.findOne({ role: 'HR_ADMIN' });
  const managerUser = await User.findOne({ role: 'MANAGER' });

  const depts = await Department.find({});
  const deptMap = {};
  depts.forEach(d => { deptMap[d.code] = d._id; });

  const allEmployees = await Employee.find({});
  const empMap = {};
  allEmployees.forEach(e => { empMap[e.employeeCode] = e; });

  console.log(`Found ${allEmployees.length} employees in database.`);

  // 2. Training Programs Definitions
  const programsData = [
    {
      title: 'Full-Stack MERN Architecture & High-Performance Microservices',
      description: 'Comprehensive engineering track covering React 18 concurrency, Node.js cluster optimization, MongoDB indexing strategies, and Docker containerization.',
      trainer: 'Dr. Alok Nath (Principal Cloud Architect)',
      deptCode: 'IT',
      startDate: new Date('2026-10-05'),
      endDate: new Date('2026-11-20'),
      capacity: 25,
      status: 'IN_PROGRESS',
      enrollments: [
        { empCode: 'EMP-DEV01', progress: 75, status: 'IN_PROGRESS', feedback: 'Excellent modules on MongoDB aggregations and indexing!' },
        { empCode: 'EMP-1002', progress: 85, status: 'IN_PROGRESS', feedback: 'Very practical examples on Express security middleware.' },
        { empCode: 'EMP-1005', progress: 45, status: 'IN_PROGRESS', feedback: 'Working through concurrency and async patterns.' },
        { empCode: 'EMP-1009', progress: 60, status: 'IN_PROGRESS', feedback: 'Unit and integration test suites were super clear.' }
      ]
    },
    {
      title: 'Strategic HR Analytics & Predictive Workforce Modeling',
      description: 'Empowering HR professionals to leverage workforce data, attrition forecasting, compensation benchmarking, and modern performance appraisal frameworks.',
      trainer: 'Sunita Deshmukh (Chief HR Strategist)',
      deptCode: 'HR',
      startDate: new Date('2026-10-12'),
      endDate: new Date('2026-11-18'),
      capacity: 15,
      status: 'IN_PROGRESS',
      enrollments: [
        { empCode: 'EMP-1001', progress: 50, status: 'IN_PROGRESS', feedback: 'Insights into retention metrics and employee engagement indices are great.' },
        { empCode: 'EMP-HR001', progress: 100, status: 'COMPLETED', feedback: 'Exceptional executive overview of HR metric dashboards.' }
      ]
    },
    {
      title: 'Design Systems & Modern UX Prototyping with Figma Tokens',
      description: 'Advanced design principles, atomic design token pipelines, accessibility standards (WCAG 2.1 AA), and interactive micro-interactions.',
      trainer: 'Vikramaditya Sen (Senior Design Director)',
      deptCode: 'DES',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-11-05'),
      capacity: 20,
      status: 'IN_PROGRESS',
      enrollments: [
        { empCode: 'EMP-1004', progress: 80, status: 'IN_PROGRESS', feedback: 'Figma tokens integration with component libraries was fantastic.' },
        { empCode: 'EMP-1008', progress: 95, status: 'IN_PROGRESS', feedback: 'Polished workflow for design-to-engineering handoff.' }
      ]
    },
    {
      title: 'B2B Enterprise Solution Selling & Client Value Realization',
      description: 'Consultative sales methodologies, objection handling, C-level executive pitches, and CRM pipeline velocity maximization.',
      trainer: 'Rajeshwar Rao (Global Head of Enterprise Sales)',
      deptCode: 'SALES',
      startDate: new Date('2026-11-02'),
      endDate: new Date('2026-12-10'),
      capacity: 20,
      status: 'UPCOMING',
      enrollments: [
        { empCode: 'EMP-1003', progress: 0, status: 'ENROLLED', feedback: '' },
        { empCode: 'EMP-1010', progress: 0, status: 'ENROLLED', feedback: '' }
      ]
    },
    {
      title: 'Corporate Financial Valuation, Modeling & Cash Flow Auditing',
      description: 'Discounted Cash Flow (DCF), LBO analysis, balance sheet reconciliations, and regulatory compliance standards.',
      trainer: 'CA Deepa Singhania (Senior Valuation Partner)',
      deptCode: 'FIN',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-10-02'),
      capacity: 15,
      status: 'COMPLETED',
      enrollments: [
        { empCode: 'EMP-1006', progress: 100, status: 'COMPLETED', feedback: 'Comprehensive case studies and financial modeling spreadsheets.' }
      ]
    },
    {
      title: 'Agile Team Leadership & High-Velocity Sprint Execution',
      description: 'Modern Scrum rituals, servant leadership, sprint capacity planning, and removing cross-functional blockers.',
      trainer: 'Nathan Reed (Certified Agile Coach)',
      deptCode: 'IT',
      startDate: new Date('2026-10-18'),
      endDate: new Date('2026-11-28'),
      capacity: 30,
      status: 'IN_PROGRESS',
      enrollments: [
        { empCode: 'EMP-MGR01', progress: 65, status: 'IN_PROGRESS', feedback: 'Very useful tips for team 1-on-1s and sprint retrospectives.' },
        { empCode: 'EMP-1007', progress: 50, status: 'IN_PROGRESS', feedback: 'Applying agile backlog refinement in our operations flow.' },
        { empCode: 'EMP-DEV01', progress: 40, status: 'IN_PROGRESS', feedback: 'Good perspective on sprint estimation.' }
      ]
    },
    {
      title: 'Enterprise Information Security, Privacy & Compliance (2026)',
      description: 'Essential security practices: phishing awareness, zero-trust access, secure credential hygiene, and ISO 27001 data protection standards.',
      trainer: 'CyberSecurity & Compliance Committee',
      deptCode: null,
      startDate: new Date('2026-11-10'),
      endDate: new Date('2026-11-30'),
      capacity: 100,
      status: 'UPCOMING',
      enrollments: [
        { empCode: 'EMP-DEV01', progress: 0, status: 'ENROLLED', feedback: '' },
        { empCode: 'EMP-1001', progress: 0, status: 'ENROLLED', feedback: '' },
        { empCode: 'EMP-1002', progress: 0, status: 'ENROLLED', feedback: '' },
        { empCode: 'EMP-1003', progress: 0, status: 'ENROLLED', feedback: '' },
        { empCode: 'EMP-1004', progress: 0, status: 'ENROLLED', feedback: '' },
        { empCode: 'EMP-1006', progress: 0, status: 'ENROLLED', feedback: '' }
      ]
    }
  ];

  // 3. Seed Programs & Enrollments
  for (const progData of programsData) {
    let program = await TrainingProgram.findOne({ title: progData.title });
    if (!program) {
      program = await TrainingProgram.create({
        title: progData.title,
        description: progData.description,
        trainer: progData.trainer,
        department: progData.deptCode ? deptMap[progData.deptCode] : null,
        startDate: progData.startDate,
        endDate: progData.endDate,
        capacity: progData.capacity,
        status: progData.status,
        createdBy: adminUser?._id || managerUser?._id
      });
      console.log(`  ➕ Training Program created: "${program.title}"`);
    } else {
      console.log(`  ✔  Training Program exists:  "${program.title}"`);
    }

    // Enroll participants
    for (const enr of progData.enrollments) {
      const emp = empMap[enr.empCode];
      if (!emp) continue;

      const existingEnr = await TrainingEnrollment.findOne({ program: program._id, employee: emp._id });
      if (!existingEnr) {
        await TrainingEnrollment.create({
          program: program._id,
          employee: emp._id,
          progressPercentage: enr.progress,
          status: enr.status,
          completionDate: enr.status === 'COMPLETED' ? program.endDate : null,
          feedback: enr.feedback || ''
        });
        console.log(`     -> Enrolled ${emp.firstName} ${emp.lastName} (${enr.progress}%)`);
      }
    }
  }

  // 4. Seed Historical Attendance Records for October 2026
  console.log('\nSeeding historical attendance records for realistic analytics...');
  const octDates = [
    '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23',
    '2026-10-26', '2026-10-27'
  ];

  for (const dateStr of octDates) {
    for (const emp of allEmployees) {
      const exists = await Attendance.findOne({ employee: emp._id, date: dateStr });
      if (exists) continue;

      // Randomize realistic attendance (mostly present, some WFH, occasional late)
      const rand = Math.random();
      let status = 'PRESENT';
      let checkInHour = 9;
      let checkInMin = Math.floor(Math.random() * 25); // 9:00 - 9:25

      if (rand < 0.20) {
        status = 'WORK_FROM_HOME';
      } else if (rand < 0.35) {
        status = 'LATE';
        checkInHour = 9;
        checkInMin = 35 + Math.floor(Math.random() * 20); // 9:35 - 9:55
      }

      const checkInTime = new Date(`${dateStr}T${String(checkInHour).padStart(2, '0')}:${String(checkInMin).padStart(2, '0')}:00Z`);
      const checkOutHour = 18;
      const checkOutMin = Math.floor(Math.random() * 30);
      const checkOutTime = new Date(`${dateStr}T${String(checkOutHour).padStart(2, '0')}:${String(checkOutMin).padStart(2, '0')}:00Z`);
      const workingMinutes = Math.floor((checkOutTime - checkInTime) / (1000 * 60));

      await Attendance.create({
        employee: emp._id,
        date: dateStr,
        checkInTime,
        checkOutTime,
        workingMinutes,
        status,
        notes: status === 'WORK_FROM_HOME' ? 'Remote working day' : status === 'LATE' ? 'Traffic delay' : 'Regular shift',
        ipAddress: '127.0.0.1'
      });
    }
  }

  console.log('✔ Attendance history successfully seeded across October dates!');
  console.log('\n🎉 Training & Development + Attendance seed complete!');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
