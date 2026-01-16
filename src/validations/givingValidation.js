const Joi = require('joi');

const createGivingSchema = Joi.object({
  body: Joi.object({
    amount: Joi.number().positive().min(0.5).required(),
    category: Joi.string().max(100).required(),
    type: Joi.string().max(50).optional(),
    currency: Joi.string().lowercase().default('usd'),
  }).required(),
  params: Joi.object().unknown(true),
  query: Joi.object().unknown(true),
});

module.exports = { createGivingSchema };
