const express = require('express');
const { signupController, loginController, logoutController, meController } = require('../controllers/authController');
const { validate } = require('../middlewares/validate');
const { signupSchema, loginSchema } = require('../validations/authValidation');
const { loginLimiter } = require('../middlewares/rateLimiter');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/signup', validate(signupSchema), signupController);
router.post('/login', loginLimiter, validate(loginSchema), loginController);
router.post('/logout', requireAuth, logoutController);
router.get('/me', requireAuth, meController);

module.exports = router;
