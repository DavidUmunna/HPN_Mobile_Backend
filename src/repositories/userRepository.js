const mongoose = require('mongoose');
const User = require('../models/User');

async function createUser(userData) {
  const user = new User(userData);
  return user.save();
}

async function findByEmail(email) {
  return User.findOne({ email });
}

async function findById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const user = await User.findById(new mongoose.Types.ObjectId(id));
  return user;
}

async function findByResetTokenHash(tokenHash) {
  return User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpiresAt: { $gt: new Date() },
  });
}

async function listAll() {
  return User.find({}).sort({ createdAt: -1 }).lean();
}

async function listPaginated({ skip, limit }) {
  const [totalRecords, users] = await Promise.all([
    User.countDocuments(),
    User.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);
  return { totalRecords, users };
}

async function listUserIds() {
  return User.find({}).select('_id').lean();
}

async function updateStripeCustomerId(userId, stripeCustomerId) {
  return User.findByIdAndUpdate(userId, { stripeCustomerId }, { new: true });
}

async function setResetToken(userId, { tokenHash, expiresAt }) {
  return User.findByIdAndUpdate(
    userId,
    { resetPasswordTokenHash: tokenHash, resetPasswordExpiresAt: expiresAt },
    { new: true }
  );
}

async function updatePassword(userId, passwordHash) {
  return User.findByIdAndUpdate(
    userId,
    {
      passwordHash,
      mustChangePassword: false,
      resetPasswordTokenHash: null,
      resetPasswordExpiresAt: null,
    },
    { new: true }
  );
}

async function findByIds(ids) {
  return User.find({ _id: { $in: ids } }).select('firstName lastName name').lean();
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  findByResetTokenHash,
  listAll,
  listPaginated,
  listUserIds,
  updateStripeCustomerId,
  setResetToken,
  updatePassword,
  findByIds,
};
