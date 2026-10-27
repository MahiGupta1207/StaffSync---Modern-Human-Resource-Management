const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const TrainingEnrollment = require('../models/TrainingEnrollment');
const Department = require('../models/Department');

// @desc    Get aggregated HR reports
// @route   GET /api/reports/analytics
// @access  Private (HR_ADMIN, MANAGER)
const getReportAnalytics = async (req, res, next) => {
  try {
    let employeeScopeFilter = { employmentStatus: { $ne: 'TERMINATED' } };
    let attendanceScopeFilter = {};
    let leaveScopeFilter = {};

    if (req.user.role === 'MANAGER') {
      if (!req.user.employee) {
        return res.status(200).json({
          success: true,
          headcountByDept: [],
          attendanceSummary: [],
          leaveBreakdown: [],
          trainingStats: { enrolled: 0, completed: 0, inProgress: 0 }
        });
      }

      const team = await Employee.find({ manager: req.user.employee._id }).select('_id');
      const teamIds = team.map((t) => t._id);
      employeeScopeFilter = { _id: { $in: teamIds }, employmentStatus: { $ne: 'TERMINATED' } };
      attendanceScopeFilter = { employee: { $in: teamIds } };
      leaveScopeFilter = { employee: { $in: teamIds } };
    }

    // 1. Headcount by Department
    const headcountByDept = await Department.aggregate([
      { $match: { isActive: true } },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: 'department',
          as: 'employees'
        }
      },
      {
        $project: {
          name: 1,
          code: 1,
          count: {
            $size: {
              $filter: {
                input: '$employees',
                as: 'emp',
                cond: { $ne: ['$$emp.employmentStatus', 'TERMINATED'] }
              }
            }
          }
        }
      }
    ]);

    // 2. Attendance Status Breakdown
    const attendanceStats = await Attendance.aggregate([
      { $match: attendanceScopeFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgMinutes: { $avg: '$workingMinutes' }
        }
      }
    ]);

    // 3. Leave Requests by Status and Type
    const leaveStatusStats = await LeaveRequest.aggregate([
      { $match: leaveScopeFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalDays: { $sum: '$totalDays' }
        }
      }
    ]);

    const leaveTypeStats = await LeaveRequest.aggregate([
      { $match: leaveScopeFilter },
      {
        $group: {
          _id: '$leaveType',
          count: { $sum: 1 },
          totalDays: { $sum: '$totalDays' }
        }
      }
    ]);

    // 4. Training Statistics
    const trainingSummary = await TrainingEnrollment.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      headcountByDept,
      attendanceStats,
      leaveStatusStats,
      leaveTypeStats,
      trainingSummary
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReportAnalytics
};
