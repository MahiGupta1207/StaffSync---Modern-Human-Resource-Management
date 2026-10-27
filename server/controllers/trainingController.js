const TrainingProgram = require('../models/TrainingProgram');
const TrainingEnrollment = require('../models/TrainingEnrollment');
const Employee = require('../models/Employee');
const { logActivity, sendNotification } = require('../utils/logger');

// @desc    Get training programs
// @route   GET /api/training
// @access  Private
const getTrainingPrograms = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;

    let programs = [];

    if (req.user.role === 'EMPLOYEE') {
      if (!req.user.employee) {
        return res.status(200).json({ success: true, count: 0, programs: [] });
      }

      // Find enrollments for this employee
      const enrollments = await TrainingEnrollment.find({
        employee: req.user.employee._id
      }).populate({
        path: 'program',
        populate: [
          { path: 'department', select: 'name code' },
          { path: 'createdBy', select: 'name' }
        ]
      });

      programs = enrollments.map((enr) => ({
        ...enr.program.toObject(),
        myEnrollment: {
          _id: enr._id,
          progressPercentage: enr.progressPercentage,
          status: enr.status,
          completionDate: enr.completionDate
        }
      }));
    } else {
      // HR_ADMIN and MANAGER
      const rawPrograms = await TrainingProgram.find(query)
        .populate('department', 'name code')
        .populate('createdBy', 'name')
        .sort({ startDate: -1 })
        .lean();

      programs = await Promise.all(
        rawPrograms.map(async (prog) => {
          const enrolledCount = await TrainingEnrollment.countDocuments({ program: prog._id });
          const completedCount = await TrainingEnrollment.countDocuments({
            program: prog._id,
            status: 'COMPLETED'
          });
          return {
            ...prog,
            enrolledCount,
            completedCount
          };
        })
      );
    }

    res.status(200).json({
      success: true,
      count: programs.length,
      programs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a training program
// @route   POST /api/training
// @access  Private (HR_ADMIN, MANAGER)
const createTrainingProgram = async (req, res, next) => {
  try {
    const { title, description, trainer, department, startDate, endDate, capacity } = req.body;

    if (!title || !description || !trainer || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, trainer, start date, and end date are required.'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be prior to start date.'
      });
    }

    const program = await TrainingProgram.create({
      title: title.trim(),
      description: description.trim(),
      trainer: trainer.trim(),
      department: department || null,
      startDate: start,
      endDate: end,
      capacity: capacity || 30,
      createdBy: req.user._id
    });

    await logActivity({
      actor: req.user._id,
      actorName: req.user.name,
      action: 'CREATE_TRAINING_PROGRAM',
      module: 'TRAINING',
      targetId: program._id,
      details: { title: program.title, trainer: program.trainer },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Training program created successfully.',
      program
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Enroll employee(s) into training program
// @route   POST /api/training/:id/enroll
// @access  Private (HR_ADMIN, MANAGER)
const enrollEmployees = async (req, res, next) => {
  try {
    const { employeeIds } = req.body;
    const programId = req.params.id;

    const program = await TrainingProgram.findById(programId);
    if (!program) {
      return res.status(404).json({ success: false, message: 'Training program not found.' });
    }

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide employee IDs to enroll.' });
    }

    let enrolledCount = 0;
    for (const empId of employeeIds) {
      const existing = await TrainingEnrollment.findOne({ program: programId, employee: empId });
      if (!existing) {
        await TrainingEnrollment.create({
          program: programId,
          employee: empId,
          progressPercentage: 0,
          status: 'ENROLLED'
        });
        enrolledCount++;

        // Notify employee
        const emp = await Employee.findById(empId);
        if (emp && emp.user) {
          await sendNotification({
            recipient: emp.user,
            title: 'Assigned to New Training Program',
            message: `You have been enrolled in "${program.title}" by HR management.`,
            type: 'TRAINING',
            relatedLink: '/training'
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Enrolled ${enrolledCount} new participant(s) successfully.`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get enrollments for a training program
// @route   GET /api/training/:id/enrollments
// @access  Private (HR_ADMIN, MANAGER)
const getProgramEnrollments = async (req, res, next) => {
  try {
    const enrollments = await TrainingEnrollment.find({ program: req.params.id })
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeCode email department designation',
        populate: [
          { path: 'department', select: 'name code' },
          { path: 'designation', select: 'title' }
        ]
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: enrollments.length,
      enrollments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update employee personal training progress
// @route   PATCH /api/training/progress/:enrollmentId
// @access  Private
const updateTrainingProgress = async (req, res, next) => {
  try {
    const { progressPercentage, feedback } = req.body;
    const enrollment = await TrainingEnrollment.findById(req.params.enrollmentId).populate('employee');

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Training enrollment not found.' });
    }

    // Role check: Only the enrolled employee or HR_ADMIN can update progress
    if (req.user.role === 'EMPLOYEE') {
      if (!req.user.employee || enrollment.employee._id.toString() !== req.user.employee._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own training progress.'
        });
      }
    }

    const pct = parseInt(progressPercentage, 10);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return res.status(400).json({
        success: false,
        message: 'Progress percentage must be an integer between 0 and 100.'
      });
    }

    enrollment.progressPercentage = pct;
    if (feedback !== undefined) enrollment.feedback = feedback;

    if (pct === 100) {
      enrollment.status = 'COMPLETED';
      enrollment.completionDate = new Date();
    } else if (pct > 0) {
      enrollment.status = 'IN_PROGRESS';
    } else {
      enrollment.status = 'ENROLLED';
    }

    await enrollment.save();

    res.status(200).json({
      success: true,
      message: `Training progress updated to ${pct}%.`,
      enrollment
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTrainingPrograms,
  createTrainingProgram,
  enrollEmployees,
  getProgramEnrollments,
  updateTrainingProgress
};
