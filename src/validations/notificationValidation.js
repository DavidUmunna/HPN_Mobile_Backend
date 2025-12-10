const Joi = require('joi');

const seedNotificationSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().required(),
    body: Joi.string().required(),
    type: Joi.string().valid('event', 'prayer', 'giving', 'general').default('general'),
  }).required(),
  params: Joi.object().unknown(true),
  query: Joi.object().unknown(true),
});

module.exports = { seedNotificationSchema };
