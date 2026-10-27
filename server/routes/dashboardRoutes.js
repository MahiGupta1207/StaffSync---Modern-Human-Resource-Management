const express = require('express');
const router = express.Router();
const {
  getHRDashboard,
  getManagerDashboard,
  getEmployeeDashboard
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/hr', authorize('HR_ADMIN'), getHRDashboard);
router.get('/manager', authorize('MANAGER'), getManagerDashboard);
router.get('/employee', getEmployeeDashboard);

module.exports = router;
