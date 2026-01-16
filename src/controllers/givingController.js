const { createGivingPayment, getGivingSummary } = require('../services/givingService');

async function getGivingController(req, res, next) {
  try {
    const summary = await getGivingSummary({ userId: req.session.userId });
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

async function createGivingController(req, res, next) {
  try {
    const result = await createGivingPayment({
      userId: req.session.userId,
      amount: req.body.amount,
      category: req.body.category,
      type: req.body.type,
      currency: req.body.currency,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { getGivingController, createGivingController };
