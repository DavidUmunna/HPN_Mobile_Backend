const Dependent = require('../models/Dependent');

async function createDependents(userId, dependents) {
  const payload = dependents.map((dependent) => ({
    userId,
    name: dependent.name,
    age: dependent.age,
  }));
  return Dependent.insertMany(payload);
}

async function listDependentsByUser(userId) {
  return Dependent.find({ userId }).sort({ createdAt: 1 }).lean();
}

module.exports = { createDependents, listDependentsByUser };
