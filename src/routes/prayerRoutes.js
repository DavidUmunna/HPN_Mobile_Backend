const express = require('express');
const {
  listPrayersController,
  createPrayerController,
  togglePrayController,
} = require('../controllers/prayerController');
const { validate } = require('../middlewares/validate');
const { createPrayerSchema } = require('../validations/prayerValidation');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, listPrayersController);
router.post('/', requireAuth, validate(createPrayerSchema), createPrayerController);
router.post('/:id/pray', requireAuth, togglePrayController);

module.exports = router;
