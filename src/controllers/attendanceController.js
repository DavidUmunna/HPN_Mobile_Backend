const { checkIn, latestForUser, listForUser, getAttendance } = require('../services/attendanceService');

async function checkInController(req, res, next) {
  try {
    const result = await checkIn({
      userId: req.session.userId,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      timestamp: req.body.timestamp,
      dependents: req.body.dependents,
    });
    res.status(result.created ? 201 : 200).json({ record: result.record });
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

async function listAttendanceController(req, res, next) {
  try {
    const records = await listForUser(req.session.userId);
    res.json({ records });
  } catch (err) {
    next(err);
  }
}

async function getAttendanceController(req, res, next) {
  try {
    const record = await getAttendance({ attendanceId: req.params.id, userId: req.session.userId });
    res.json({ record });
  } catch (err) {
    next(err);
  }
}

module.exports = { checkInController, latestAttendanceController, listAttendanceController, getAttendanceController };
