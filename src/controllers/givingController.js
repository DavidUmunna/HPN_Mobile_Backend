const {
  listGivingTransactions,
  getGivingSummary,
  createPaymentIntent,
  cancelPaymentIntent,
  getPaymentIntentStatus,
  createSubscription,
  createSetupIntent,
  handleStripeWebhook,
} = require('../services/givingService');
const { AppError } = require('../utils/errors');

async function listGivingTransactionsController(req, res, next) {
  try {
    const transactions = await listGivingTransactions(req.session.userId, req.query);
    res.json({ transactions });
  } catch (err) {
    next(err);
  }
}

async function givingSummaryController(req, res, next) {
  try {
    const summary = await getGivingSummary(req.session.userId);
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

async function createPaymentIntentController(req, res, next) {
  try {
    const result = await createPaymentIntent({ userId: req.session.userId, ...req.body });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function cancelPaymentIntentController(req, res, next) {
  try {
    const result = await cancelPaymentIntent({ userId: req.session.userId, ...req.body });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getPaymentIntentStatusController(req, res, next) {
  try {
    const result = await getPaymentIntentStatus({ userId: req.session.userId, paymentIntentId: req.params.paymentIntentId });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function createSubscriptionController(req, res, next) {
  try {
    const result = await createSubscription({ userId: req.session.userId, ...req.body });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function createSetupIntentController(req, res, next) {
  try {
    const result = await createSetupIntent(req.session.userId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function stripeWebhookController(req, res, next) {
  try {
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!webhookSecret) throw new AppError('Stripe webhook secret not configured', 500);
    if (!stripeSecret) throw new AppError('Stripe secret key not configured', 500);
    if (!signature) throw new AppError('Missing Stripe signature', 400);

    const stripe = require('stripe')(stripeSecret);
    const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);

    await handleStripeWebhook(event);
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listGivingTransactionsController,
  givingSummaryController,
  createPaymentIntentController,
  cancelPaymentIntentController,
  getPaymentIntentStatusController,
  createSubscriptionController,
  createSetupIntentController,
  stripeWebhookController,
};
