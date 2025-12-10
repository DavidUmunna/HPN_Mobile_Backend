const Joi = require('joi');

const checkInSchema = Joi.object({
  body: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
    timestamp: Joi.date().iso().optional(),
  }).required(),
  params: Joi.object().unknown(true),
  query: Joi.object().unknown(true),
});

module.exports = { checkInSchema };
