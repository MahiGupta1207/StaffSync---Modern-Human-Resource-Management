const mongoose = require('mongoose');

const trainingEnrollmentSchema = new mongoose.Schema(
  {
    program: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TrainingProgram',
      required: [true, 'Training program reference is required']
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required']
    },
    progressPercentage: {
      type: Number,
      default: 0,
      min: [0, 'Progress cannot be negative'],
      max: [100, 'Progress cannot exceed 100%']
    },
    status: {
      type: String,
      enum: ['ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED'],
      default: 'ENROLLED'
    },
    completionDate: {
      type: Date,
      default: null
    },
    feedback: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

trainingEnrollmentSchema.index({ program: 1, employee: 1 }, { unique: true });

module.exports = mongoose.model('TrainingEnrollment', trainingEnrollmentSchema);
