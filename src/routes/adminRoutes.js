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
  updateUserRoleController,
  deleteUserController,
  deleteEventController,
} = require('../controllers/adminController');
const { updateSupportDirectoryController } = require('../controllers/supportController');
const { requireAuth, requireAdmin } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const {
  changeUserEmailSchema,
  changeUserRoleSchema,
  updateSupportDirectorySchema,
} = require('../validations/adminValidation');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/users', listUsersController);
router.get('/attendance/summary', attendanceSummaryController);
router.get('/attendance', listAttendanceRecordsController);
router.get('/attendance/export', exportAttendanceController);
router.get('/attendance/:id', getAttendanceRecordController);
router.delete('/attendance/:id', deleteAttendanceRecordController);
router.get('/events/summary', eventsSummaryController);
router.delete('/events/:id', deleteEventController);
router.patch('/users/:id/email', validate(changeUserEmailSchema), updateUserEmailController);
router.patch('/users/:id/role', validate(changeUserRoleSchema), updateUserRoleController);
router.delete('/users/:id', deleteUserController);
router.put('/support-contacts', validate(updateSupportDirectorySchema), updateSupportDirectoryController);

module.exports = router;
