const express = require('express');
const router = express.Router();
const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  deleteEmployee
} = require('../controllers/employeeController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.route('/')
  .get(authorize('HR_ADMIN', 'MANAGER'), getEmployees)
  .post(authorize('HR_ADMIN'), createEmployee);

router.route('/:id')
  .get(getEmployeeById)
  .put(updateEmployee)
  .delete(authorize('HR_ADMIN'), deleteEmployee);

router.patch('/:id/status', authorize('HR_ADMIN'), toggleEmployeeStatus);

module.exports = router;
