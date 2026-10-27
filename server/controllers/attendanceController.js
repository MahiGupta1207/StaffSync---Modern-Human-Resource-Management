const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const { formatDateYYYYMMDD, calculateMinutesDiff } = require('../utils/timeUtils');
const { logActivity } = require('../utils/logger');

// @desc    Employee Check-in
// @route   POST /api/attendance/check-in
// @access  Private
const checkIn = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(400).json({
        success: false,
        message: 'No employee record linked to your user account. Please contact HR.'
      });
    }

    const employeeId = req.user.employee._id || req.user.employee;
    const now = new Date();
    const todayStr = formatDateYYYYMMDD(now);
    const { workMode, notes } = req.body;

    // Guard 1: Duplicate check-in verification
    const existingAttendance = await Attendance.findOne({
      employee: employeeId,
      date: todayStr
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: `You have already checked in for today (${todayStr}) at ${existingAttendance.checkInTime.toLocaleTimeString()}.`
      });
    }

    // Determine status (Support WFH or Office check-in; Late threshold: after 9:30 AM local time)
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const isLate = hours > 9 || (hours === 9 && minutes > 30);
    let status;

    if (workMode === 'WORK_FROM_HOME' || workMode === 'WFH') {
      status = 'WORK_FROM_HOME';
    } else {
      status = isLate ? 'LATE' : 'PRESENT';
    }

    const defaultNote = status === 'WORK_FROM_HOME'
      ? 'Remote / Work From Home'
      : isLate ? 'Late arrival' : 'Standard check-in';

    const attendance = await Attendance.create({
      employee: employeeId,
      date: todayStr,
      checkInTime: now,
      status,
      notes: notes || defaultNote,
      ipAddress: req.ip
    });

    await logActivity({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'CHECK_IN',
      module: 'ATTENDANCE',
      targetId: attendance._id,
      details: { date: todayStr, status, workMode: status },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: `Checked in successfully as ${status} at ${now.toLocaleTimeString()}`,
      attendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Employee Check-out
// @route   POST /api/attendance/check-out
// @access  Private
const checkOut = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(400).json({
        success: false,
        message: 'No employee record linked to your user account.'
      });
    }

    const employeeId = req.user.employee._id || req.user.employee;
    const now = new Date();
    const todayStr = formatDateYYYYMMDD(now);

    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: todayStr
    });

    // Guard 1: Must check in before checking out
    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'No check-in record found for today. You must check in before checking out.'
      });
    }

    // Guard 2: Prevent duplicate check-out
    if (attendance.checkOutTime) {
      return res.status(400).json({
        success: false,
        message: `You have already checked out today at ${attendance.checkOutTime.toLocaleTimeString()}.`
      });
    }

    // Guard 3: Timestamp validation
    if (now < attendance.checkInTime) {
      return res.status(400).json({
        success: false,
        message: 'Check-out timestamp cannot precede check-in timestamp.'
      });
    }

    attendance.checkOutTime = now;
    attendance.workingMinutes = calculateMinutesDiff(attendance.checkInTime, now);

    // If worked less than 4 hours (240 mins), mark as HALF_DAY unless already LATE
    if (attendance.workingMinutes < 240 && attendance.status === 'PRESENT') {
      attendance.status = 'HALF_DAY';
    }

    await attendance.save();

    await logActivity({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'CHECK_OUT',
      module: 'ATTENDANCE',
      targetId: attendance._id,
      details: { date: todayStr, workingMinutes: attendance.workingMinutes },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `Checked out successfully. Total working duration: ${Math.floor(attendance.workingMinutes / 60)}h ${attendance.workingMinutes % 60}m.`,
      attendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current employee's attendance status for today
// @route   GET /api/attendance/today
// @access  Private
const getMyTodayAttendance = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(200).json({ success: true, attendance: null });
    }

    const employeeId = req.user.employee._id || req.user.employee;
    const todayStr = formatDateYYYYMMDD(new Date());

    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: todayStr
    });

    res.status(200).json({
      success: true,
      attendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current employee's personal attendance history
// @route   GET /api/attendance/my-history
// @access  Private
const getMyAttendanceHistory = async (req, res, next) => {
  try {
    if (!req.user.employee) {
      return res.status(200).json({ success: true, count: 0, history: [] });
    }

    const employeeId = req.user.employee._id || req.user.employee;
    const { startDate, endDate, month, year } = req.query;

    const query = { employee: employeeId };

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (month && year) {
      const monthPadded = String(month).padStart(2, '0');
      const start = `${year}-${monthPadded}-01`;
      const end = `${year}-${monthPadded}-31`;
      query.date = { $gte: start, $lte: end };
    }

    const history = await Attendance.find(query).sort({ date: -1 });

    // Summary calculations
    const presentCount = history.filter(h => h.status === 'PRESENT').length;
    const lateCount    = history.filter(h => h.status === 'LATE').length;
    const wfhCount     = history.filter(h => h.status === 'WORK_FROM_HOME').length;
    const halfDayCount = history.filter(h => h.status === 'HALF_DAY').length;
    const totalMinutes = history.reduce((acc, h) => acc + (h.workingMinutes || 0), 0);
    const totalHours   = (totalMinutes / 60).toFixed(1);
    const avgDailyHours = history.length > 0 ? (totalMinutes / (history.length * 60)).toFixed(1) : '0.0';

    res.status(200).json({
      success: true,
      count: history.length,
      history,
      records: history, // support both keys for frontend robustness
      summary: {
        totalDays: history.length,
        presentCount,
        lateCount,
        wfhCount,
        halfDayCount,
        totalHours,
        avgDailyHours
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get organization / team attendance
// @route   GET /api/attendance/records
// @access  Private (HR_ADMIN, MANAGER)
const getOrgAttendance = async (req, res, next) => {
  try {
    const { date, department, status, employeeId, page = 1, limit = 20 } = req.query;

    const query = {};

    if (date) {
      query.date = date;
    } else {
      query.date = formatDateYYYYMMDD(new Date());
    }

    if (status) {
      query.status = status;
    }

    // Role-based scoping
    if (req.user.role === 'MANAGER') {
      if (!req.user.employee) {
        return res.status(200).json({ success: true, count: 0, records: [] });
      }
      // Manager can only see attendance of their direct reports
      const teamEmployees = await Employee.find({ manager: req.user.employee._id }).select('_id');
      const teamIds = teamEmployees.map((e) => e._id);
      query.employee = { $in: teamIds };
    } else if (req.user.role !== 'HR_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view company attendance records.'
      });
    }

    if (employeeId) {
      query.employee = employeeId;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    let attendanceRecords = await Attendance.find(query)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeCode email department designation',
        populate: [
          { path: 'department', select: 'name code' },
          { path: 'designation', select: 'title' }
        ]
      })
      .sort({ checkInTime: -1 })
      .skip(skip)
      .limit(limitNum);

    // Apply department filter if provided
    if (department) {
      attendanceRecords = attendanceRecords.filter(
        (rec) => rec.employee?.department?._id?.toString() === department
      );
    }

    const total = await Attendance.countDocuments(query);

    // Compute organization-wide attendance overview stats for this date
    const statQuery = { date: query.date };
    if (query.employee) statQuery.employee = query.employee;

    const presentCount = await Attendance.countDocuments({ ...statQuery, status: 'PRESENT' });
    const lateCount    = await Attendance.countDocuments({ ...statQuery, status: 'LATE' });
    const wfhCount     = await Attendance.countDocuments({ ...statQuery, status: 'WORK_FROM_HOME' });
    const halfDayCount = await Attendance.countDocuments({ ...statQuery, status: 'HALF_DAY' });

    res.status(200).json({
      success: true,
      count: attendanceRecords.length,
      total,
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      records: attendanceRecords,
      stats: {
        total,
        present: presentCount,
        late: lateCount,
        wfh: wfhCount,
        halfDay: halfDayCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manual attendance regularization / mark by HR
// @route   POST /api/attendance/manual
// @access  Private (HR_ADMIN only)
const manualAttendance = async (req, res, next) => {
  try {
    const { employeeId, date, checkInTime, checkOutTime, status, notes } = req.body;

    if (!employeeId || !date || !checkInTime) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, date, and check-in time are required.'
      });
    }

    const checkInDate = new Date(`${date}T${checkInTime}:00`);
    if (isNaN(checkInDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid check-in time format.' });
    }

    let checkOutDate = null;
    let workingMinutes = 0;

    if (checkOutTime) {
      checkOutDate = new Date(`${date}T${checkOutTime}:00`);
      if (isNaN(checkOutDate.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid check-out time format.' });
      }
      if (checkOutDate < checkInDate) {
        return res.status(400).json({
          success: false,
          message: 'Check-out time cannot precede check-in time.'
        });
      }
      workingMinutes = calculateMinutesDiff(checkInDate, checkOutDate);
    }

    let attendance = await Attendance.findOne({ employee: employeeId, date });
    const assignedStatus = status || 'PRESENT';

    if (attendance) {
      attendance.checkInTime = checkInDate;
      attendance.checkOutTime = checkOutDate;
      attendance.workingMinutes = workingMinutes;
      attendance.status = assignedStatus;
      attendance.notes = notes || 'Manually adjusted by HR Admin';
      await attendance.save();
    } else {
      attendance = await Attendance.create({
        employee: employeeId,
        date,
        checkInTime: checkInDate,
        checkOutTime: checkOutDate,
        workingMinutes,
        status: assignedStatus,
        notes: notes || 'Manually recorded by HR Admin',
        ipAddress: req.ip
      });
    }

    await logActivity({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'MANUAL_ATTENDANCE_OVERRIDE',
      module: 'ATTENDANCE',
      targetId: attendance._id,
      details: { employeeId, date, status: attendance.status },
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Attendance record saved successfully.',
      attendance
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkIn,
  checkOut,
  getMyTodayAttendance,
  getMyAttendanceHistory,
  getOrgAttendance,
  manualAttendance
};
