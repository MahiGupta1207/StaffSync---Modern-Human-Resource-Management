const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const Employee = require('../models/Employee');
const User = require('../models/User');
const { logActivity, sendNotification } = require('../utils/logger');

// @desc    Submit a new leave application
// @route   POST /api/leaves/apply
// @access  Private
const applyLeave = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(400).json({
        success: false,
        message: 'No employee record linked to your user account.'
      });
    }

    const employeeId = req.user.employee._id || req.user.employee;
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Leave type, start date, end date, and reason are required.'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start or end date format.'
      });
    }

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be prior to start date.'
      });
    }

    // Calculate days difference (inclusive)
    const diffTime = Math.abs(end - start);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Check for conflicting approved or pending leave dates
    const conflictingLeave = await LeaveRequest.findOne({
      employee: employeeId,
      status: { $in: ['PENDING', 'APPROVED'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });

    if (conflictingLeave) {
      return res.status(400).json({
        success: false,
        message: `You already have an existing ${conflictingLeave.status.toLowerCase()} leave request covering these dates (${new Date(conflictingLeave.startDate).toLocaleDateString()} to ${new Date(conflictingLeave.endDate).toLocaleDateString()}).`
      });
    }

    // Fetch and verify leave balance
    const currentYear = start.getFullYear();
    let balanceRecord = await LeaveBalance.findOne({
      employee: employeeId,
      year: currentYear
    });

    if (!balanceRecord) {
      balanceRecord = await LeaveBalance.create({
        employee: employeeId,
        year: currentYear
      });
    }

    const categoryBalance = balanceRecord.balances[leaveType];
    if (categoryBalance) {
      const remainingDays = categoryBalance.total - categoryBalance.used;
      if (leaveType !== 'UNPAID' && totalDays > remainingDays) {
        return res.status(400).json({
          success: false,
          message: `Insufficient leave balance for ${leaveType}. Requested: ${totalDays} day(s), Available: ${remainingDays} day(s).`
        });
      }
    }

    const leaveRequest = await LeaveRequest.create({
      employee: employeeId,
      leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      reason: reason.trim(),
      status: 'PENDING'
    });

    // Notify Manager or HR Admins
    const empData = await Employee.findById(employeeId).populate('manager');
    if (empData && empData.manager && empData.manager.user) {
      await sendNotification({
        recipient: empData.manager.user,
        title: 'New Leave Request Received',
        message: `${empData.fullName} requested ${totalDays} day(s) of ${leaveType} leave.`,
        type: 'LEAVE',
        relatedLink: '/leave-management'
      });
    }

    await logActivity({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'APPLY_LEAVE',
      module: 'LEAVE',
      targetId: leaveRequest._id,
      details: { leaveType, totalDays, startDate: start, endDate: end },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: `Leave application submitted successfully for ${totalDays} day(s).`,
      leaveRequest
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current employee's personal leave requests
// @route   GET /api/leaves/my-requests
// @access  Private
const getMyLeaves = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(200).json({ success: true, count: 0, leaves: [] });
    }

    const employeeId = req.user.employee._id || req.user.employee;
    const leaves = await LeaveRequest.find({ employee: employeeId })
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: leaves.length,
      leaves,
      leaveRequests: leaves
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current employee's leave balance
// @route   GET /api/leaves/my-balances
// @access  Private
const getMyLeaveBalances = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(200).json({ success: true, balances: null, leaveBalance: null });
    }

    const employeeId = req.user.employee._id || req.user.employee;
    const currentYear = new Date().getFullYear();

    let balanceRecord = await LeaveBalance.findOne({
      employee: employeeId,
      year: currentYear
    });

    if (!balanceRecord) {
      balanceRecord = await LeaveBalance.create({
        employee: employeeId,
        year: currentYear
      });
    }

    res.status(200).json({
      success: true,
      balanceRecord,
      leaveBalance: balanceRecord,
      balances: balanceRecord ? balanceRecord.balances : null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get leave requests for approval (HR_ADMIN sees all, MANAGER sees team)
// @route   GET /api/leaves/management
// @access  Private (HR_ADMIN, MANAGER)
const getAllLeaveRequests = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (req.user.role === 'MANAGER') {
      const managerEmpId = req.user.employee?._id || req.user.employee;
      if (!managerEmpId) {
        return res.status(200).json({ success: true, count: 0, requests: [], leaveRequests: [] });
      }
      // Manager only sees direct reports
      const teamEmployees = await Employee.find({ manager: managerEmpId }).select('_id');
      const teamIds = teamEmployees.map((e) => e._id);
      query.employee = { $in: teamIds };
    } else if (req.user.role !== 'HR_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to review organization leave requests.'
      });
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await LeaveRequest.countDocuments(query);
    const requests = await LeaveRequest.find(query)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeCode email department designation manager',
        populate: [
          { path: 'department', select: 'name code' },
          { path: 'designation', select: 'title' }
        ]
      })
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: requests.length,
      total,
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      requests,
      leaveRequests: requests
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve or reject leave request
// @route   PATCH /api/leaves/:id/review
// @access  Private (HR_ADMIN, MANAGER)
const reviewLeaveRequest = async (req, res, next) => {
  try {
    const { status } = req.body;
    const remarks = req.body.remarks || req.body.reviewComment || '';

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Decision status must be either APPROVED or REJECTED.'
      });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id).populate('employee');
    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    if (leaveRequest.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `This leave request is already marked as ${leaveRequest.status} and cannot be modified again.`
      });
    }

    // Role verification: Manager can only review their assigned team
    if (req.user.role === 'MANAGER') {
      const empManagerId = (leaveRequest.employee?.manager?._id || leaveRequest.employee?.manager)?.toString();
      const userEmpId = (req.user.employee?._id || req.user.employee)?.toString();
      const isTeamMember = empManagerId && userEmpId && empManagerId === userEmpId;

      if (!isTeamMember) {
        return res.status(403).json({
          success: false,
          message: 'Managers can only approve or reject leave requests from their direct team.'
        });
      }
    }

    // If approving, deduct balance safely (prevent duplicate deduction)
    if (status === 'APPROVED') {
      const leaveYear = new Date(leaveRequest.startDate).getFullYear();
      let balanceRecord = await LeaveBalance.findOne({
        employee: leaveRequest.employee._id,
        year: leaveYear
      });

      if (!balanceRecord) {
        balanceRecord = await LeaveBalance.create({
          employee: leaveRequest.employee._id,
          year: leaveYear
        });
      }

      if (balanceRecord.balances[leaveRequest.leaveType]) {
        balanceRecord.balances[leaveRequest.leaveType].used += leaveRequest.totalDays;
        await balanceRecord.save();
      }
    }

    leaveRequest.status = status;
    leaveRequest.reviewedBy = req.user._id;
    leaveRequest.reviewedAt = new Date();
    leaveRequest.reviewRemarks = remarks || '';
    await leaveRequest.save();

    // Send notification to employee
    if (leaveRequest.employee && leaveRequest.employee.user) {
      await sendNotification({
        recipient: leaveRequest.employee.user,
        title: `Leave Request ${status}`,
        message: `Your ${leaveRequest.leaveType} leave request for ${leaveRequest.totalDays} day(s) has been ${status.toLowerCase()}.${remarks ? ` Remarks: ${remarks}` : ''}`,
        type: 'LEAVE',
        relatedLink: '/leave'
      });
    }

    await logActivity({
      actor: req.user._id,
      actorName: req.user.name,
      action: `LEAVE_${status}`,
      module: 'LEAVE',
      targetId: leaveRequest._id,
      details: { decision: status, remarks },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `Leave request ${status.toLowerCase()} successfully.`,
      leaveRequest
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel pending leave request by employee
// @route   PATCH /api/leaves/:id/cancel
// @access  Private
const cancelLeaveRequest = async (req, res, next) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    if (!req.user.employee || leaveRequest.employee.toString() !== req.user.employee._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own leave requests.'
      });
    }

    if (leaveRequest.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a request that has already been ${leaveRequest.status.toLowerCase()}.`
      });
    }

    leaveRequest.status = 'CANCELLED';
    await leaveRequest.save();

    await logActivity({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'CANCEL_LEAVE',
      module: 'LEAVE',
      targetId: leaveRequest._id,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Leave request cancelled successfully.',
      leaveRequest
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyLeave,
  getMyLeaves,
  getMyLeaveBalances,
  getAllLeaveRequests,
  reviewLeaveRequest,
  cancelLeaveRequest
};
