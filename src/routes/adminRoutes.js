const express = require('express');
const { listUsersController, attendanceSummaryController, eventsSummaryController } = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/users', listUsersController);
router.get('/attendance/summary', attendanceSummaryController);
router.get('/events/summary', eventsSummaryController);

module.exports = router;
