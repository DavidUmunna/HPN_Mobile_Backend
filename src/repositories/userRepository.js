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

module.exports = { createUser, findByEmail, findById, listAll };
