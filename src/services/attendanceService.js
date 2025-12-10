const { createAttendance, findLatestForUser, countAll, recent } = require('../repositories/attendanceRepository');
const { AppError } = require('../utils/errors');

function toAttendanceResponse(record) {
  return {
    id: record._id.toString(),
    timestamp: record.timestamp,
    day: record.day,
    location: record.location,
    userId: record.userId?.toString(),
  };
}

async function checkIn({ userId, latitude, longitude, timestamp }) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new AppError('Latitude and longitude are required', 400);
  }
  const ts = timestamp ? new Date(timestamp) : new Date();
  if (Number.isNaN(ts.getTime())) throw new AppError('Invalid timestamp', 400);

  const record = await createAttendance({
    userId,
    timestamp: ts,
    day: ts.toDateString(),
    location: { latitude, longitude },
  });

  return toAttendanceResponse(record);
}

async function latestForUser(userId) {
  const record = await findLatestForUser(userId);
  if (!record) return null;
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

module.exports = { checkIn, latestForUser, summary };
