const Joi = require('joi');

const signupSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    phone: Joi.string().optional(),
    role: Joi.string().valid('member', 'staff', 'admin').optional(),
  }).required(),
  params: Joi.object().unknown(true),
  query: Joi.object().unknown(true),
});

const loginSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
  }).required(),
  params: Joi.object().unknown(true),
  query: Joi.object().unknown(true),
});

module.exports = { signupSchema, loginSchema };
