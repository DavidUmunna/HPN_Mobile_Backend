const Joi = require('joi');

const baseBody = {
  amount: Joi.number().positive().required(),
  category: Joi.string().valid('Tithe', 'Missions', 'Building', 'Special').required(),
  type: Joi.string().valid('One-Time', 'Monthly', 'Yearly').required(),
  currency: Joi.string().length(3).default('usd'),
};

const createPaymentIntentSchema = Joi.object({
  body: Joi.object({
    ...baseBody,
  }).required(),
  params: Joi.object().unknown(true),
  query: Joi.object().unknown(true),
});

const createSubscriptionSchema = Joi.object({
  body: Joi.object({
    ...baseBody,
  }).required(),
  params: Joi.object().unknown(true),
  query: Joi.object().unknown(true),
});

const cancelPaymentIntentSchema = Joi.object({
  body: Joi.object({
    paymentIntentId: Joi.string().trim().required(),
  }).required(),
  params: Joi.object().unknown(true),
  query: Joi.object().unknown(true),
});

const paymentIntentStatusSchema = Joi.object({
  body: Joi.object().unknown(true),
  params: Joi.object({
    paymentIntentId: Joi.string().trim().required(),
  }).required(),
  query: Joi.object().unknown(true),
});

const listTransactionsSchema = Joi.object({
  body: Joi.object().unknown(true),
  params: Joi.object().unknown(true),
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
  }).unknown(true),
});

module.exports = { createPaymentIntentSchema, createSubscriptionSchema, cancelPaymentIntentSchema, paymentIntentStatusSchema, listTransactionsSchema };
