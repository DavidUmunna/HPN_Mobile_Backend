const Joi = require('joi');

const createPrayerSchema = Joi.object({
  body: Joi.object({
    request: Joi.string().min(3).required(),
    category: Joi.string().optional(),
    authorName: Joi.string().optional(),
  }).required(),
  params: Joi.object().unknown(true),
  query: Joi.object().unknown(true),
});

module.exports = { createPrayerSchema };
