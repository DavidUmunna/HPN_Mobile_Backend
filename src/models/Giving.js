const mongoose = require('mongoose');

const givingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amountCents: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    category: { type: String, trim: true },
    type: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'succeeded', 'failed'],
      default: 'pending',
    },
    provider: { type: String, default: 'stripe' },
    paymentIntentId: { type: String },
    paymentMethod: { type: String },
  },
  { timestamps: true }
);

givingSchema.index({ paymentIntentId: 1 }, { unique: false, sparse: true });

module.exports = mongoose.model('Giving', givingSchema);
