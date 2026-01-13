const express = require('express');
const {
  listPrayersController,
  createPrayerController,
  togglePrayController,
  listPrayerCommentsController,
  addPrayerCommentController,
  deletePrayerCommentController,
  listPrayingUsersController,
} = require('../controllers/prayerController');
const { validate } = require('../middlewares/validate');
const {
  createPrayerSchema,
  createPrayerCommentSchema,
  listPrayerCommentsSchema,
  listPrayerPrayersSchema,
} = require('../validations/prayerValidation');
const { requireAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', requireAuth, listPrayersController);
router.post('/', requireAuth, validate(createPrayerSchema), createPrayerController);
router.post('/:id/pray', requireAuth, togglePrayController);
router.get('/:id/prayers', requireAuth, validate(listPrayerPrayersSchema), listPrayingUsersController);
router.get('/:id/comments', requireAuth, validate(listPrayerCommentsSchema), listPrayerCommentsController);
router.post('/:id/comments', requireAuth, validate(createPrayerCommentSchema), addPrayerCommentController);
router.delete('/:id/comments/:commentId', requireAuth, deletePrayerCommentController);

module.exports = router;
