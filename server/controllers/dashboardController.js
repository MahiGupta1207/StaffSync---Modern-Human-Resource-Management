const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const Department = require('../models/Department');
const Announcement = require('../models/Announcement');
const TrainingProgram = require('../models/TrainingProgram');
const TrainingEnrollment = require('../models/TrainingEnrollment');
const ActivityLog = require('../models/ActivityLog');
const { formatDateYYYYMMDD } = require('../utils/timeUtils');

// @desc    Get HR Administrator Dashboard metrics (Real Database calculations)
// @route   GET /api/dashboard/hr
// @access  Private (HR_ADMIN only)
const getHRDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    const todayStr = formatDateYYYYMMDD(today);
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));

    // 1. KPI Stats
    const totalWorkforce = await Employee.countDocuments({
      employmentStatus: { $ne: 'TERMINATED' }
    });

    const presentToday = await Attendance.countDocuments({
      date: todayStr,
      status: { $in: ['PRESENT', 'LATE', 'HALF_DAY', 'WORK_FROM_HOME'] }
    });

    const onLeaveToday = await LeaveRequest.countDocuments({
      status: 'APPROVED',
      startDate: { $lte: endOfToday },
      endDate: { $gte: startOfToday }
    });

    const pendingLeaves = await LeaveRequest.countDocuments({
      status: 'PENDING'
    });

    // 2. Department-wise employee distribution
    const departmentDistribution = await Department.aggregate([
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
          employeeCount: {
            $size: {
              $filter: {
                input: '$employees',
                as: 'emp',
                cond: { $ne: ['$$emp.employmentStatus', 'TERMINATED'] }
              }
            }
          }
        }
      },
      { $sort: { employeeCount: -1 } }
    ]);

    // 3. Past 7 days attendance trends
    const attendanceTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = formatDateYYYYMMDD(d);

      const presentCount = await Attendance.countDocuments({
        date: dStr,
        status: { $in: ['PRESENT', 'WORK_FROM_HOME'] }
      });
      const lateCount = await Attendance.countDocuments({
        date: dStr,
        status: 'LATE'
      });

      attendanceTrend.push({
        date: dStr.substring(5), // MM-DD
        present: presentCount,
        late: lateCount,
        total: presentCount + lateCount
      });
    }

    // 4. Recent activities
    const recentActivities = await ActivityLog.find()
      .sort({ createdAt: -1 })
      .limit(6);

    // 5. Recent pending leave approvals
    const pendingLeaveApprovals = await LeaveRequest.find({ status: 'PENDING' })
      .populate('employee', 'firstName lastName employeeCode department')
      .sort({ createdAt: -1 })
      .limit(5);

    // 6. Latest published announcements
    const latestAnnouncements = await Announcement.find({ status: 'PUBLISHED' })
      .populate('author', 'name')
      .sort({ publishedAt: -1 })
      .limit(3);

    // 7. Upcoming birthdays this month
    const currentMonth = new Date().getMonth() + 1;
    const upcomingBirthdays = await Employee.aggregate([
      {
        $match: {
          employmentStatus: { $ne: 'TERMINATED' },
          dateOfBirth: { $ne: null }
        }
      },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          employeeCode: 1,
          dateOfBirth: 1,
          birthMonth: { $month: '$dateOfBirth' },
          birthDay: { $dayOfMonth: '$dateOfBirth' }
        }
      },
      {
        $match: {
          birthMonth: currentMonth
        }
      },
      { $sort: { birthDay: 1 } },
      { $limit: 4 }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalWorkforce,
        presentToday,
        onLeaveToday,
        pendingLeaves
      },
      departmentDistribution,
      attendanceTrend,
      recentActivities,
      pendingLeaveApprovals,
      latestAnnouncements,
      upcomingBirthdays
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Manager Dashboard metrics (Scoped to manager's direct team)
// @route   GET /api/dashboard/manager
// @access  Private (MANAGER only)
const getManagerDashboard = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(200).json({
        success: true,
        stats: { teamSize: 0, presentToday: 0, onLeaveToday: 0, pendingLeaves: 0 },
        teamAttendanceTrend: [],
        teamMembers: [],
        pendingTeamLeaves: [],
        teamTrainings: []
      });
    }

    const managerEmployeeId = req.user.employee._id;
    const today = new Date();
    const todayStr = formatDateYYYYMMDD(today);
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));

    // Get team members
    const teamMembers = await Employee.find({
      manager: managerEmployeeId,
      employmentStatus: { $ne: 'TERMINATED' }
    })
      .populate('department', 'name')
      .populate('designation', 'title');

    const teamIds = teamMembers.map((m) => m._id);

    // Stats
    const teamSize = teamMembers.length;

    const presentToday = await Attendance.countDocuments({
      employee: { $in: teamIds },
      date: todayStr,
      status: { $in: ['PRESENT', 'LATE', 'HALF_DAY', 'WORK_FROM_HOME'] }
    });

    const onLeaveToday = await LeaveRequest.countDocuments({
      employee: { $in: teamIds },
      status: 'APPROVED',
      startDate: { $lte: endOfToday },
      endDate: { $gte: startOfToday }
    });

    const pendingLeaves = await LeaveRequest.countDocuments({
      employee: { $in: teamIds },
      status: 'PENDING'
    });

    // 7 days attendance trend for team
    const teamAttendanceTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = formatDateYYYYMMDD(d);

      const presentCount = await Attendance.countDocuments({
        employee: { $in: teamIds },
        date: dStr,
        status: { $in: ['PRESENT', 'WORK_FROM_HOME'] }
      });
      const lateCount = await Attendance.countDocuments({
        employee: { $in: teamIds },
        date: dStr,
        status: 'LATE'
      });

      teamAttendanceTrend.push({
        date: dStr.substring(5),
        present: presentCount,
        late: lateCount
      });
    }

    // Pending team leave requests
    const pendingTeamLeaves = await LeaveRequest.find({
      employee: { $in: teamIds },
      status: 'PENDING'
    })
      .populate('employee', 'firstName lastName employeeCode')
      .sort({ createdAt: -1 });

    // Team training enrollments
    const teamEnrollments = await TrainingEnrollment.find({
      employee: { $in: teamIds }
    })
      .populate('program', 'title startDate endDate status')
      .populate('employee', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5);

    // Latest published announcements for managers
    const announcements = await Announcement.find({
      status: 'PUBLISHED',
      targetAudience: { $in: ['ALL', 'MANAGERS'] }
    })
      .populate('author', 'name')
      .sort({ publishedAt: -1 })
      .limit(3);

    res.status(200).json({
      success: true,
      stats: {
        teamSize,
        presentToday,
        onLeaveToday,
        pendingLeaves
      },
      teamMembers,
      teamAttendanceTrend,
      pendingTeamLeaves,
      teamEnrollments,
      announcements
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Employee Dashboard metrics (Personal workspace)
// @route   GET /api/dashboard/employee
// @access  Private (EMPLOYEE, or any logged in user with employee record)
const getEmployeeDashboard = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(200).json({
        success: true,
        message: 'No employee record linked yet.',
        todayAttendance: null,
        leaveBalance: null,
        recentLeaves: [],
        assignedTraining: [],
        announcements: []
      });
    }

    const employeeId = req.user.employee._id || req.user.employee;
    const todayStr = formatDateYYYYMMDD(new Date());

    // 1. Today's attendance
    const todayAttendance = await Attendance.findOne({
      employee: employeeId,
      date: todayStr
    });

    // 2. Leave balance
    const currentYear = new Date().getFullYear();
    let leaveBalance = await LeaveBalance.findOne({
      employee: employeeId,
      year: currentYear
    });

    if (!leaveBalance) {
      leaveBalance = await LeaveBalance.create({
        employee: employeeId,
        year: currentYear
      });
    }

    // 3. Recent leaves
    const recentLeaves = await LeaveRequest.find({ employee: employeeId })
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(4);

    // 4. Assigned training programs
    const trainingEnrollments = await TrainingEnrollment.find({
      employee: employeeId
    })
      .populate('program', 'title trainer startDate endDate status')
      .sort({ createdAt: -1 })
      .limit(4);

    // 5. Recent published announcements for this employee
    const audienceConditions = [{ targetAudience: 'ALL' }];
    if (req.user.employee.department) {
      audienceConditions.push({
        targetAudience: 'DEPARTMENT',
        targetDepartment: req.user.employee.department
      });
    }

    const announcements = await Announcement.find({
      status: 'PUBLISHED',
      $or: audienceConditions
    })
      .populate('author', 'name')
      .sort({ publishedAt: -1 })
      .limit(3);

    res.status(200).json({
      success: true,
      todayAttendance,
      leaveBalance,
      recentLeaves,
      trainingEnrollments,
      announcements
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHRDashboard,
  getManagerDashboard,
  getEmployeeDashboard
};
