const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const LeaveBalance = require('../models/LeaveBalance');
const { logActivity } = require('../utils/logger');

// Generate signed JWT
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'staffsync_fallback_secret_key_development',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

// @desc    User Login
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both work email and password'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+password')
      .populate({
        path: 'employee',
        populate: [
          { path: 'department', select: 'name code' },
          { path: 'designation', select: 'title' }
        ]
      });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact HR Administrator.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate token
    const token = generateToken(user._id);

    // Audit log
    await logActivity({
      actor: user._id,
      actorName: user.name,
      action: 'LOGIN',
      module: 'AUTH',
      ipAddress: req.ip
    });

    const userObj = user.toJSON();

    res.status(200).json({
      success: true,
      token,
      user: userObj
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current authenticated user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'employee',
      populate: [
        { path: 'department', select: 'name code' },
        { path: 'designation', select: 'title' },
        { path: 'manager', select: 'firstName lastName email employeeCode' }
      ]
    });

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change authenticated user password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current and new password'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password does not match'
      });
    }

    user.password = newPassword;
    await user.save();

    await logActivity({
      actor: user._id,
      actorName: user.name,
      action: 'CHANGE_PASSWORD',
      module: 'AUTH',
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout acknowledgment & activity log
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await logActivity({
        actor: req.user._id,
        actorName: req.user.name,
        action: 'LOGOUT',
        module: 'AUTH',
        ipAddress: req.ip
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new employee account (Self-service sign-up)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const {
      fullName,
      firstName,
      lastName,
      email,
      password,
      phone,
      gender,
      department,
      designation
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Work email and password are required.'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }

    // Determine first and last name (allow typing full name at once)
    let fName = firstName?.trim();
    let lName = lastName?.trim();

    if (fullName && fullName.trim()) {
      const parts = fullName.trim().split(/\s+/);
      fName = parts[0];
      lName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
    }

    if (!fName || !lName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your full name.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check existing User
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in.'
      });
    }

    // Check existing Employee
    const existingEmp = await Employee.findOne({ email: cleanEmail });
    if (existingEmp) {
      return res.status(400).json({
        success: false,
        message: 'An employee record with this email already exists.'
      });
    }

    // Generate unique employee code
    const lastEmps = await Employee.find({}, 'employeeCode');
    const nums = lastEmps.map((e) => {
      const m = e.employeeCode ? e.employeeCode.match(/(\d+)$/) : null;
      return m ? parseInt(m[1], 10) : 0;
    });
    const max = Math.max(0, ...nums);
    const nextCode = `EMP-${String(Math.max(max + 1, 1011)).padStart(4, '0')}`;

    // Create Employee record
    const employee = await Employee.create({
      employeeCode: nextCode,
      firstName: fName,
      lastName: lName,
      email: cleanEmail,
      phone: phone?.trim() || '',
      gender: gender || 'PREFER_NOT_TO_SAY',
      joiningDate: new Date(),
      department: department || null,
      designation: designation || null,
      employmentStatus: 'ACTIVE',
      employmentType: 'FULL_TIME',
      baseSalary: 45000
    });

    // Create User record
    const user = await User.create({
      name: `${fName} ${lName}`.trim(),
      email: cleanEmail,
      password,
      role: 'EMPLOYEE', // strictly EMPLOYEE
      employee: employee._id,
      isActive: true
    });

    // Link user back to employee
    employee.user = user._id;
    await employee.save();

    // Initialize leave balance for current year
    await LeaveBalance.create({
      employee: employee._id,
      year: new Date().getFullYear()
    });

    // Generate JWT token
    const token = generateToken(user._id);

    // Audit log
    await logActivity({
      actor: user._id,
      actorName: user.name,
      action: 'REGISTER_EMPLOYEE',
      module: 'AUTH',
      targetId: employee._id,
      details: { code: nextCode, email: cleanEmail },
      ipAddress: req.ip
    });

    // Populate user object
    const populatedUser = await User.findById(user._id).populate({
      path: 'employee',
      populate: [
        { path: 'department', select: 'name code' },
        { path: 'designation', select: 'title' }
      ]
    });

    res.status(201).json({
      success: true,
      message: `Welcome to StaffSync, ${fName}! Your employee account (${nextCode}) has been created.`,
      token,
      user: populatedUser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get departments and designations for registration dropdowns
// @route   GET /api/auth/departments
// @access  Public
const getPublicDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({ isActive: true }).select('name code description');
    const designations = await Designation.find({ isActive: true }).select('title department');
    res.status(200).json({
      success: true,
      departments,
      designations
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  register,
  getMe,
  changePassword,
  logout,
  getPublicDepartments
};
