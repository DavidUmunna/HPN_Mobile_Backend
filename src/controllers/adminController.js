const { listUsers, attendanceSummary, eventsSummary, updateUserEmail, deleteUser } = require('../services/adminService');

async function listUsersController(_req, res, next) {
  try {
    const users = await listUsers();
    res.json({ users });
  } catch (err) {
    next(err);
    console.log("attendance summary error",err)
  }
}

async function attendanceSummaryController(_req, res, next) {
  try {
    const summary = await attendanceSummary();
    res.json(summary);
  } catch (err) {
    next(err);
    console.log("attendance summary error",err)
  }
}

async function eventsSummaryController(_req, res, next) {
  try {
    const summary = await eventsSummary();
    res.json(summary);
  } catch (err) {
    next(err);
    console.log("event  summary error",err)
  }
}

async function updateUserEmailController(req, res, next) {
  try {
    const user = await updateUserEmail({ userId: req.params.id, newEmail: req.body.email });
    res.json({ user });
  } catch (err) {
    next(err);
    console.log("user Email error",err)
  }
}

async function deleteUserController(req, res, next) {
  try {
    const result = await deleteUser(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
    console.log("delete user error",err)
  }
}

module.exports = { listUsersController, attendanceSummaryController, eventsSummaryController, updateUserEmailController, deleteUserController };
