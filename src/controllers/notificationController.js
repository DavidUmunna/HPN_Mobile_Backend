const {
  getNotifications,
  markNotificationAsRead,
  markAllAsRead,
  deleteOne,
  clearAll,
  seedNotification,
} = require('../services/notificationService');
const { registerPushToken, unregisterPushToken } = require('../services/pushTokenService');

async function listNotificationsController(req, res, next) {
  try {
    const notifications = await getNotifications(req.session.userId);
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
}

async function markReadController(req, res, next) {
  try {
    const notification = await markNotificationAsRead(req.session.userId, req.params.id);
    res.json({ notification });
  } catch (err) {
    next(err);
  }
}

async function markAllReadController(req, res, next) {
  try {
    const updated = await markAllAsRead(req.session.userId);
    res.json({ updated });
  } catch (err) {
    next(err);
  }
}

async function deleteNotificationController(req, res, next) {
  try {
    const deleted = await deleteOne(req.session.userId, req.params.id);
    res.json({ deleted });
  } catch (err) {
    next(err);
  }
}

async function clearNotificationsController(req, res, next) {
  try {
    const deleted = await clearAll(req.session.userId);
    res.json({ deleted });
  } catch (err) {
    next(err);
  }
}

async function seedNotificationController(req, res, next) {
  try {
    const notification = await seedNotification(req.session.userId, req.body);
    res.status(201).json({ notification });
  } catch (err) {
    next(err);
  }
}

async function registerPushTokenController(req, res, next) {
  try {
    const pushToken = await registerPushToken(req.session.userId, req.body);
    res.status(201).json({ pushToken });
  } catch (err) {
    next(err);
  }
}

async function unregisterPushTokenController(req, res, next) {
  try {
    const pushToken = await unregisterPushToken(req.session.userId, req.body.token);
    res.json({ pushToken });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listNotificationsController,
  markReadController,
  markAllReadController,
  deleteNotificationController,
  clearNotificationsController,
  seedNotificationController,
  registerPushTokenController,
  unregisterPushTokenController,
};
