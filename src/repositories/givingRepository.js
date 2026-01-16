const Giving = require('../models/Giving');

async function createGiving(data) {
  const donation = new Giving(data);
  return donation.save();
}

async function listByUser(userId, limit = 50) {
  return Giving.find({ user: userId }).sort({ createdAt: -1 }).limit(limit).lean();
}

async function updateGivingById(id, update) {
  return Giving.findByIdAndUpdate(id, update, { new: true });
}

module.exports = { createGiving, listByUser, updateGivingById };
