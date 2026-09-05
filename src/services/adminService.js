const User = require('../models/User');
const Event = require('../models/Event');
const Attendance = require('../models/Attendance');
const { AppError } = require('../utils/errors');
const XLSX = require('xlsx');
const { buildPagination } = require('../utils/pagination');
const { listAll, listPaginated, listPaginatedFiltered } = require('../repositories/userRepository');
const { now } = require('mongoose');

const NEW_MEMBER_WINDOW_DAYS = 14;

function buildAttendanceDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isNewMemberUser(user) {
  if (!user || typeof user !== 'object' || Array.isArray(user)) return false;
  if (user.role !== 'member') return false;

  const createdAt = normalizeDate(user.createdAt);
  if (!createdAt) return false;

  const windowStart = Date.now() - NEW_MEMBER_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return createdAt.getTime() >= windowStart;
}

function buildAllNewMemberRecords(records) {
  const seenUserIds = new Set();

  return records
    .map(toAttendanceRecord)
    .filter((record) => {
      if (!record.isNewMember || !record.userId || seenUserIds.has(record.userId)) {
        return false;
      }
      seenUserIds.add(record.userId);
      return true;
    });
}

function buildListPagination(list, pgn) {
  return {
    page: pgn.page,
    limit: pgn.limit,
    totalRecords: list.length,
    totalPages: Math.max(Math.ceil(list.length / pgn.limit), 1),
  };
}

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
    firstName: user.firstName,
    lastName: user.lastName,
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
  const registeredAt = normalizeDate(populatedUser?.createdAt);

  return {
    id: record._id.toString(),
    userId: populatedUser?._id?.toString?.() ?? record.userId?.toString(),
    userFirstName: populatedUser?.firstName,
    userLastName: populatedUser?.lastName,
    userName: populatedUser?.name || populatedUser?.email || undefined,
    timestamp: record.timestamp,
    day: record.day,
    location: record.location,
    userRegisteredAt: registeredAt ? registeredAt.toISOString() : undefined,
    isNewMember: isNewMemberUser(populatedUser),
    dependents: Array.isArray(record.dependents)
      ? record.dependents.map((dependent) => ({
          id: dependent.dependentId?.toString(),
          name: dependent.name,
          age: dependent.age,
        }))
      : [],
  };
}

async function listUsers({ page, limit, search, role } = {}) {
  const pagination = buildPagination({ page, limit });
  const { totalRecords, users } = await listPaginatedFiltered({
    skip: pagination.skip,
    limit: pagination.limit,
    search: search?.trim() || undefined,
    role: role || undefined,
  });
  return {
    users: users.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
    })),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      totalRecords,
      totalPages: Math.max(Math.ceil(totalRecords / pagination.limit), 1),
    },
  };
}

