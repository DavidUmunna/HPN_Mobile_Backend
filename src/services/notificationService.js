const {
  listNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  clearNotifications,
  createNotification,
  createNotifications,
} = require('../repositories/notificationRepository');
const { AppError } = require('../utils/errors');
const { sendPushToUser, sendPushToUsers } = require('./pushNotificationService');
const { listUserIds } = require('../repositories/userRepository');
const { logger } = require('../utils/logger');

const BROADCAST_BATCH_SIZE = 500;

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
  try {
    await sendPushToUser(userId, {
      title: created.title,
      body: created.body,
      data: { notificationId: created._id.toString(), type: created.type },
    });
  } catch (err) {
    logger.error('Push send failed for notification', { err: err.message });
  }
  return toNotificationResponse(created);
}

async function broadcastNotification(userId, payload) {
  const users = await listUserIds();
  const userIds = users.map((user) => user._id.toString());
  const created = await createNotification({ userId, ...payload });
  const basePayload = {
    title: created.title,
    body: created.body,
    type: created.type,
  };

  const otherUserIds = userIds.filter((id) => id !== created.userId.toString());
  for (let i = 0; i < otherUserIds.length; i += BROADCAST_BATCH_SIZE) {
    const batch = otherUserIds.slice(i, i + BROADCAST_BATCH_SIZE);
    await createNotifications(
      batch.map((id) => ({
        userId: id,
        ...basePayload,
      }))
    );
  }

  let pushResult = { delivered: 0, failed: 0 };
  try {
    pushResult = await sendPushToUsers(userIds, {
      title: basePayload.title,
      body: basePayload.body,
      data: { type: basePayload.type, broadcast: 'true' },
    });
  } catch (err) {
    logger.error('Push send failed for broadcast', { err: err.message });
  }

  return {
    notification: toNotificationResponse(created),
    summary: {
      recipients: userIds.length,
      delivered: pushResult.delivered,
      failed: pushResult.failed,
    },
  };
}

module.exports = {
  getNotifications,
  markNotificationAsRead,
  markAllAsRead,
  deleteOne,
  clearAll,
  seedNotification,
  broadcastNotification,
};
