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

module.exports = { listPrayers, createPrayer, findPrayerById, updatePrayer };
