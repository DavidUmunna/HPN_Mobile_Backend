const Joi = require('joi');

const baseBody = {
  amount: Joi.number().positive().required(),
  category: Joi.string().valid('tithe', 'missions', 'building', 'special').required(),
  type: Joi.string().valid('one-time', 'monthly', 'yearly', 'One-time', 'Monthly', 'Yearly').required(),
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

const listTransactionsSchema = Joi.object({
  body: Joi.object().unknown(true),
  params: Joi.object().unknown(true),
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
  }).unknown(true),
});

module.exports = { createPaymentIntentSchema, createSubscriptionSchema, listTransactionsSchema };
