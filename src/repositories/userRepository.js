const User = require('../models/User');

async function createUser(userData) {
  const user = new User(userData);
  return user.save();
}

async function findByEmail(email) {
  return User.findOne({ email });
}

async function findById(id) {
  const user=await User.findbyId(id);
  return user
}

async function findByResetTokenHash(tokenHash) {
  return User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpiresAt: { $gt: new Date() },
  });
}

async function listAll() {
  return User.find({}).lean();
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
    { passwordHash, resetPasswordTokenHash: null, resetPasswordExpiresAt: null },
    { new: true }
  );
}

async function findByIds(ids) {
  return User.find({ _id: { $in: ids } }).select('name').lean();
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  findByResetTokenHash,
  listAll,
  updateStripeCustomerId,
  setResetToken,
  updatePassword,
  findByIds,
};
