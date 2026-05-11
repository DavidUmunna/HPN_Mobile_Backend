const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amountCents: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'usd' },
    category: { type: String, enum: ['Tithe', 'Missions', 'Building', 'Special'], required: true },
    type: { type: String, enum: ['One-Time', 'Monthly', 'Yearly'], required: true },
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    provider: { type: String, default: 'stripe' },
    paymentIntentId: { type: String, index: true },
    subscriptionId: { type: String, index: true },
    invoiceId: { type: String, index: true },
  },
  { timestamps: true, strict: true }
);

module.exports = mongoose.model('Donation', donationSchema);
