const express = require('express');
const { checkInController, latestAttendanceController } = require('../controllers/attendanceController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { checkInSchema } = require('../validations/attendanceValidation');

const router = express.Router();

router.post('/check-in', requireAuth, validate(checkInSchema), checkInController);
router.get('/latest', requireAuth, latestAttendanceController);

module.exports = router;
