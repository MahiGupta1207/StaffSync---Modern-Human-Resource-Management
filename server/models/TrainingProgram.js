const mongoose = require('mongoose');

const trainingProgramSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Training title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters']
    },
    description: {
      type: String,
      required: [true, 'Training description is required'],
      trim: true
    },
    trainer: {
      type: String,
      required: [true, 'Trainer name or organization is required'],
      trim: true
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    capacity: {
      type: Number,
      default: 30,
      min: [1, 'Capacity must be at least 1']
    },
    status: {
      type: String,
      enum: ['UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'UPCOMING'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required']
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('TrainingProgram', trainingProgramSchema);
