const mongoose = require('mongoose');

const pushTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, trim: true },
    platform: { type: String, enum: ['ios', 'android', 'web'], required: true },
    enabled: { type: Boolean, default: true },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

pushTokenSchema.index({ userId: 1, token: 1 }, { unique: true });

module.exports = mongoose.model('PushToken', pushTokenSchema);
