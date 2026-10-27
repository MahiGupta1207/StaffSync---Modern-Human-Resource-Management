const mongoose = require('mongoose');

const designationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Designation title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters']
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required for designation']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Ensure title is unique within a department
designationSchema.index({ title: 1, department: 1 }, { unique: true });

module.exports = mongoose.model('Designation', designationSchema);
