const Stripe = require('stripe');
const { AppError } = require('../utils/errors');
const { findById, updateStripeCustomerId } = require('../repositories/userRepository');
const {
  createDonation,
  updateDonationById,
  findDonationByPaymentIntentId,
  findDonationByInvoiceId,
  updateDonationStatusByPaymentIntentId,
  listDonationsByUser,
  getDonationSummary,
} = require('../repositories/donationRepository');

const GIVING_CATEGORIES = ['tithe', 'missions', 'building', 'special'];
const GIVING_TYPES = ['one-time', 'monthly', 'yearly'];

let stripeClient;

function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new AppError('Stripe secret key not configured', 500);
  }
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

function normalizeGivingType(type) {
  if (!type) return type;
  const normalized = type.toString().trim().toLowerCase();
  if (normalized === 'one time' || normalized === 'one-time') return 'one-time';
  if (normalized === 'monthly') return 'monthly';
  if (normalized === 'yearly' || normalized === 'annual') return 'yearly';
  return normalized;
}

function toCents(amount) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return NaN;
  return Math.round(numeric * 100);
}

function toDonationResponse(donation) {
  return {
    id: donation._id.toString(),
    amount: donation.amountCents / 100,
    currency: donation.currency,
    category: donation.category,
    type: donation.type,
    status: donation.status,
    createdAt: donation.createdAt,
  };
}

async function ensureStripeCustomer(userId) {
  const user = await findById(userId);
  if (!user) throw new AppError('User not found', 404);
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: { userId: userId.toString() },
  });

  await updateStripeCustomerId(userId, customer.id);
  return customer.id;
}

async function listGivingTransactions(userId, { limit = 20, offset = 0 } = {}) {
  const donations = await listDonationsByUser(userId, { limit, offset, status: 'succeeded' });
  return donations.map(toDonationResponse);
}

async function getGivingSummary(userId) {
  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));

  const summary = await getDonationSummary(userId, { yearStart, monthStart });

  return {
    totalGiven: summary.totalCents / 100,
    thisMonth: summary.monthCents / 100,
    transactionCount: summary.totalCount,
    currency: 'usd',
  };
}

async function createPaymentIntent({ userId, amount, category, type, currency = 'usd' }) {
  const normalizedType = normalizeGivingType(type);
  if (normalizedType !== 'one-time') {
    throw new AppError('Invalid giving type for one-time payment', 400);
  }
  if (!GIVING_CATEGORIES.includes(category)) {
    throw new AppError('Invalid giving category', 400);
  }
  const amountCents = toCents(amount);
  if (!Number.isFinite(amountCents) || amountCents < 50) {
    throw new AppError('Invalid amount', 400);
  }

  const donation = await createDonation({
    userId,
    amountCents,
    currency,
    category,
    type: normalizedType,
    status: 'pending',
  });

  const stripe = getStripeClient();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    automatic_payment_methods: { enabled: true },
    metadata: {
      donationId: donation._id.toString(),
      userId: userId.toString(),
      category,
      type: normalizedType,
    },
  });

  await updateDonationById(donation._id, { paymentIntentId: paymentIntent.id });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    donationId: donation._id.toString(),
  };
}

async function createSubscription({ userId, amount, category, type, currency = 'usd' }) {
  const normalizedType = normalizeGivingType(type);
  if (!['monthly', 'yearly'].includes(normalizedType)) {
    throw new AppError('Invalid giving type for subscription', 400);
  }
  if (!GIVING_CATEGORIES.includes(category)) {
    throw new AppError('Invalid giving category', 400);
  }
  const amountCents = toCents(amount);
  if (!Number.isFinite(amountCents) || amountCents < 50) {
    throw new AppError('Invalid amount', 400);
  }

  const stripe = getStripeClient();
  const customerId = await ensureStripeCustomer(userId);

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [
      {
        price_data: {
          currency,
          unit_amount: amountCents,
          product_data: { name: `${category} (${normalizedType})` },
          recurring: { interval: normalizedType === 'monthly' ? 'month' : 'year' },
        },
      },
    ],
    payment_behavior: 'default_incomplete',
    metadata: { userId: userId.toString(), category, type: normalizedType },
    expand: ['latest_invoice.payment_intent'],
  });

  const invoice = subscription.latest_invoice;
  const paymentIntent = invoice?.payment_intent;

  const donation = await createDonation({
    userId,
    amountCents,
    currency,
    category,
    type: normalizedType,
    status: 'pending',
    subscriptionId: subscription.id,
    invoiceId: invoice?.id,
    paymentIntentId: paymentIntent?.id,
  });

  return {
    clientSecret: paymentIntent?.client_secret || null,
    subscriptionId: subscription.id,
    donationId: donation._id.toString(),
  };
}

async function createSetupIntent(userId) {
  const stripe = getStripeClient();
  const customerId = await ensureStripeCustomer(userId);
  const intent = await stripe.setupIntents.create({ customer: customerId });
  return { clientSecret: intent.client_secret };
}

async function handleStripeWebhook(event) {
  const stripe = getStripeClient();

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    await updateDonationStatusByPaymentIntentId(paymentIntent.id, 'succeeded');
    return;
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    await updateDonationStatusByPaymentIntentId(paymentIntent.id, 'failed');
    return;
  }

  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object;
    if (!invoice?.id) return;

    const existing = await findDonationByInvoiceId(invoice.id);
    if (existing) return;

    let subscription = null;
    if (invoice.subscription) {
      subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    }

    const metadata = subscription?.metadata || invoice.metadata || {};
    const userId = metadata.userId;
    const category = metadata.category || 'tithe';
    const type = normalizeGivingType(metadata.type || 'monthly');

    if (!userId) return;

    await createDonation({
      userId,
      amountCents: invoice.amount_paid,
      currency: invoice.currency,
      category,
      type,
      status: 'succeeded',
      subscriptionId: invoice.subscription || undefined,
      invoiceId: invoice.id,
      paymentIntentId: invoice.payment_intent || undefined,
    });
    return;
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    if (!invoice?.payment_intent) return;
    await updateDonationStatusByPaymentIntentId(invoice.payment_intent, 'failed');
  }
}

module.exports = {
  GIVING_CATEGORIES,
  GIVING_TYPES,
  listGivingTransactions,
  getGivingSummary,
  createPaymentIntent,
  createSubscription,
  createSetupIntent,
  handleStripeWebhook,
  normalizeGivingType,
};
