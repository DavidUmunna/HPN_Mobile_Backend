const Event = require('../models/Event');

async function findEvents({ search, category }) {
  const query = {};
  if (search) query.title = { $regex: search, $options: 'i' };
  if (category) query.category = category;
  return Event.find(query).sort({ startTime: 1 }).lean();
}

async function findEventById(id) {
  return Event.findById(id).lean();
}

async function updateEventAttendees(eventId, attendees) {
  return Event.findByIdAndUpdate(eventId, { attendees }, { new: true }).lean();
}

async function createEvent(payload) {
  const event = new Event(payload);
  return event.save();
}

module.exports = { findEvents, findEventById, updateEventAttendees, createEvent };
