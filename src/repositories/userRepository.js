const User = require('../models/User');

async function createUser(userData) {
  const user = new User(userData);
  return user.save();
}

async function findByEmail(email) {
  return User.findOne({ email });
}

async function findById(id) {
  return User.findById(id);
}

async function listAll() {
  return User.find({}).lean();
}

async function updateStripeCustomerId(userId, stripeCustomerId) {
  return User.findByIdAndUpdate(userId, { stripeCustomerId }, { new: true });
}

async function findByIds(ids) {
  return User.find({ _id: { $in: ids } }).select('name').lean();
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  listAll,
  updateStripeCustomerId,
  findByIds,
};
