const express = require('express');
const {
  signupController,
  loginController,
  logoutController,
  meController,
  changePasswordController,
  forgotPasswordController,
  resetPasswordController,
} = require('../controllers/authController');
const { validate } = require('../middlewares/validate');
const {
  signupSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validations/authValidation');
const { loginLimiter } = require('../middlewares/rateLimiter');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/signup', validate(signupSchema), signupController);
router.post('/login', loginLimiter, validate(loginSchema), loginController);
router.post('/logout', requireAuth, logoutController);
router.get('/me', requireAuth, meController);
router.post('/change-password', requireAuth, validate(changePasswordSchema), changePasswordController);
router.post('/forgot-password', loginLimiter, validate(forgotPasswordSchema), forgotPasswordController);
router.post('/reset-password', validate(resetPasswordSchema), resetPasswordController);

module.exports = router;
