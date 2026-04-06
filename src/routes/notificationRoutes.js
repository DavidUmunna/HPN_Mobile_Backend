const express = require('express');
const {
  listNotificationsController,
  markReadController,
  markAllReadController,
  deleteNotificationController,
  clearNotificationsController,
  seedNotificationController,
  registerPushTokenController,
  unregisterPushTokenController,
} = require('../controllers/notificationController');
const { requireAuth, requireAdmin } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const {
  seedNotificationSchema,
  registerPushTokenSchema,
  unregisterPushTokenSchema,
} = require('../validations/notificationValidation');

const router = express.Router();

router.get('/', requireAuth, listNotificationsController);
router.post('/:id/read', requireAuth, markReadController);
router.post('/mark-all-read', requireAuth, markAllReadController);
router.post('/read-all', requireAuth, markAllReadController);
router.post('/push-tokens', requireAuth, validate(registerPushTokenSchema), registerPushTokenController);
router.delete('/push-tokens', requireAuth, validate(unregisterPushTokenSchema), unregisterPushTokenController);
router.delete('/:id', requireAuth, requireAdmin, deleteNotificationController);
router.delete('/', requireAuth, requireAdmin, clearNotificationsController);
router.post('/', requireAuth, validate(seedNotificationSchema), seedNotificationController);

module.exports = router;
