const mongoose = require('mongoose');

const syncItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    key: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    deviceUpdatedAt: { type: Date, required: true },
    serverUpdatedAt: { type: Date, required: true },
    conflict: { type: Boolean, default: false },
    conflictReason: { type: String },
  },
  { timestamps: true, strict: true }
);

syncItemSchema.index({ userId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('SyncItem', syncItemSchema);
