const Joi = require('joi');

const changeUserEmailSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required(),
  }).required(),
  params: Joi.object({
    id: Joi.string().required(),
  }).required(),
  query: Joi.object().unknown(true),
});

module.exports = { changeUserEmailSchema };
