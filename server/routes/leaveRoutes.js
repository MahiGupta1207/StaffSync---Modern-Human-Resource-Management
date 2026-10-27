const express = require('express');
const router = express.Router();
const {
  applyLeave,
  getMyLeaves,
  getMyLeaveBalances,
  getAllLeaveRequests,
  reviewLeaveRequest,
  cancelLeaveRequest
} = require('../controllers/leaveController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.post('/apply', applyLeave);
router.get('/my-requests', getMyLeaves);
router.get('/my-balances', getMyLeaveBalances);
router.get('/management', authorize('HR_ADMIN', 'MANAGER'), getAllLeaveRequests);
router.patch('/:id/review', authorize('HR_ADMIN', 'MANAGER'), reviewLeaveRequest);
router.patch('/:id/cancel', cancelLeaveRequest);

module.exports = router;
