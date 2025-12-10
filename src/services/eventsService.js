const mongoose = require('mongoose');
const { findEvents, findEventById, updateEventAttendees, createEvent } = require('../repositories/eventRepository');
const { AppError } = require('../utils/errors');

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
  return toEventResponse(base, payload.userId);
}

module.exports = { listEvents, getEvent, toggleRsvp, createNewEvent };
