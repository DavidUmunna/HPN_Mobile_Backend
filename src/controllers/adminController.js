const {
  listUsers,
  attendanceSummary,
  listAttendanceRecords,
  getAttendanceRecord,
  deleteAttendanceRecord,
  exportAttendanceWorkbook,
  eventsSummary,
  updateUserEmail,
  updateUserRole,
  deleteUser,
  deleteEvent,
} = require('../services/adminService');

async function listUsersController(req, res, next) {
  try {
    const result = await listUsers({
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      role: req.query.role,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function attendanceSummaryController(req, res, next) {
  try {
    const summary = await attendanceSummary({
      recentPage: req.query.recentPage,
      recentLimit: req.query.recentLimit,
      newMembersPage: req.query.newMembersPage,
      newMembersLimit: req.query.newMembersLimit,
      attendedPage: req.query.attendedPage,
      attendedLimit: req.query.attendedLimit,
      absentPage: req.query.absentPage,
      absentLimit: req.query.absentLimit,
    });
    res.json(summary);
  } catch (err) {
    next(err);
    console.log("attendance summary error", err);
  }
}

async function listAttendanceRecordsController(req, res, next) {
  try {
    const result = await listAttendanceRecords({
      page: req.query.page,
      limit: req.query.limit,
      date: req.query.date,
      from: req.query.from,
      to: req.query.to,
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

async function updateUserRoleController(req, res, next) {
  try {
    const user = await updateUserRole({
      userId: req.params.id,
      newRole: req.body.role,
      requesterId: req.user.id,
    });
    res.json({ user });
  } catch (err) {
    next(err);
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

async function deleteEventController(req, res, next) {
  try {
    const result = await deleteEvent(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
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
  updateUserRoleController,
  deleteUserController,
  deleteEventController,
};
