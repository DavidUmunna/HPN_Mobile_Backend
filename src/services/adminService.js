const User = require('../models/User');
const Event = require('../models/Event');
const Attendance = require('../models/Attendance');
const { AppError } = require('../utils/errors');
const XLSX = require('xlsx');
const { buildPagination } = require('../utils/pagination');

function buildAttendanceAnalyticsLabel(record) {
  if (!record?.timestamp) return null;
  const date = new Date(record.timestamp);
  if (Number.isNaN(date.getTime())) return null;
  const day = record.day || date.toLocaleDateString('en-GB', { weekday: 'long' });
  const formattedDate = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${day}, ${formattedDate}`;
}

function toAttendanceAnalyticsUser(user) {
  return {
    id: user._id.toString(),
    name: user.name || user.email,
    email: user.email,
    role: user.role,
  };
}

function toAttendanceRecord(record) {
  const populatedUser =
    record.userId && typeof record.userId === 'object' && !Array.isArray(record.userId)
      ? record.userId
      : null;

  return {
    id: record._id.toString(),
    userId: populatedUser?._id?.toString?.() ?? record.userId?.toString(),
    userName: populatedUser?.name || undefined,
    timestamp: record.timestamp,
    day: record.day,
    location: record.location,
    dependents: Array.isArray(record.dependents)
      ? record.dependents.map((dependent) => ({
          id: dependent.dependentId?.toString(),
          name: dependent.name,
          age: dependent.age,
        }))
      : [],
  };
}

async function listUsers() {
  const users = await User.find().sort({ createdAt: -1 }).lean();
  return users.map((u) => ({
    id: u._id.toString(),
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
  }));
}

async function attendanceSummary() {
  const total = await Attendance.countDocuments();
  const latest = await Attendance.find()
    .populate('userId', 'name')
    .sort({ timestamp: -1 })
    .limit(5)
    .lean();

  const eligibleUsers = await User.find({ role: { $in: ['member', 'staff'] } })
    .sort({ name: 1, email: 1 })
    .lean();

  const latestRecord = latest[0] || null;
  let analytics = {
    attendanceLabel: null,
    totalEligibleUsers: eligibleUsers.length,
    attendedCount: 0,
    absentCount: eligibleUsers.length,
    attendedUsers: [],
    absentUsers: eligibleUsers.map(toAttendanceAnalyticsUser),
  };

  if (latestRecord?.attendanceDateKey) {
    const recordsForLatestDay = await Attendance.find({ attendanceDateKey: latestRecord.attendanceDateKey })
      .populate('userId', 'name email role')
      .lean();

    const attendedUsers = recordsForLatestDay
      .map((record) => record.userId)
      .filter((user) => user && typeof user === 'object' && !Array.isArray(user))
      .filter((user) => user.role === 'member' || user.role === 'staff');

    const attendedUserIds = new Set(attendedUsers.map((user) => user._id.toString()));
    const absentUsers = eligibleUsers.filter((user) => !attendedUserIds.has(user._id.toString()));

    analytics = {
      attendanceLabel: buildAttendanceAnalyticsLabel(latestRecord),
      totalEligibleUsers: eligibleUsers.length,
      attendedCount: attendedUsers.length,
      absentCount: absentUsers.length,
      attendedUsers: attendedUsers.map(toAttendanceAnalyticsUser),
      absentUsers: absentUsers.map(toAttendanceAnalyticsUser),
    };
  }

  return {
    totalCheckIns: total,
    recent: latest.map(toAttendanceRecord),
    analytics,
  };
}

async function listAttendanceRecords({ page, limit } = {}) {
  const pagination = buildPagination({ page, limit });
  const [totalRecords, records] = await Promise.all([
    Attendance.countDocuments(),
    Attendance.find()
      .populate('userId', 'name')
      .sort({ timestamp: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
  ]);

  return {
    records: records.map(toAttendanceRecord),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      totalRecords,
      totalPages: Math.max(Math.ceil(totalRecords / pagination.limit), 1),
    },
  };
}

async function getAttendanceRecord(attendanceId) {
  try {
    const record = await Attendance.findById(attendanceId).populate('userId', 'name').lean();
    if (!record) throw new AppError('Attendance record not found', 404);
    return toAttendanceRecord(record);
  } catch (err) {
    if (err?.name === 'CastError') throw new AppError('Invalid attendance id', 400);
    throw err;
  }
}

async function deleteAttendanceRecord(attendanceId) {
  try {
    const record = await Attendance.findByIdAndDelete(attendanceId).lean();
    if (!record) throw new AppError('Attendance record not found', 404);
    return { deleted: true, id: record._id.toString() };
  } catch (err) {
    if (err?.name === 'CastError') throw new AppError('Invalid attendance id', 400);
    throw err;
  }
}

async function exportAttendanceWorkbook() {
  const records = await Attendance.find().populate('userId', 'name').sort({ timestamp: -1 }).lean();
  const rows = records.map((record) => ({
    id: record._id.toString(),
    userId: record.userId?.toString() || '',
    userName:
      record.userId && typeof record.userId === 'object' && !Array.isArray(record.userId)
        ? record.userId.name || ''
        : '',
    timestamp: record.timestamp instanceof Date ? record.timestamp.toISOString() : record.timestamp,
    day: record.day || '',
    latitude: record.location?.latitude ?? '',
    longitude: record.location?.longitude ?? '',
    dependentsCount: Array.isArray(record.dependents) ? record.dependents.length : 0,
    dependents: Array.isArray(record.dependents)
      ? record.dependents.map((dependent) => `${dependent.name} (${dependent.age})`).join(', ')
      : '',
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

async function eventsSummary() {
  const events = await Event.find().lean();
  const totalEvents = events.length;
  const totalRegistrations = events.reduce((sum, evt) => sum + (evt.attendees?.length || 0), 0);
  return { totalEvents, totalRegistrations };
}

async function updateUserEmail({ userId, newEmail }) {
  try {
    const email = newEmail.trim().toLowerCase();
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const existing = await User.findOne({ email });
    if (existing && existing._id.toString() !== userId) throw new AppError('Email already in use', 409);

    user.email = email;
    await user.save();

    return { id: user._id.toString(), email: user.email, name: user.name, role: user.role };
  } catch (err) {
    if (err?.name === 'CastError') throw new AppError('Invalid user id', 400);
    if (err?.code === 11000) throw new AppError('Email already in use', 409);
    throw err;
  }
}

async function deleteUser(userId) {
  try {
    const user = await User.findByIdAndDelete(userId);
    if (!user) throw new AppError('User not found', 404);
    return { message: 'User deleted successfully', id: user._id.toString() };
  } catch (err) {
    if (err?.name === 'CastError') throw new AppError('Invalid user id', 400);
    throw err;
  }
}

module.exports = {
  listUsers,
  attendanceSummary,
  listAttendanceRecords,
  getAttendanceRecord,
  deleteAttendanceRecord,
  exportAttendanceWorkbook,
  eventsSummary,
  updateUserEmail,
  deleteUser,
};
