const Attendance = require('../models/Attendance');

async function createAttendance(payload) {
  const record = new Attendance(payload);
  return record.save();
}

async function findLatestForUser(userId) {
  return Attendance.findOne({ userId }).sort({ timestamp: -1 }).lean();
}

async function findForUser(userId) {
  return Attendance.find({ userId }).sort({ timestamp: -1 }).lean();
}

async function findByIdForUser(id, userId) {
  return Attendance.findOne({ _id: id, userId }).lean();
}

async function countAll() {
  return Attendance.countDocuments();
}

async function recent(limit = 5) {
  return Attendance.find({}).sort({ timestamp: -1 }).limit(limit).lean();
}

module.exports = { createAttendance, findLatestForUser, findForUser, findByIdForUser, countAll, recent };
