const express = require('express');
const router = express.Router();
const {
  checkIn,
  checkOut,
  getMyTodayAttendance,
  getMyAttendanceHistory,
  getOrgAttendance,
  manualAttendance
} = require('../controllers/attendanceController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/today', getMyTodayAttendance);
router.get('/my-history', getMyAttendanceHistory);
router.get('/records', authorize('HR_ADMIN', 'MANAGER'), getOrgAttendance);
router.post('/manual', authorize('HR_ADMIN'), manualAttendance);

module.exports = router;
