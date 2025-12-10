const bcrypt = require('bcryptjs');
const { createUser, findByEmail, findById } = require('../repositories/userRepository');
const { AppError } = require('../utils/errors');

const SALT_ROUNDS = 10;

function toSafeUser(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
  };
}

async function signup({ name, email, password, phone, role }) {
  const existing = await findByEmail(email);
  if (existing) throw new AppError('Email already registered', 409);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await createUser({ name, email, phone, role: role || 'member', passwordHash });
  return toSafeUser(user);
}

async function login({ email, password, session }) {
  const user = await findByEmail(email);
  if (!user) throw new AppError('Invalid credentials', 401);
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('Invalid credentials', 401);
  session.userId = user._id.toString();
  return toSafeUser(user);
}

async function logout(session) {
  return new Promise((resolve, reject) => {
    session.destroy((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function getProfile(userId) {
  const user = await findById(userId);
  if (!user) throw new AppError('User not found', 404);
  return toSafeUser(user);
}

module.exports = { signup, login, logout, getProfile, toSafeUser };
