const express = require('express');
const router = express.Router();
const {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcementController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.route('/')
  .get(getAnnouncements)
  .post(authorize('HR_ADMIN'), createAnnouncement);

router.route('/:id')
  .put(authorize('HR_ADMIN'), updateAnnouncement)
  .delete(authorize('HR_ADMIN'), deleteAnnouncement);

module.exports = router;
