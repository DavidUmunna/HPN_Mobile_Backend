const express = require('express');
const {
  listNotificationsController,
  markReadController,
  markAllReadController,
  deleteNotificationController,
  clearNotificationsController,
  seedNotificationController,
} = require('../controllers/notificationController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { seedNotificationSchema } = require('../validations/notificationValidation');

const router = express.Router();

router.get('/', requireAuth, listNotificationsController);
router.post('/:id/read', requireAuth, markReadController);
router.post('/read-all', requireAuth, markAllReadController);
router.delete('/:id', requireAuth, deleteNotificationController);
router.delete('/', requireAuth, clearNotificationsController);
router.post('/', requireAuth, validate(seedNotificationSchema), seedNotificationController);

module.exports = router;
