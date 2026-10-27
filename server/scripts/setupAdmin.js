require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const LeaveBalance = require('../models/LeaveBalance');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => {
  return new Promise((resolve) => rl.question(query, resolve));
};

const parseArgs = () => {
  const args = {};
  const rawArgs = process.argv.slice(2);
  for (let i = 0; i < rawArgs.length; i++) {
    if (rawArgs[i].startsWith('--')) {
      const key = rawArgs[i].substring(2);
      const nextArg = rawArgs[i + 1];
      if (nextArg && !nextArg.startsWith('--')) {
        args[key] = nextArg;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
};

const runSetup = async () => {
  console.log('==================================================');
  console.log('  StaffSync HR Management System — Admin Provisioning');
  console.log('==================================================\n');

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/staffsync_db';
    console.log(`Connecting to MongoDB at: ${mongoUri}...`);
    await mongoose.connect(mongoUri);
    console.log('Connected to database successfully.\n');

    // 1. Guard check: has an HR Admin already been provisioned?
    const existingAdmin = await User.findOne({ role: 'HR_ADMIN' });
    if (existingAdmin) {
      console.error('\x1b[31m[SECURITY ALERT] An HR Administrator account is already provisioned in this database.\x1b[0m');
      console.error('Initial setup cannot be repeated to prevent unauthorized administrator takeover.');
      console.error(`Existing administrator registered with email: ${existingAdmin.email}`);
      process.exit(1);
    }

    const args = parseArgs();

    let name = args.name;
    let email = args.email;
    let password = args.password;

    if (!name) {
      name = await askQuestion('Enter HR Administrator Full Name: ');
    }
    if (!email) {
      email = await askQuestion('Enter Administrator Work Email: ');
    }
    if (!password) {
      password = await askQuestion('Enter Secure Password (min 8 chars): ');
    }

    name = (name || '').trim();
    email = (email || '').trim().toLowerCase();
    password = (password || '').trim();

    if (!name || !email || !password) {
      console.error('\x1b[31m[ERROR] Name, email, and password are all strictly required.\x1b[0m');
      process.exit(1);
    }

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/;
    if (!emailRegex.test(email)) {
      console.error('\x1b[31m[ERROR] Invalid email address format.\x1b[0m');
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('\x1b[31m[ERROR] Password must be at least 8 characters long for security compliance.\x1b[0m');
      process.exit(1);
    }

    // Ensure HR department exists or create default
    let hrDept = await Department.findOne({ code: 'HR' });
    if (!hrDept) {
      hrDept = await Department.create({
        name: 'Human Resources',
        code: 'HR',
        description: 'Organizational Human Resources and People Operations'
      });
      console.log('Created core "Human Resources" department.');
    }

    // Ensure HR Admin designation exists or create default
    let hrDesig = await Designation.findOne({ title: 'HR Administrator', department: hrDept._id });
    if (!hrDesig) {
      hrDesig = await Designation.create({
        title: 'HR Administrator',
        department: hrDept._id,
        description: 'Lead Human Resources Administrator'
      });
      console.log('Created core "HR Administrator" designation.');
    }

    // Create Employee record for Admin
    const employeeCode = 'EMP-HR001';
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || 'HR';
    const lastName = nameParts.slice(1).join(' ') || 'Admin';

    const employee = await Employee.create({
      employeeCode,
      firstName,
      lastName,
      email,
      department: hrDept._id,
      designation: hrDesig._id,
      employmentStatus: 'ACTIVE',
      employmentType: 'FULL_TIME',
      joiningDate: new Date()
    });

    // Create User record
    const user = await User.create({
      name,
      email,
      password,
      role: 'HR_ADMIN',
      employee: employee._id,
      isActive: true
    });

    // Link user to employee
    employee.user = user._id;
    await employee.save();

    // Set department head if not set
    if (!hrDept.headOfDepartment) {
      hrDept.headOfDepartment = employee._id;
      await hrDept.save();
    }

    // Initialize leave balance
    await LeaveBalance.create({
      employee: employee._id,
      year: new Date().getFullYear()
    });

    console.log('\n\x1b[32m[SUCCESS] Primary HR Administrator provisioned successfully!\x1b[0m');
    console.log('--------------------------------------------------');
    console.log(`Administrator Name: ${name}`);
    console.log(`Login Email:        ${email}`);
    console.log(`Role:               HR_ADMIN`);
    console.log(`Employee Code:      ${employeeCode}`);
    console.log('--------------------------------------------------');
    console.log('You can now log into the StaffSync application using these credentials.');
    console.log('Notice: Do not share these credentials with unauthorized personnel.\n');

    process.exit(0);
  } catch (err) {
    console.error('\x1b[31m[Provisioning Failed]\x1b[0m', err.message);
    process.exit(1);
  } finally {
    rl.close();
  }
};

runSetup();
