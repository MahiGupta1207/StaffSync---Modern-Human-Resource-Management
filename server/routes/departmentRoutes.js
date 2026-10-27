const express = require('express');
const router = express.Router();
const {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDesignations,
  createDesignation
} = require('../controllers/departmentController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.route('/')
  .get(getDepartments)
  .post(authorize('HR_ADMIN'), createDepartment);

router.route('/designations')
  .get(getDesignations)
  .post(authorize('HR_ADMIN'), createDesignation);

router.route('/:id')
  .put(authorize('HR_ADMIN'), updateDepartment)
  .delete(authorize('HR_ADMIN'), deleteDepartment);

module.exports = router;
