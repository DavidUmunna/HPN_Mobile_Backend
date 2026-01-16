const express = require('express');
const {
  listUsersController,
  attendanceSummaryController,
  eventsSummaryController,
  updateUserEmailController,
} = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { changeUserEmailSchema } = require('../validations/adminValidation');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/users', listUsersController);
router.get('/attendance/summary', attendanceSummaryController);
router.get('/events/summary', eventsSummaryController);
router.patch('/users/:id/email', validate(changeUserEmailSchema), updateUserEmailController);

module.exports = router;
