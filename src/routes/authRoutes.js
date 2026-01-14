const express = require('express');
const {
  signupController,
  loginController,
  adminLoginController,
  logoutController,
  meController,
  forgotPasswordController,
  resetPasswordController,
  resetPasswordPageController,
} = require('../controllers/authController');
const { validate } = require('../middlewares/validate');
const {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('../validations/authValidation');
const { loginLimiter } = require('../middlewares/rateLimiter');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/signup', validate(signupSchema), signupController);
router.post('/login', loginLimiter, validate(loginSchema), loginController);
router.post('/admin/login', loginLimiter, validate(loginSchema), adminLoginController);
router.post('/logout', requireAuth, logoutController);
router.get('/me', requireAuth, meController);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPasswordController);
router.get('/reset-password', resetPasswordPageController);
router.post('/reset-password', validate(resetPasswordSchema), resetPasswordController);

module.exports = router;
