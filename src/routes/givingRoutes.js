const express = require('express');
const { requireAuth } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const {
  listGivingTransactionsController,
  givingSummaryController,
  createPaymentIntentController,
  cancelPaymentIntentController,
  getPaymentIntentStatusController,
  createSubscriptionController,
  createSetupIntentController,
  stripeWebhookController,
} = require('../controllers/givingController');
const {
  createPaymentIntentSchema,
  createSubscriptionSchema,
  cancelPaymentIntentSchema,
  paymentIntentStatusSchema,
  listTransactionsSchema,
} = require('../validations/givingValidation');
const { GIVING_CATEGORIES } = require('../services/givingService');

const router = express.Router();

router.post('/webhook', stripeWebhookController);

router.get('/categories', requireAuth, (_req, res) => {
  res.json({ categories: GIVING_CATEGORIES });
});

router.get('/summary', requireAuth, givingSummaryController);
router.get('/transactions', requireAuth, validate(listTransactionsSchema), listGivingTransactionsController);
router.get('/payment-intents/:paymentIntentId/status', requireAuth, validate(paymentIntentStatusSchema), getPaymentIntentStatusController);

router.post('/intent', requireAuth, validate(createPaymentIntentSchema), createPaymentIntentController);
router.post('/intent/cancel', requireAuth, validate(cancelPaymentIntentSchema), cancelPaymentIntentController);
router.post('/subscription', requireAuth, validate(createSubscriptionSchema), createSubscriptionController);
router.post('/setup-intent', requireAuth, createSetupIntentController);

module.exports = router;
