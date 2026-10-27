const express = require('express');
const router = express.Router();
const {
  getPayrollRecords,
  createPayrollRecord,
  updatePayrollStatus
} = require('../controllers/payrollController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.route('/')
  .get(getPayrollRecords)
  .post(authorize('HR_ADMIN'), createPayrollRecord);

router.patch('/:id/status', authorize('HR_ADMIN'), updatePayrollStatus);

module.exports = router;
