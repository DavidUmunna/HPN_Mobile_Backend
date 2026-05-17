const PrayerRequest = require('../models/PrayerRequest');
async function listPrayers({ category }) {
  const query = {};
  if (category) query.category = category;
  return PrayerRequest.find(query).sort({ createdAt: -1 }).lean();
}

async function createPrayer(payload) {
  const prayer = new PrayerRequest(payload);
  return prayer.save();
}

async function findPrayerById(id) {
  return PrayerRequest.findById(id).lean();
}

async function updatePrayer(id, update) {
  return PrayerRequest.findByIdAndUpdate(id, update, { new: true }).lean();
}

async function deletePrayer(id) {
  const deleted = await PrayerRequest.findByIdAndDelete(id).lean();
  if (!deleted) return null;
  return { deleted: true };
}

async function incrementPrayerComments(id, delta) {
  return PrayerRequest.findByIdAndUpdate(id, { $inc: { commentsCount: delta } }, { new: true }).lean();
}

module.exports = {
  listPrayers,
  createPrayer,
  findPrayerById,
  updatePrayer,
  deletePrayer,
  incrementPrayerComments,
};
