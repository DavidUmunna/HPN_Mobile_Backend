const {
  listNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  clearNotifications,
  createNotification,
} = require('../repositories/notificationRepository');
const { AppError } = require('../utils/errors');

function toNotificationResponse(notification) {
  return {
    id: notification._id.toString(),
    title: notification.title,
    body: notification.body,
    type: notification.type,
    read: notification.read,
    createdAt: notification.createdAt,
  };
}

async function getNotifications(userId) {
  const notifications = await listNotifications(userId);
  return notifications.map(toNotificationResponse);
}

async function markNotificationAsRead(userId, id) {
  const updated = await markRead(id, userId);
  if (!updated) throw new AppError('Notification not found', 404);
  return toNotificationResponse(updated);
}

async function markAllAsRead(userId) {
  return markAllRead(userId);
}

async function deleteOne(userId, id) {
  const deleted = await deleteNotification(id, userId);
  if (!deleted) throw new AppError('Notification not found', 404);
  return deleted;
}

async function clearAll(userId) {
  return clearNotifications(userId);
}

async function seedNotification(userId, payload) {
  const created = await createNotification({ userId, ...payload });
  return toNotificationResponse(created);
}

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllAsRead,
  deleteOne,
  clearAll,
  seedNotification,
};
