const User = require('../models/User');
const Event = require('../models/Event');
const Attendance = require('../models/Attendance');
const { AppError } = require('../utils/errors');

async function listUsers() {
  const users = await User.find({}, 'email name role createdAt').sort({ createdAt: -1 }).lean();
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
  const latest = await Attendance.find({}).sort({ timestamp: -1 }).limit(5).lean();
  return {
    totalCheckIns: total,
    recent: latest.map((r) => ({
      id: r._id.toString(),
      userId: r.userId?.toString(),
      timestamp: r.timestamp,
      location: r.location,
    })),
  };
}

async function eventsSummary() {
  const events = await Event.find({}).lean();
  const totalEvents = events.length;
  const totalRegistrations = events.reduce((sum, evt) => sum + (evt.attendees?.length || 0), 0);
  return { totalEvents, totalRegistrations };
}

async function updateUserEmail({ userId, newEmail }) {
  const email = newEmail.trim().toLowerCase();
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  const existing = await User.findOne({ email });
  if (existing && existing._id.toString() !== userId) throw new AppError('Email already in use', 409);

  user.email = email;
  await user.save();

  return { id: user._id.toString(), email: user.email, name: user.name, role: user.role };
}

module.exports = { listUsers, attendanceSummary, eventsSummary, updateUserEmail };
