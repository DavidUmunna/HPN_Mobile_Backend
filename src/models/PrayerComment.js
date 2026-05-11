const mongoose = require('mongoose');

const prayerCommentSchema = new mongoose.Schema(
  {
    prayerId: { type: mongoose.Schema.Types.ObjectId, ref: 'PrayerRequest', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorName: { type: String },
    body: { type: String, required: true },
  },
  { timestamps: true, strict: true }
);

module.exports = mongoose.model('PrayerComment', prayerCommentSchema);
