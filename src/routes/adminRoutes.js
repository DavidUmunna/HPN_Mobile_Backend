const express = require('express');
const {
  listUsersController,
  attendanceSummaryController,
  listAttendanceRecordsController,
  getAttendanceRecordController,
  deleteAttendanceRecordController,
  exportAttendanceController,
  eventsSummaryController,
  updateUserEmailController,
  deleteUserController,
} = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { changeUserEmailSchema } = require('../validations/adminValidation');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/users', listUsersController);
router.get('/attendance/summary', attendanceSummaryController);
router.get('/attendance', listAttendanceRecordsController);
router.get('/attendance/export', exportAttendanceController);
router.get('/attendance/:id', getAttendanceRecordController);
router.delete('/attendance/:id', deleteAttendanceRecordController);
router.get('/events/summary', eventsSummaryController);
router.patch('/users/:id/email', validate(changeUserEmailSchema), updateUserEmailController);
router.delete('/users/:id', deleteUserController);

module.exports = router;
