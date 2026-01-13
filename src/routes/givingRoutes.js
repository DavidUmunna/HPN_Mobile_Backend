const express = require('express');
const { requireAuth } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const {
  listGivingTransactionsController,
  givingSummaryController,
  createPaymentIntentController,
  createSubscriptionController,
  createSetupIntentController,
  stripeWebhookController,
} = require('../controllers/givingController');
const {
  createPaymentIntentSchema,
  createSubscriptionSchema,
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

router.post('/intent', requireAuth, validate(createPaymentIntentSchema), createPaymentIntentController);
router.post('/subscription', requireAuth, validate(createSubscriptionSchema), createSubscriptionController);
router.post('/setup-intent', requireAuth, createSetupIntentController);

module.exports = router;
