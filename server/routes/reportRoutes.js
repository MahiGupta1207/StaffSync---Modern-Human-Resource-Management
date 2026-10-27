const express = require('express');
const router = express.Router();
const { getReportAnalytics } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/analytics', authorize('HR_ADMIN', 'MANAGER'), getReportAnalytics);

module.exports = router;
