const mongoose = require('mongoose');
const PrayerComment = require('../models/PrayerComment');

async function listPrayerComments(prayerId, { limit = 20, offset = 0 } = {}) {
  return PrayerComment.find({ prayerId: new mongoose.Types.ObjectId(prayerId) })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .lean();
}

async function createPrayerComment(payload) {
  const comment = new PrayerComment(payload);
  return comment.save();
}

async function findPrayerCommentById(commentId) {
  return PrayerComment.findById(commentId).lean();
}

async function deletePrayerCommentById(commentId) {
  return PrayerComment.findByIdAndDelete(commentId).lean();
}

async function deleteCommentsByPrayerId(prayerId) {
  return PrayerComment.deleteMany({ prayerId });
}

module.exports = {
  listPrayerComments,
  createPrayerComment,
  findPrayerCommentById,
  deletePrayerCommentById,
  deleteCommentsByPrayerId,
};
