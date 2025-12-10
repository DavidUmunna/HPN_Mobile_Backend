const SyncItem = require('../models/SyncItem');

async function findAllByUser(userId) {
  return SyncItem.find({ userId }).lean();
}

async function findByUserAndKeys(userId, keys = []) {
  if (!keys.length) return [];
  return SyncItem.find({ userId, key: { $in: keys } }).lean();
}

async function upsertSyncItem(userId, payload) {
  const { key, data, deviceUpdatedAt, serverUpdatedAt, conflict, conflictReason } = payload;
  return SyncItem.findOneAndUpdate(
    { userId, key },
    {
      userId,
      key,
      data,
      deviceUpdatedAt,
      serverUpdatedAt,
      conflict: Boolean(conflict),
      conflictReason: conflictReason || null,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
}

module.exports = { findAllByUser, findByUserAndKeys, upsertSyncItem };
