const Employee = require('../models/Employee');
const User = require('../models/User');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const LeaveBalance = require('../models/LeaveBalance');
const { logActivity, sendNotification } = require('../utils/logger');

// @desc    Get employees (paginated, filtered, role-scoped)
// @route   GET /api/employees
// @access  Private (HR_ADMIN, MANAGER)
const getEmployees = async (req, res, next) => {
  try {
    const { search, department, status, role, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = {};

    // Role-based scoping
    if (req.user.role === 'MANAGER') {
      if (!req.user.employee) {
        return res.status(200).json({
          success: true,
          count: 0,
          totalPages: 1,
          currentPage: 1,
          employees: []
        });
      }
      // Manager can see employees reporting directly to them
      query.manager = req.user.employee._id;
    } else if (req.user.role !== 'HR_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view the employee directory.'
      });
    }

    // Search filter
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { employeeCode: regex }
      ];
    }

    if (department) {
      query.department = department;
    }

    if (status) {
      query.employmentStatus = status;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const total = await Employee.countDocuments(query);
    const employees = await Employee.find(query)
      .populate('department', 'name code')
      .populate('designation', 'title')
      .populate('manager', 'firstName lastName email employeeCode')
      .populate('user', 'role isActive lastLogin')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: employees.length,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      employees
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get employee by ID
// @route   GET /api/employees/:id
// @access  Private
const getEmployeeById = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate('department')
      .populate('designation')
      .populate('manager', 'firstName lastName email employeeCode')
      .populate('user', 'role isActive lastLogin');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found.'
      });
    }

    // Role check:
    if (req.user.role === 'EMPLOYEE') {
      if (!req.user.employee || req.user.employee._id.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own profile.'
        });
      }
    } else if (req.user.role === 'MANAGER') {
      const isDirectReport = employee.manager && employee.manager._id.toString() === req.user.employee?._id.toString();
      const isSelf = req.user.employee && req.user.employee._id.toString() === employee._id.toString();
      if (!isDirectReport && !isSelf) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view team members reporting to you.'
        });
      }
    }

    res.status(200).json({
      success: true,
      employee
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new employee (and optional user account)
// @route   POST /api/employees
// @access  Private (HR_ADMIN only)
const createEmployee = async (req, res, next) => {
  try {
    const {
      employeeCode,
      firstName,
      lastName,
      email,
      phone,
      gender,
      dateOfBirth,
      joiningDate,
      department,
      designation,
      manager,
      employmentStatus,
      employmentType,
      address,
      emergencyContact,
      baseSalary,
      createUserAccount,
      accountRole,
      accountPassword
    } = req.body;

    // Check unique email and code
    let finalCode = employeeCode;
    if (!finalCode) {
      const count = await Employee.countDocuments();
      finalCode = `EMP-${String(1001 + count).padStart(4, '0')}`;
    }

    const existingCode = await Employee.findOne({ employeeCode: finalCode.toUpperCase() });
    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: `Employee Code '${finalCode}' is already in use.`
      });
    }

    const existingEmail = await Employee.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: `Work email '${email}' is already registered.`
      });
    }

    const employee = await Employee.create({
      employeeCode: finalCode.toUpperCase(),
      firstName,
      lastName,
      email: email.toLowerCase().trim(),
      phone,
      gender,
      dateOfBirth: dateOfBirth || null,
      joiningDate: joiningDate || new Date(),
      department: department || null,
      designation: designation || null,
      manager: manager || null,
      employmentStatus: employmentStatus || 'ACTIVE',
      employmentType: employmentType || 'FULL_TIME',
      address: address || {},
      emergencyContact: emergencyContact || {},
      baseSalary: baseSalary || 0
    });

    // Optionally create user account
    if (createUserAccount) {
      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'An authentication user already exists with this email address.'
        });
      }

      const role = accountRole && ['HR_ADMIN', 'MANAGER', 'EMPLOYEE'].includes(accountRole)
        ? accountRole
        : 'EMPLOYEE';

      const password = accountPassword && accountPassword.length >= 8
        ? accountPassword
        : 'StaffSync@2026';

      const user = await User.create({
        name: `${firstName} ${lastName}`.trim(),
        email: email.toLowerCase().trim(),
        password,
        role,
        employee: employee._id,
        isActive: true
      });

      employee.user = user._id;
      await employee.save();
    }

    // Initialize Leave Balance for current year
    await LeaveBalance.create({
      employee: employee._id,
      year: new Date().getFullYear()
    });

    await logActivity({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'CREATE_EMPLOYEE',
      module: 'EMPLOYEE',
      targetId: employee._id,
      details: { code: employee.employeeCode, name: `${employee.firstName} ${employee.lastName}` },
      ipAddress: req.ip
    });

    const populatedEmployee = await Employee.findById(employee._id)
      .populate('department', 'name code')
      .populate('designation', 'title')
      .populate('manager', 'firstName lastName')
      .populate('user', 'role isActive');

    res.status(201).json({
      success: true,
      message: 'Employee created successfully.',
      employee: populatedEmployee
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private
const updateEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.'
      });
    }

    // Authorization checks
    if (req.user.role === 'EMPLOYEE' || req.user.role === 'MANAGER') {
      const isSelf = req.user.employee && req.user.employee._id.toString() === employee._id.toString();

      if (!isSelf) {
        return res.status(403).json({
          success: false,
          message: req.user.role === 'MANAGER'
            ? 'Managers are not authorized to modify official employee master records.'
            : 'You are only authorized to update your own profile details.'
        });
      }

      // Non-admin users can only update permitted personal fields: phone, address, emergencyContact
      const { phone, address, emergencyContact } = req.body;
      if (phone !== undefined) employee.phone = phone;
      if (address !== undefined) employee.address = { ...employee.address, ...address };
      if (emergencyContact !== undefined) employee.emergencyContact = { ...employee.emergencyContact, ...emergencyContact };

      await employee.save();

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        employee
      });
    }

    // HR_ADMIN can update all fields
    const allowedUpdates = [
      'employeeCode', 'firstName', 'lastName', 'phone', 'gender', 'dateOfBirth',
      'joiningDate', 'department', 'designation', 'manager',
      'employmentStatus', 'employmentType', 'address', 'emergencyContact', 'baseSalary'
    ];

    // If employeeCode is changing, check uniqueness
    if (req.body.employeeCode && req.body.employeeCode.trim().toUpperCase() !== employee.employeeCode) {
      const codeUpper = req.body.employeeCode.trim().toUpperCase();
      const existing = await Employee.findOne({ employeeCode: codeUpper, _id: { $ne: employee._id } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Employee Code '${codeUpper}' is already in use by another employee.`
        });
      }
      employee.employeeCode = codeUpper;
    }

    allowedUpdates.forEach((field) => {
      if (field !== 'employeeCode' && req.body[field] !== undefined) {
        employee[field] = req.body[field];
      }
    });

    await employee.save();

    // If linked user exists and name changed, keep user's name in sync
    if (employee.user && (req.body.firstName || req.body.lastName)) {
      await User.findByIdAndUpdate(employee.user, {
        name: `${employee.firstName} ${employee.lastName}`.trim()
      });
    }

    await logActivity({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'UPDATE_EMPLOYEE',
      module: 'EMPLOYEE',
      targetId: employee._id,
      details: { code: employee.employeeCode },
      ipAddress: req.ip
    });

    const updatedEmployee = await Employee.findById(employee._id)
      .populate('department', 'name code')
      .populate('designation', 'title')
      .populate('manager', 'firstName lastName')
      .populate('user', 'role isActive');

    res.status(200).json({
      success: true,
      message: 'Employee record updated successfully.',
      employee: updatedEmployee
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle employment status / deactivate user account
// @route   PATCH /api/employees/:id/status
// @access  Private (HR_ADMIN only)
const toggleEmployeeStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employment status provided.'
      });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    employee.employmentStatus = status;
    await employee.save();

    // If terminated or suspended, deactivate linked user account
    if (employee.user) {
      const user = await User.findById(employee.user);
      if (user) {
        user.isActive = status === 'ACTIVE' || status === 'ON_LEAVE';
        await user.save();
      }
    }

    await logActivity({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'TOGGLE_STATUS',
      module: 'EMPLOYEE',
      targetId: employee._id,
      details: { newStatus: status },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `Employee status set to ${status}.`,
      employee
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete employee record
// @route   DELETE /api/employees/:id
// @access  Private (HR_ADMIN only)
const deleteEmployee = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.'
      });
    }

    // Guard: Prevent self-deletion
    if (req.user.employee && req.user.employee._id.toString() === employee._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own employee record.'
      });
    }

    // Unlink any direct reports
    await Employee.updateMany(
      { manager: employee._id },
      { $set: { manager: null } }
    );

    // Delete associated user account if one exists
    if (employee.user) {
      await User.findByIdAndDelete(employee.user);
    }

    // Delete associated leave balance records
    await LeaveBalance.deleteMany({ employee: employee._id });

    // Delete employee record
    await Employee.findByIdAndDelete(employee._id);

    await logActivity({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'DELETE_EMPLOYEE',
      module: 'EMPLOYEE',
      targetId: employee._id,
      details: {
        employeeCode: employee.employeeCode,
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email
      },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `Employee ${employee.firstName} ${employee.lastName} (${employee.employeeCode}) was successfully removed.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  deleteEmployee
};
