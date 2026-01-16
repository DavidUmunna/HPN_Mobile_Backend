const express = require('express');
const authRoutes = require('./authRoutes');
const syncRoutes = require('./syncRoutes');
const healthRoutes = require('./healthRoutes');
const eventRoutes = require('./eventRoutes');
const prayerRoutes = require('./prayerRoutes');
const notificationRoutes = require('./notificationRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const adminRoutes = require('./adminRoutes');
const givingRoutes = require('./givingRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/sync', syncRoutes);
router.use('/health', healthRoutes);
router.use('/events', eventRoutes);
router.use('/prayers', prayerRoutes);
router.use('/notifications', notificationRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/admin', adminRoutes);
router.use('/giving', givingRoutes);

module.exports = router;
