const Joi = require('joi');

const syncItemSchema = Joi.object({
  key: Joi.string().required(),
  data: Joi.object().unknown(true).default({}),
  deviceUpdatedAt: Joi.date().iso().required(),
  serverUpdatedAt: Joi.date().iso().optional(),
});

const syncSchema = Joi.object({
  body: Joi.object({
    items: Joi.array().items(syncItemSchema).default([]),
  }).required(),
  params: Joi.object().unknown(true),
  query: Joi.object().unknown(true),
});

module.exports = { syncSchema };
