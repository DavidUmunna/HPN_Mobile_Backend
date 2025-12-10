const { listEvents, getEvent, toggleRsvp, createNewEvent } = require('../services/eventsService');

async function listEventsController(req, res, next) {
  try {
    const events = await listEvents({
      userId: req.session.userId,
      search: req.query.search,
      category: req.query.category,
    });
    res.json({ events });
  } catch (err) {
    next(err);
  }
}

async function getEventController(req, res, next) {
  try {
    const event = await getEvent({ eventId: req.params.id, userId: req.session.userId });
    res.json({ event });
  } catch (err) {
    next(err);
  }
}

async function toggleRsvpController(req, res, next) {
  try {
    const result = await toggleRsvp({ eventId: req.params.id, userId: req.session.userId });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function createEventController(req, res, next) {
  try {
    const event = await createNewEvent({ ...req.body, userId: req.session.userId });
    res.status(201).json({ event });
  } catch (err) {
    next(err);
  }
}

module.exports = { listEventsController, getEventController, toggleRsvpController, createEventController };
