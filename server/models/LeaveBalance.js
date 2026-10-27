const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required']
    },
    year: {
      type: Number,
      required: [true, 'Calendar year is required'],
      default: () => new Date().getFullYear()
    },
    balances: {
      ANNUAL: {
        total: { type: Number, default: 18 },
        used: { type: Number, default: 0 }
      },
      SICK: {
        total: { type: Number, default: 12 },
        used: { type: Number, default: 0 }
      },
      CASUAL: {
        total: { type: Number, default: 10 },
        used: { type: Number, default: 0 }
      },
      MATERNITY: {
        total: { type: Number, default: 90 },
        used: { type: Number, default: 0 }
      },
      PATERNITY: {
        total: { type: Number, default: 15 },
        used: { type: Number, default: 0 }
      },
      UNPAID: {
        total: { type: Number, default: 30 },
        used: { type: Number, default: 0 }
      }
    }
  },
  {
    timestamps: true
  }
);

leaveBalanceSchema.index({ employee: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);
