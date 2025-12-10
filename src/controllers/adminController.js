const { listUsers, attendanceSummary, eventsSummary } = require('../services/adminService');

async function listUsersController(_req, res, next) {
  try {
    const users = await listUsers();
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

async function attendanceSummaryController(_req, res, next) {
  try {
    const summary = await attendanceSummary();
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

async function eventsSummaryController(_req, res, next) {
  try {
    const summary = await eventsSummary();
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsersController, attendanceSummaryController, eventsSummaryController };
