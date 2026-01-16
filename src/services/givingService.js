const { AppError } = require('../utils/errors');
const { logger } = require('../utils/logger');
const { getStripe } = require('../config/stripe');
const { createGiving, listByUser, updateGivingById } = require('../repositories/givingRepository');

function toGivingDTO(doc) {
  return {
    id: doc._id.toString(),
    amount: doc.amountCents / 100,
    currency: doc.currency,
    category: doc.category,
    type: doc.type,
    status: doc.status,
    date: doc.createdAt,
  };
}

async function createGivingPayment({ userId, amount, category, type, currency = 'usd' }) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new AppError('Amount must be greater than zero', 400);
  }
  const amountCents = Math.round(numericAmount * 100);
  if (amountCents < 50) throw new AppError('Minimum amount is $0.50', 400);

  const stripe = getStripe();

  const donation = await createGiving({
    user: userId,
    amountCents,
    currency: currency.toLowerCase(),
    category,
    type,
    status: stripe ? 'pending' : 'succeeded',
    provider: stripe ? 'stripe' : 'mock',
  });

  let paymentIntentClientSecret = null;
  let paymentIntentId = null;
  let status = donation.status;

  if (stripe) {
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata: { userId, category, type },
      ...(type && type.toLowerCase() === 'monthly' ? { setup_future_usage: 'off_session' } : {}),
    });
    paymentIntentClientSecret = intent.client_secret;
    paymentIntentId = intent.id;
    status = intent.status || donation.status;
    await updateGivingById(donation._id, { paymentIntentId, status });
  } else {
    logger.warn('STRIPE_SECRET_KEY not set; marking donation succeeded without processing payment', {
      userId,
      amountCents,
    });
  }

  return {
    donation: toGivingDTO({ ...donation.toObject(), paymentIntentId: paymentIntentId || donation.paymentIntentId, status }),
    paymentProvider: stripe ? 'stripe' : 'mock',
    paymentIntentClientSecret,
    paymentIntentId,
  };
}

async function getGivingSummary({ userId }) {
  const donations = await listByUser(userId);
  const transactions = donations.map(toGivingDTO);

  const isCountable = (status) => status !== 'failed';

  const totalGiven = transactions
    .filter((t) => isCountable(t.status))
    .reduce((sum, t) => sum + t.amount, 0);

  const now = new Date();
  const thisMonth = transactions
    .filter(
      (t) =>
        isCountable(t.status) &&
        t.date &&
        new Date(t.date).getMonth() === now.getMonth() &&
        new Date(t.date).getFullYear() === now.getFullYear()
    )
    .reduce((sum, t) => sum + t.amount, 0);

  return { transactions, totalGiven, thisMonth };
}

module.exports = { createGivingPayment, getGivingSummary };
