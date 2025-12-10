const mongoose = require('mongoose');
const { listPrayers, createPrayer, findPrayerById, updatePrayer } = require('../repositories/prayerRepository');
const { AppError } = require('../utils/errors');

function toPrayerResponse(prayer, userId) {
  const prayedBy = prayer.prayedBy || [];
  const isPraying = userId ? prayedBy.some((id) => id.toString() === userId.toString()) : false;
  return {
    id: prayer._id.toString(),
    authorName: prayer.authorName,
    request: prayer.request,
    category: prayer.category,
    prayersCount: prayedBy.length,
    commentsCount: prayer.commentsCount || 0,
    isPraying,
    createdAt: prayer.createdAt,
  };
}

async function getPrayers({ userId, category }) {
  const items = await listPrayers({ category });
  return items.map((item) => toPrayerResponse(item, userId));
}

async function addPrayer({ userId, request, category, authorName }) {
  const prayer = await createPrayer({
    userId,
    request,
    category: category || 'General',
    authorName,
    prayedBy: [],
  });
  return toPrayerResponse(prayer, userId);
}

async function togglePray({ prayerId, userId }) {
  const prayer = await findPrayerById(prayerId);
  if (!prayer) throw new AppError('Prayer request not found', 404);

  const prayedBy = (prayer.prayedBy || []).map((id) => id.toString());
  const alreadyPraying = prayedBy.includes(userId.toString());
  let status = 'praying';
  let updatedList;

  if (alreadyPraying) {
    status = 'not-praying';
    updatedList = prayedBy.filter((id) => id !== userId.toString());
  } else {
    updatedList = [...prayedBy, userId.toString()];
  }

  const updated = await updatePrayer(prayerId, {
    prayedBy: updatedList.map((id) => new mongoose.Types.ObjectId(id)),
  });

  return { prayer: toPrayerResponse(updated, userId), status };
}

module.exports = { getPrayers, addPrayer, togglePray };
