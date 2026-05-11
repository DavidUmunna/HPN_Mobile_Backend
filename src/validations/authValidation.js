const Joi = require('joi');

const signupSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    phone: Joi.string().optional(),
    address: Joi.string().max(300).allow('').optional(),
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

const forgotPasswordSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required(),
  }).required(),
  params: Joi.object().unknown(true),
  query: Joi.object().unknown(true),
});

const resetPasswordSchema = Joi.object({
  body: Joi.object({
    token: Joi.string().optional(),
    password: Joi.string().min(8).required(),
  }).required(),
  params: Joi.object().unknown(true),
  query: Joi.object({
    token: Joi.string().optional(),
  }).unknown(true),
}).custom((value, helpers) => {
  if (!value.body.token && !value.query.token) {
    return helpers.message('Reset token is required.');
  }

  return value;
});

const changePasswordSchema = Joi.object({
  body: Joi.object({
    currentPassword: Joi.string().min(8).required(),
    newPassword: Joi.string().min(8).required(),
  })
    .required()
    .custom((value, helpers) => {
      if (value.currentPassword === value.newPassword) {
        return helpers.message('New password must be different from your current password.');
      }

      return value;
    }),
  params: Joi.object().unknown(true),
  query: Joi.object().unknown(true),
});

const updateProfileSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().max(50).optional(),
    address: Joi.string().max(300).allow('').optional(),
    avatarUrl: Joi.string().max(500).allow('').optional(),
    isOnboarded: Joi.boolean().optional(),
    isonboarded: Joi.boolean().optional(),
    is_onboarded: Joi.boolean().optional(),
  })
    .min(1)
    .required(),
  params: Joi.object().unknown(true),
  query: Joi.object().unknown(true),
});

module.exports = {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
};
