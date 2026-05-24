const Joi = require('joi');

const checkInSchema = Joi.object({
  body: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
    timestamp: Joi.date().iso().optional(),
    dependents: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().trim().min(1).max(100).required(),
          age: Joi.number().min(0).max(120).required(),
        })
      )
      .max(10)
      .optional(),
  }).required(),
  params: Joi.object().unknown(true),
  query: Joi.object().unknown(true),
});

module.exports = { checkInSchema };
