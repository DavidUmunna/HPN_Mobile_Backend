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

const changeUserRoleSchema = Joi.object({
  body: Joi.object({
    role: Joi.string().valid('member', 'staff', 'admin').required(),
  }).required(),
  params: Joi.object({
    id: Joi.string().required(),
  }).required(),
  query: Joi.object().unknown(true),
});

const supportDepartmentSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  phone: Joi.string().trim().min(5).max(50).required(),
  description: Joi.string().trim().allow('').max(200).optional(),
});

const updateSupportDirectorySchema = Joi.object({
  body: Joi.object({
    churchName: Joi.string().trim().min(2).max(120).required(),
    mainPhone: Joi.string().trim().allow('').max(50).required(),
    email: Joi.string().trim().email({ tlds: { allow: false } }).allow('').required(),
    address: Joi.string().trim().allow('').max(300),
    departments: Joi.array().items(supportDepartmentSchema).required(),
  }).required(),
  params: Joi.object().unknown(true),
  query: Joi.object().unknown(true),
});

module.exports = { changeUserEmailSchema, changeUserRoleSchema, updateSupportDirectorySchema };
