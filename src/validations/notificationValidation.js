const Joi = require('joi');

const seedNotificationSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().required(),
    body: Joi.string().required(),
    type: Joi.string().valid('event', 'prayer', 'giving', 'general').default('general'),
    audience: Joi.string().valid('self', 'all').optional(),
  }).required(),
  params: Joi.object().unknown(true),
  query: Joi.object().unknown(true),
});

const registerPushTokenSchema = Joi.object({
  body: Joi.object({
    token: Joi.string().required(),
    platform: Joi.string().valid('ios', 'android', 'web').required(),
  }).required(),
  params: Joi.object().unknown(true),
  query: Joi.object().unknown(true),
});

const unregisterPushTokenSchema = Joi.object({
  body: Joi.object({
    token: Joi.string().required(),
  }).required(),
  params: Joi.object().unknown(true),
  query: Joi.object().unknown(true),
});

module.exports = { seedNotificationSchema, registerPushTokenSchema, unregisterPushTokenSchema };
