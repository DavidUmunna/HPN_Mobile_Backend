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

const createPrayerCommentSchema = Joi.object({
  body: Joi.object({
    body: Joi.string().min(1).max(1000).required(),
  }).required(),
  params: Joi.object().unknown(true),
  query: Joi.object().unknown(true),
});

const listPrayerCommentsSchema = Joi.object({
  body: Joi.object().unknown(true),
  params: Joi.object().unknown(true),
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
  }).unknown(true),
});

const listPrayerPrayersSchema = Joi.object({
  body: Joi.object().unknown(true),
  params: Joi.object().unknown(true),
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
  }).unknown(true),
});

module.exports = {
  createPrayerSchema,
  createPrayerCommentSchema,
  listPrayerCommentsSchema,
  listPrayerPrayersSchema,
};
