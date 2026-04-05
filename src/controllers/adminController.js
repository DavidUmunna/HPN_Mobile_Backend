const {
  listUsers,
  attendanceSummary,
  listAttendanceRecords,
  getAttendanceRecord,
  deleteAttendanceRecord,
  exportAttendanceWorkbook,
  eventsSummary,
  updateUserEmail,
  deleteUser,
} = require('../services/adminService');

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

async function listAttendanceRecordsController(req, res, next) {
  try {
    const result = await listAttendanceRecords({
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getAttendanceRecordController(req, res, next) {
  try {
    const record = await getAttendanceRecord(req.params.id);
    res.json({ record });
  } catch (err) {
    next(err);
  }
}

async function deleteAttendanceRecordController(req, res, next) {
  try {
    const result = await deleteAttendanceRecord(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function exportAttendanceController(_req, res, next) {
  try {
    const workbook = await exportAttendanceWorkbook();
    const filename = `attendance-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(workbook);
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

module.exports = {
  listUsersController,
  attendanceSummaryController,
  listAttendanceRecordsController,
  getAttendanceRecordController,
  deleteAttendanceRecordController,
  exportAttendanceController,
  eventsSummaryController,
  updateUserEmailController,
  deleteUserController,
};
