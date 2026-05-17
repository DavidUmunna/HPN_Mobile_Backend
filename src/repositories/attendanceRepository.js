const Attendance = require('../models/Attendance');

async function createAttendance(payload) {
  const record = new Attendance(payload);
  return record.save();
}

async function updateAttendance(id, payload) {
  return Attendance.findByIdAndUpdate(id, payload, { new: true });
}

async function findByUserAndAttendanceDateKey(userId, attendanceDateKey) {
  return Attendance.findOne({ userId, attendanceDateKey });
}

async function findLatestForUser(userId) {
  return Attendance.findOne({ userId }).sort({ timestamp: -1 }).lean();
}

async function findForUser(userId) {
  return Attendance.find({ userId }).sort({ timestamp: -1 }).lean();
}

async function findForUserPaginated(userId, { skip, limit }) {
  const [totalRecords, records] = await Promise.all([
    Attendance.countDocuments({ userId }),
    Attendance.find({ userId }).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
  ]);
  return { totalRecords, records };
}

async function findByIdForUser(id, userId) {
  return Attendance.findOne({ _id: id, userId }).lean();
}

async function checkOutAttendance(id, timestamp) {
  return Attendance.findByIdAndUpdate(
    id,
    { checkedOutAt: timestamp },
    { new: true }
  );
}

async function countAll() {
  return Attendance.countDocuments();
}

async function recent(limit = 5) {
  return Attendance.find({}).sort({ timestamp: -1 }).limit(limit).lean();
}

module.exports = {
  createAttendance,
  updateAttendance,
  checkOutAttendance,
  findByUserAndAttendanceDateKey,
  findLatestForUser,
  findForUser,
  findForUserPaginated,
  findByIdForUser,
  countAll,
  recent,
};
