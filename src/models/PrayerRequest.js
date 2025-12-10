const mongoose = require('mongoose');

const prayerRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorName: { type: String },
    request: { type: String, required: true },
    category: { type: String, default: 'General' },
    prayedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    commentsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PrayerRequest', prayerRequestSchema);
