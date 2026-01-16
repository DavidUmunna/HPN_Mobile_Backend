const express = require('express');
const { getGivingController, createGivingController } = require('../controllers/givingController');
const { validate } = require('../middlewares/validate');
const { requireAuth } = require('../middlewares/authMiddleware');
const { createGivingSchema } = require('../validations/givingValidation');

const router = express.Router();

router.get('/', requireAuth, getGivingController);
router.post('/', requireAuth, validate(createGivingSchema), createGivingController);

module.exports = router;
