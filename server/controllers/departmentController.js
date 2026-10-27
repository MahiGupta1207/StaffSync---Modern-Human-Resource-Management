const Department = require('../models/Department');
const Designation = require('../models/Designation');
const Employee = require('../models/Employee');
const { logActivity } = require('../utils/logger');

// @desc    Get all departments with employee counts
// @route   GET /api/departments
// @access  Private
const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find()
      .populate('headOfDepartment', 'firstName lastName email employeeCode')
      .sort({ name: 1 })
      .lean();

    // Calculate actual active employee counts per department
    const departmentsWithCounts = await Promise.all(
      departments.map(async (dept) => {
        const employeeCount = await Employee.countDocuments({
          department: dept._id,
          employmentStatus: { $ne: 'TERMINATED' }
        });
        const designationCount = await Designation.countDocuments({
          department: dept._id
        });
        return {
          ...dept,
          employeeCount,
          designationCount
        };
      })
    );

    res.status(200).json({
      success: true,
      count: departmentsWithCounts.length,
      departments: departmentsWithCounts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create department
// @route   POST /api/departments
// @access  Private (HR_ADMIN)
const createDepartment = async (req, res, next) => {
  try {
    const { name, code, description, headOfDepartment } = req.body;

    const existingCode = await Department.findOne({ code: code.toUpperCase().trim() });
    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: `Department with code '${code}' already exists.`
      });
    }

    const existingName = await Department.findOne({ name: name.trim() });
    if (existingName) {
      return res.status(400).json({
        success: false,
        message: `Department with name '${name}' already exists.`
      });
    }

    const department = await Department.create({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      description: description || '',
      headOfDepartment: headOfDepartment || null
    });

    await logActivity({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'CREATE_DEPARTMENT',
      module: 'DEPARTMENT',
      targetId: department._id,
      details: { name: department.name, code: department.code },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Department created successfully.',
      department
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private (HR_ADMIN)
const updateDepartment = async (req, res, next) => {
  try {
    const { name, description, headOfDepartment, isActive } = req.body;
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    if (name) department.name = name.trim();
    if (description !== undefined) department.description = description;
    if (headOfDepartment !== undefined) department.headOfDepartment = headOfDepartment || null;
    if (isActive !== undefined) department.isActive = isActive;

    await department.save();

    await logActivity({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'UPDATE_DEPARTMENT',
      module: 'DEPARTMENT',
      targetId: department._id,
      details: { name: department.name },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Department updated successfully.',
      department
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete department (with integrity protection)
// @route   DELETE /api/departments/:id
// @access  Private (HR_ADMIN)
const deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    // Integrity check: do employees exist in this department?
    const associatedEmployees = await Employee.countDocuments({ department: department._id });
    if (associatedEmployees > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department: ${associatedEmployees} active employee record(s) are assigned to it. Please reassign them first.`
      });
    }

    // Delete associated designations
    await Designation.deleteMany({ department: department._id });
    await department.deleteOne();

    await logActivity({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'DELETE_DEPARTMENT',
      module: 'DEPARTMENT',
      targetId: req.params.id,
      details: { name: department.name },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Department and associated designations deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get designations (optionally filtered by department)
// @route   GET /api/departments/designations
// @access  Private
const getDesignations = async (req, res, next) => {
  try {
    const { department } = req.query;
    const query = {};
    if (department) query.department = department;

    const designations = await Designation.find(query)
      .populate('department', 'name code')
      .sort({ title: 1 });

    res.status(200).json({
      success: true,
      count: designations.length,
      designations
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create designation
// @route   POST /api/departments/designations
// @access  Private (HR_ADMIN)
const createDesignation = async (req, res, next) => {
  try {
    const { title, department, description } = req.body;

    if (!title || !department) {
      return res.status(400).json({
        success: false,
        message: 'Title and department are required for designation.'
      });
    }

    const designation = await Designation.create({
      title: title.trim(),
      department,
      description: description || ''
    });

    const populated = await Designation.findById(designation._id).populate('department', 'name code');

    res.status(201).json({
      success: true,
      message: 'Designation created successfully.',
      designation: populated
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDesignations,
  createDesignation
};
