const { listUsers, attendanceSummary, eventsSummary, updateUserEmail } = require('../services/adminService');

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

async function updateUserEmailController(req, res, next) {
  try {
    const user = await updateUserEmail({ userId: req.params.id, newEmail: req.body.email });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsersController, attendanceSummaryController, eventsSummaryController, updateUserEmailController };
