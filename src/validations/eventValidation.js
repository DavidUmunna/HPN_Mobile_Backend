const Joi = require('joi');

const listEventsSchema = Joi.object({
  query: Joi.object({
    search: Joi.string().optional(),
    category: Joi.string().optional(),
  }).unknown(true),
  params: Joi.object().unknown(true),
  body: Joi.object().unknown(true),
});

const createEventSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().optional(),
    startTime: Joi.date().iso().required(),
    endTime: Joi.date().iso().optional(),
    location: Joi.string().optional(),
    category: Joi.string().optional(),
    maxAttendees: Joi.number().min(1).optional(),
    notifyBySms: Joi.boolean().optional(),
    smsAudience: Joi.string().valid('all', 'member', 'staff', 'admin').optional(),
  }).required(),
  params: Joi.object().unknown(true),
  query: Joi.object().unknown(true),
});

module.exports = { listEventsSchema, createEventSchema };
