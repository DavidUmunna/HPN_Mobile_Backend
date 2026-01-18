const {
  createAttendance,
  findLatestForUser,
  findForUser,
  findByIdForUser,
  countAll,
  recent,
} = require('../repositories/attendanceRepository');
const { findById } = require('../repositories/userRepository');
const { createDependents, listDependentsByUser } = require('../repositories/dependentRepository');
const { AppError } = require('../utils/errors');

function toAttendanceResponse(record, dependents) {
  const response = {
    id: record._id.toString(),
    timestamp: record.timestamp,
    day: record.day,
    location: record.location,
    userId: record.userId?.toString(),
  };
  if (Array.isArray(dependents)) {
    response.dependents = dependents.map((dependent) => ({
      id: dependent._id.toString(),
      name: dependent.name,
      age: dependent.age,
    }));
  }
  return response;
}

async function checkIn({ userId, latitude, longitude, timestamp, dependents }) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new AppError('Latitude and longitude are required', 400);
  }
  const ts = timestamp ? new Date(timestamp) : new Date();
  if (Number.isNaN(ts.getTime())) throw new AppError('Invalid timestamp', 400);

  const user = await findById(userId);
  if (!user) throw new AppError('User not found', 404);

  if ((!user.dependents || user.dependents.length === 0) && Array.isArray(dependents)) {
    const trimmed = dependents
      .map((dependent) => ({
        name: typeof dependent.name === 'string' ? dependent.name.trim() : '',
        age: dependent.age,
      }))
      .filter((dependent) => dependent.name && Number.isFinite(dependent.age));

    if (trimmed.length > 0) {
      const created = await createDependents(userId, trimmed);
      user.dependents = created.map((dependent) => dependent._id);
      await user.save();
    }
  }

  const dependentsList = user.dependents?.length ? await listDependentsByUser(userId) : [];
  const record = await createAttendance({
    userId,
    timestamp: ts,
    day: ts.toDateString(),
    location: { latitude, longitude },
  });

  return toAttendanceResponse(record, dependentsList);
}

async function latestForUser(userId) {
  const record = await findLatestForUser(userId);
  if (!record) return null;
  return toAttendanceResponse(record);
}

async function listForUser(userId) {
  const records = await findForUser(userId);
  return records.map(toAttendanceResponse);
}

async function getAttendance({ attendanceId, userId }) {
  const record = await findByIdForUser(attendanceId, userId);
  if (!record) throw new AppError('Attendance not found', 404);
  return toAttendanceResponse(record);
}

async function summary() {
  const totalCheckIns = await countAll();
  const recentRecords = await recent();
  return {
    totalCheckIns,
    recent: recentRecords.map(toAttendanceResponse),
  };
}

module.exports = { checkIn, latestForUser, listForUser, getAttendance, summary };
