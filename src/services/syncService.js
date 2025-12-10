const { upsertSyncItem, findAllByUser, findByUserAndKeys } = require('../repositories/syncRepository');
const { AppError } = require('../utils/errors');

function parseDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new AppError('Invalid date format in sync payload', 400);
  return d;
}

async function syncData({ userId, items }) {
  if (!Array.isArray(items)) throw new AppError('items must be an array', 400);

  const keys = items.map((i) => i.key).filter(Boolean);
  const existing = await findByUserAndKeys(userId, keys);
  const existingMap = new Map(existing.map((i) => [i.key, i]));

  const applied = [];
  const conflicts = [];

  for (const item of items) {
    if (!item.key) throw new AppError('Each item requires a key', 400);
    const current = existingMap.get(item.key);
    const deviceUpdatedAt = parseDate(item.deviceUpdatedAt);
    const clientServerUpdatedAt = item.serverUpdatedAt ? parseDate(item.serverUpdatedAt) : null;
    const now = new Date();

    if (current) {
      const serverIsNewer = current.serverUpdatedAt > deviceUpdatedAt;
      const deviceIsNewer = deviceUpdatedAt > current.serverUpdatedAt;
      const serverChangedSinceClient = clientServerUpdatedAt && current.serverUpdatedAt > clientServerUpdatedAt;

      if (deviceIsNewer && !serverChangedSinceClient) {
        const updated = await upsertSyncItem(userId, {
          key: item.key,
          data: item.data || {},
          deviceUpdatedAt,
          serverUpdatedAt: now,
          conflict: false,
        });
        applied.push(updated);
      } else if (serverIsNewer && serverChangedSinceClient) {
        conflicts.push({ key: item.key, server: current, device: item, reason: 'server-has-newer-version' });
        await upsertSyncItem(userId, {
          key: item.key,
          data: current.data,
          deviceUpdatedAt: current.deviceUpdatedAt,
          serverUpdatedAt: current.serverUpdatedAt,
          conflict: true,
          conflictReason: 'server-has-newer-version',
        });
      } else if (deviceIsNewer && serverChangedSinceClient) {
        conflicts.push({ key: item.key, server: current, device: item, reason: 'conflicting-updates' });
        await upsertSyncItem(userId, {
          key: item.key,
          data: current.data,
          deviceUpdatedAt: current.deviceUpdatedAt,
          serverUpdatedAt: current.serverUpdatedAt,
          conflict: true,
          conflictReason: 'conflicting-updates',
        });
      } else {
        conflicts.push({ key: item.key, server: current, device: item, reason: 'server-authoritative' });
      }
    } else {
      const created = await upsertSyncItem(userId, {
        key: item.key,
        data: item.data || {},
        deviceUpdatedAt,
        serverUpdatedAt: now,
        conflict: false,
      });
      applied.push(created);
    }
  }

  const serverSnapshot = await findAllByUser(userId);
  return { applied, conflicts, serverSnapshot };
}

module.exports = { syncData };
