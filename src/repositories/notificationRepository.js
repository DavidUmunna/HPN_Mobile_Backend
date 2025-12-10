const Notification = require('../models/Notification');

async function listNotifications(userId) {
  return Notification.find({ userId }).sort({ createdAt: -1 }).lean();
}

async function createNotification(payload) {
  const notification = new Notification(payload);
  return notification.save();
}

async function markRead(id, userId) {
  return Notification.findOneAndUpdate({ _id: id, userId }, { read: true }, { new: true }).lean();
}

async function markAllRead(userId) {
  const result = await Notification.updateMany({ userId, read: false }, { read: true });
  return result.modifiedCount;
}

async function deleteNotification(id, userId) {
  const result = await Notification.deleteOne({ _id: id, userId });
  return result.deletedCount > 0;
}

async function clearNotifications(userId) {
  const result = await Notification.deleteMany({ userId });
  return result.deletedCount;
}

module.exports = {
  listNotifications,
  createNotification,
  markRead,
  markAllRead,
  deleteNotification,
  clearNotifications,
};
