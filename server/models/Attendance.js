const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required for attendance']
    },
    date: {
      type: String, // YYYY-MM-DD
      required: [true, 'Attendance date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD']
    },
    checkInTime: {
      type: Date,
      required: [true, 'Check-in timestamp is required']
    },
    checkOutTime: {
      type: Date,
      default: null
    },
    workingMinutes: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['PRESENT', 'LATE', 'HALF_DAY', 'WORK_FROM_HOME', 'ABSENT'],
      default: 'PRESENT'
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [250, 'Notes cannot exceed 250 characters']
    },
    ipAddress: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Prevent duplicate attendance records for the same employee on the same date
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
