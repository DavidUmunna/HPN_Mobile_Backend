const {
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
} = require('../repositories/attendanceRepository');
const { findById } = require('../repositories/userRepository');
const { listDependentsByUser, replaceDependentsByUser } = require('../repositories/dependentRepository');
const { AppError } = require('../utils/errors');
const { buildPagination } = require('../utils/pagination');

const AUTO_CHECKOUT_HOUR = 15; // 3:00 PM on the day of check-in

function buildAttendanceDateKey(timestamp) {
  const year = timestamp.getFullYear();
  const month = String(timestamp.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(timestamp.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayOfMonth}`;
}

function buildDayLabel(timestamp) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[timestamp.getDay()];
}

function toAttendanceResponse(record, dependents) {
  const sourceDependents = Array.isArray(record.dependents) && record.dependents.length > 0
    ? record.dependents
    : dependents;

  const checkInTime = record.timestamp instanceof Date ? record.timestamp : new Date(record.timestamp);
  const autoCheckoutTime = new Date(checkInTime);
  autoCheckoutTime.setHours(AUTO_CHECKOUT_HOUR, 0, 0, 0);
  const now = new Date();
  const checkedOutAt = record.checkedOutAt
    ? record.checkedOutAt
    : (now >= autoCheckoutTime ? autoCheckoutTime : null);

  const response = {
    id: record._id.toString(),
    timestamp: record.timestamp,
    checkedOutAt,
    day: record.day,
    location: record.location,
    userId: record.userId?.toString(),
  };
  if (Array.isArray(sourceDependents)) {
    response.dependents = sourceDependents.map((dependent) => ({
      id: dependent._id?.toString?.() ?? dependent.dependentId?.toString?.() ?? dependent.id,
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

  if (Array.isArray(dependents)) {
    const trimmed = dependents
      .map((dependent) => ({
        name: typeof dependent.name === 'string' ? dependent.name.trim() : '',
        age: dependent.age,
      }))
      .filter((dependent) => dependent.name && Number.isFinite(dependent.age));

    const savedDependents = await replaceDependentsByUser(userId, trimmed);
    user.dependents = savedDependents.map((dependent) => dependent._id);
    await user.save();
  }

  const dependentsList = user.dependents?.length ? await listDependentsByUser(userId) : [];
  const attendanceDateKey = buildAttendanceDateKey(ts);
  const payload = {
    userId,
    timestamp: ts,
    day: buildDayLabel(ts),
    attendanceDateKey,
    dependents: dependentsList.map((dependent) => ({
      dependentId: dependent._id,
      name: dependent.name,
      age: dependent.age,
    })),
    location: { latitude, longitude },
  };

  let existingRecord = await findByUserAndAttendanceDateKey(userId, attendanceDateKey);
  let record;
  let created = false;

  if (existingRecord) {
    record = await updateAttendance(existingRecord._id, payload);
  } else {
    try {
      record = await createAttendance(payload);
      created = true;
    } catch (err) {
      if (err?.code === 11000) {
        existingRecord = await findByUserAndAttendanceDateKey(userId, attendanceDateKey);
        if (!existingRecord) throw err;
        record = await updateAttendance(existingRecord._id, payload);
      } else {
        throw err;
      }
    }
  }

  return { record: toAttendanceResponse(record, dependentsList), created };
}

async function checkOut(userId) {
  const now = new Date();
  const attendanceDateKey = buildAttendanceDateKey(now);
  const existing = await findByUserAndAttendanceDateKey(userId, attendanceDateKey);
  if (!existing) throw new AppError('No check-in found for today', 404);
  if (existing.checkedOutAt) throw new AppError('Already checked out', 409);
  const updated = await checkOutAttendance(existing._id, now);
  return toAttendanceResponse(updated);
}

async function latestForUser(userId) {
  const record = await findLatestForUser(userId);
  if (!record) return null;
  if (Array.isArray(record.dependents) && record.dependents.length > 0) {
    return toAttendanceResponse(record);
  }
  const dependents = await listDependentsByUser(userId);
  return toAttendanceResponse(record, dependents);
}

async function listForUser(userId, { page, limit } = {}) {
  const pagination = buildPagination({ page, limit });
  const { totalRecords, records } = await findForUserPaginated(userId, pagination);
  return {
    records: records.map(toAttendanceResponse),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      totalRecords,
      totalPages: Math.max(Math.ceil(totalRecords / pagination.limit), 1),
    },
  };
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

module.exports = { checkIn, checkOut, latestForUser, listForUser, getAttendance, summary };
