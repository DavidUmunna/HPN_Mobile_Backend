const mongoose = require('mongoose');
const { findEvents, findEventById, updateEventAttendees, createEvent } = require('../repositories/eventRepository');
const { findById, listAll } = require('../repositories/userRepository');
const { sendBulkSms } = require('./smsService');
const { logger } = require('../utils/logger');
const { AppError } = require('../utils/errors');

const SMS_AUDIENCES = ['all', 'member', 'staff', 'admin'];

function buildEventSmsBody(event, webAppUrl) {
  const when = event.startTime
    ? new Date(event.startTime).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
    : 'TBC';
  const where = event.location ? ` at ${event.location}` : '';
  const link = `${webAppUrl.replace(/\/$/, '')}/events/${event._id}`;
  return `${event.title} — ${when}${where}. RSVP: ${link}`;
}

// Best-effort: never throws. A failure here should never stop the event
// itself from being created.
async function notifyEventBySms(event, audience) {
  const webAppUrl = process.env.WEB_APP_URL;
  if (!webAppUrl) {
    logger.warn('WEB_APP_URL is not set — skipping event SMS notification', {
      eventId: event._id.toString(),
    });
    return { delivered: 0, failed: 0, failures: [] };
  }

  const users = await listAll();
  const recipients = users
    .filter((user) => audience === 'all' || user.role === audience)
    .filter((user) => Boolean(user.phone))
    .map((user) => ({ id: user._id.toString(), phone: user.phone }));

  if (!recipients.length) {
    return { delivered: 0, failed: 0, failures: [] };
  }

  const body = buildEventSmsBody(event, webAppUrl);
  return sendBulkSms(recipients, () => body);
}

function toEventResponse(event, userId) {
  const attendees = event.attendees || [];
  const userIdStr = userId?.toString();
  const isRegistered = userIdStr ? attendees.some((id) => id.toString() === userIdStr) : false;
  return {
    id: event._id.toString(),
    title: event.title,
    description: event.description,
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.location,
    category: event.category,
    maxAttendees: event.maxAttendees,
    attendeesCount: attendees.length,
    isRegistered,
  };
}

async function listEvents({ userId, search, category }) {
  const events = await findEvents({ search, category });
  return events.map((e) => toEventResponse(e, userId));
}

async function getEvent({ eventId, userId }) {
  const event = await findEventById(eventId);
  if (!event) throw new AppError('Event not found', 404);
  return toEventResponse(event, userId);
}

async function toggleRsvp({ eventId, userId }) {
  const event = await findEventById(eventId);
  if (!event) throw new AppError('Event not found', 404);

  const attendeeIds = (event.attendees || []).map((id) => id.toString());
  const isRegistered = attendeeIds.includes(userId.toString());
  let status = 'registered';

  if (isRegistered) {
    status = 'cancelled';
    const filtered = attendeeIds.filter((id) => id !== userId.toString());
    const updated = await updateEventAttendees(
      eventId,
      filtered.map((id) => new mongoose.Types.ObjectId(id))
    );
    return { event: toEventResponse(updated, userId), status };
  }

  if (event.maxAttendees && attendeeIds.length >= event.maxAttendees) {
    throw new AppError('Event is full', 400);
  }

  attendeeIds.push(userId.toString());
  const updated = await updateEventAttendees(
    eventId,
    attendeeIds.map((id) => new mongoose.Types.ObjectId(id))
  );
  return { event: toEventResponse(updated, userId), status };
}

async function createNewEvent(payload) {
  const event = await createEvent(payload);
  const base = event.toObject ? event.toObject() : event;
  const response = toEventResponse(base, payload.userId);

  if (payload.notifyBySms) {
    try {
      const requester = await findById(payload.userId);
      if (requester?.role === 'admin') {
        const audience = SMS_AUDIENCES.includes(payload.smsAudience) ? payload.smsAudience : 'all';
        response.smsSummary = await notifyEventBySms(base, audience);
      } else {
        logger.warn('Ignored notifyBySms request from a non-admin user', { userId: payload.userId });
      }
    } catch (err) {
      logger.error('Failed to send event SMS notifications', {
        err: err.message,
        eventId: base._id.toString(),
      });
    }
  }

  return response;
}

module.exports = { listEvents, getEvent, toggleRsvp, createNewEvent };
