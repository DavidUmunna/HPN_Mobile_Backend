const express = require('express');
const {
  listEventsController,
  getEventController,
  toggleRsvpController,
  createEventController,
} = require('../controllers/eventController');
const { validate } = require('../middlewares/validate');
const { listEventsSchema, createEventSchema } = require('../validations/eventValidation');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, validate(listEventsSchema), listEventsController);
router.post('/', requireAuth, validate(createEventSchema), createEventController);
router.get('/:id', requireAuth, getEventController);
router.post('/:id/rsvp', requireAuth, toggleRsvpController);

module.exports = router;
