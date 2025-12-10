const { checkIn, latestForUser } = require('../services/attendanceService');

async function checkInController(req, res, next) {
  try {
    const record = await checkIn({
      userId: req.session.userId,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      timestamp: req.body.timestamp,
    });
    res.status(201).json({ record });
  } catch (err) {
    next(err);
  }
}

async function latestAttendanceController(req, res, next) {
  try {
    const record = await latestForUser(req.session.userId);
    res.json({ record });
  } catch (err) {
    next(err);
  }
}

module.exports = { checkInController, latestAttendanceController };
