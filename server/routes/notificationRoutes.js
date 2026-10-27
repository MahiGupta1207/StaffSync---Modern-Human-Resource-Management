const express = require('express');
const router = express.Router();
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getMyNotifications);
router.patch('/read-all', markAllAsRead);   // ← must be BEFORE /:id/read
router.patch('/:id/read', markAsRead);

module.exports = router;
