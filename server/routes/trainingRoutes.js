const express = require('express');
const router = express.Router();
const {
  getTrainingPrograms,
  createTrainingProgram,
  enrollEmployees,
  getProgramEnrollments,
  updateTrainingProgress
} = require('../controllers/trainingController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.route('/')
  .get(getTrainingPrograms)
  .post(authorize('HR_ADMIN', 'MANAGER'), createTrainingProgram);

router.post('/:id/enroll', authorize('HR_ADMIN', 'MANAGER'), enrollEmployees);
router.get('/:id/enrollments', authorize('HR_ADMIN', 'MANAGER'), getProgramEnrollments);
router.patch('/progress/:enrollmentId', updateTrainingProgress);

module.exports = router;
