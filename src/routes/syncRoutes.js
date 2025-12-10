const express = require('express');
const { syncController } = require('../controllers/syncController');
const { validate } = require('../middlewares/validate');
const { syncSchema } = require('../validations/syncValidation');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', requireAuth, validate(syncSchema), syncController);

module.exports = router;
