const mongoose = require('mongoose');
const Donation = require('../models/Donation');

async function createDonation(payload) {
  const donation = new Donation(payload);
  return donation.save();
}

async function updateDonationById(id, updates) {
  return Donation.findByIdAndUpdate(id, updates, { new: true }).lean();
}

async function findDonationByPaymentIntentId(paymentIntentId) {
  return Donation.findOne({ paymentIntentId }).lean();
}

async function findDonationByInvoiceId(invoiceId) {
  return Donation.findOne({ invoiceId }).lean();
}

async function updateDonationStatusByPaymentIntentId(paymentIntentId, status) {
  return Donation.findOneAndUpdate({ paymentIntentId }, { status }, { new: true }).lean();
}

async function listDonationsByUser(userId, { limit = 20, offset = 0, status } = {}) {
  const query = { userId: new mongoose.Types.ObjectId(userId) };
  if (status) query.status = status;
  return Donation.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean();
}

async function getDonationSummary(userId, { yearStart, monthStart }) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const results = await Donation.aggregate([
    {
      $match: {
        userId: userObjectId,
        status: 'succeeded',
        createdAt: { $gte: yearStart },
      },
    },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              amountCents: { $sum: '$amountCents' },
              count: { $sum: 1 },
            },
          },
        ],
        month: [
          { $match: { createdAt: { $gte: monthStart } } },
          {
            $group: {
              _id: null,
              amountCents: { $sum: '$amountCents' },
            },
          },
        ],
      },
    },
  ]);

  const totals = results[0]?.totals?.[0] || { amountCents: 0, count: 0 };
  const month = results[0]?.month?.[0] || { amountCents: 0 };

  return {
    totalCents: totals.amountCents || 0,
    totalCount: totals.count || 0,
    monthCents: month.amountCents || 0,
  };
}

module.exports = {
  createDonation,
  updateDonationById,
  findDonationByPaymentIntentId,
  findDonationByInvoiceId,
  updateDonationStatusByPaymentIntentId,
  listDonationsByUser,
  getDonationSummary,
};