async function attendanceSummary({
  recentPage, recentLimit,
  newMembersPage, newMembersLimit,
  attendedPage, attendedLimit,
  absentPage, absentLimit,
} = {}) {
  const recentPgn = buildPagination({ page: recentPage, limit: recentLimit || 5 });
  const newMembersPgn = buildPagination({ page: newMembersPage, limit: newMembersLimit || 5 });
  const attendedPgn = buildPagination({ page: attendedPage, limit: attendedLimit || 20 });
  const absentPgn = buildPagination({ page: absentPage, limit: absentLimit || 20 });

  const windowStart = new Date(Date.now() - NEW_MEMBER_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const todayKey = buildAttendanceDateKey(new Date());

  const [total, recentTotal, latestDocs, newMemberCandidates] = await Promise.all([
    Attendance.countDocuments({ attendanceDateKey: todayKey }),
    Attendance.countDocuments(),
    Attendance.find()
      .populate('userId', 'firstName lastName name email role createdAt')
      .sort({ timestamp: -1 })
      .limit(1)
      .lean(),
    Attendance.find({ timestamp: { $gte: windowStart } })
      .populate('userId', 'firstName lastName name email role createdAt')
      .sort({ timestamp: -1 })
      .lean(),
  ]);

  const recentRecords = await Attendance.find()
    .populate('userId', 'firstName lastName name email role createdAt')
    .sort({ timestamp: -1 })
    .skip(recentPgn.skip)
    .limit(recentPgn.limit)
    .lean();

  const latestRecord = latestDocs[0] || null;

  // Build full new-members list then slice to the requested page
  const allNewMembers = buildAllNewMemberRecords(newMemberCandidates);
  const newMembersData = allNewMembers.slice(newMembersPgn.skip, newMembersPgn.skip + newMembersPgn.limit);

  const eligibleUsers = await User.find({ role: { $in: ['member', 'staff'] } })
    .sort({ firstName: 1, lastName: 1, name: 1, email: 1 })
    .lean();

  const defaultAbsentAll = eligibleUsers.map(toAttendanceAnalyticsUser);

  let analytics = {
    attendanceLabel: null,
    totalEligibleUsers: eligibleUsers.length,
    attendedCount: 0,
    absentCount: eligibleUsers.length,
    attendedUsers: {
      data: [],
      pagination: buildListPagination([], attendedPgn),
    },
    absentUsers: {
      data: defaultAbsentAll.slice(absentPgn.skip, absentPgn.skip + absentPgn.limit),
      pagination: buildListPagination(defaultAbsentAll, absentPgn),
    },
  };

  if (latestRecord?.attendanceDateKey) {
    const recordsForLatestDay = await Attendance.find({ attendanceDateKey: latestRecord.attendanceDateKey })
      .populate('userId', 'firstName lastName name email role')
      .lean();

    const allAttended = recordsForLatestDay
      .map((record) => record.userId)
      .filter((user) => user && typeof user === 'object' && !Array.isArray(user))
      .filter((user) => user.role === 'member' || user.role === 'staff')
      .map(toAttendanceAnalyticsUser);

    const attendedUserIds = new Set(allAttended.map((u) => u.id));
    const allAbsent = eligibleUsers
      .filter((user) => !attendedUserIds.has(user._id.toString()))
      .map(toAttendanceAnalyticsUser);

    analytics = {
      attendanceLabel: buildAttendanceAnalyticsLabel(latestRecord),
      totalEligibleUsers: eligibleUsers.length,
      attendedCount: allAttended.length,
      absentCount: allAbsent.length,
      attendedUsers: {
        data: allAttended.slice(attendedPgn.skip, attendedPgn.skip + attendedPgn.limit),
        pagination: buildListPagination(allAttended, attendedPgn),
      },
      absentUsers: {
        data: allAbsent.slice(absentPgn.skip, absentPgn.skip + absentPgn.limit),
        pagination: buildListPagination(allAbsent, absentPgn),
      },
    };
  }

  return {
    totalCheckIns: total,
    recent: {
      data: recentRecords.map(toAttendanceRecord),
      pagination: {
        page: recentPgn.page,
        limit: recentPgn.limit,
        totalRecords: recentTotal,
        totalPages: Math.max(Math.ceil(recentTotal / recentPgn.limit), 1),
      },
    },
    newMembers: {
      data: newMembersData,
      pagination: buildListPagination(allNewMembers, newMembersPgn),
    },
    analytics,
  };
}

async function listAttendanceRecords({ page, limit, date, from, to } = {}) {
  const pagination = buildPagination({ page, limit });

  const filter = {};
  if (date) {
    // Range over the full UTC calendar day so every document matches regardless
    // of whether it has attendanceDateKey (old docs may not have that field).
    const start = new Date(`${String(date).trim()}T00:00:00.000Z`);
    const end = new Date(`${String(date).trim()}T23:59:59.999Z`);
    if (!Number.isNaN(start.getTime())) {
      filter.timestamp = { $gte: start, $lte: end };
    }
  } else if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setUTCHours(23, 59, 59, 999);
      filter.timestamp.$lte = toDate;
    }
  }

  const [totalRecords, records] = await Promise.all([
    Attendance.countDocuments(filter),
    Attendance.find(filter)
      .populate('userId', 'firstName lastName name email role createdAt')
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
    const record = await Attendance.findById(attendanceId)
      .populate('userId', 'firstName lastName name email role createdAt')
      .lean();
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
  const records = await Attendance.find().populate('userId', 'firstName lastName name').sort({ timestamp: -1 }).lean();
  const rows = records.map((record) => {
    const user = record.userId && typeof record.userId === 'object' && !Array.isArray(record.userId)
      ? record.userId
      : null;
    const firstName = user?.firstName || '';
    const lastName = user?.lastName || '';
    const displayName = user?.name || [firstName, lastName].filter(Boolean).join(' ') || '';

    const AUTO_CHECKOUT_MS = 3.5 * 60 * 60 * 1000;
    const checkInTime = record.timestamp instanceof Date ? record.timestamp : new Date(record.timestamp);
    const autoCheckout = new Date(checkInTime.getTime() + AUTO_CHECKOUT_MS);
    const checkedOutAt = record.checkedOutAt
      ? (record.checkedOutAt instanceof Date ? record.checkedOutAt.toISOString() : record.checkedOutAt)
      : (new Date() >= autoCheckout ? autoCheckout.toISOString() : '');

    return {
      id: record._id.toString(),
      userId: user?._id?.toString() || record.userId?.toString() || '',
      name: displayName,
      checkIn: checkInTime.toISOString(),
      checkOut: checkedOutAt,
      day: record.day || '',
      dependentsCount: Array.isArray(record.dependents) ? record.dependents.length : 0,
      dependents: Array.isArray(record.dependents)
        ? record.dependents.map((dependent) => `${dependent.name} (${dependent.age})`).join(', ')
        : '',
    };
  });

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

    return { id: user._id.toString(), email: user.email, firstName: user.firstName, lastName: user.lastName, name: user.name, role: user.role };
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

async function deleteEvent(eventId) {
  try {
    const event = await Event.findByIdAndDelete(eventId).lean();
    if (!event) throw new AppError('Event not found', 404);
    return { deleted: true, id: event._id.toString() };
  } catch (err) {
    if (err?.name === 'CastError') throw new AppError('Invalid event id', 400);
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
  deleteEvent,
};
