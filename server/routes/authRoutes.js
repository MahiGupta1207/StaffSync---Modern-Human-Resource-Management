const express = require('express');
const router = express.Router();
const {
  login,
  register,
  getMe,
  changePassword,
  logout,
  getPublicDepartments
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { loginLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginLimiter, login);
router.post('/register', loginLimiter, register);
router.get('/departments', getPublicDepartments);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.post('/logout', protect, logout);

module.exports = router;
