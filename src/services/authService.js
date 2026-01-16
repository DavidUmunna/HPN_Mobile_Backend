const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { createUser, findByEmail, findById } = require('../repositories/userRepository');
const { createToken, findValidToken, markTokenUsed, deleteTokensForUser } = require('../repositories/passwordResetTokenRepository');
const { AppError } = require('../utils/errors');
const { logger } = require('../utils/logger');
const { signAuthToken } = require('../utils/jwt');

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MINUTES = Number(process.env.RESET_TOKEN_TTL_MINUTES || 60);

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
  return { user: toSafeUser(user), token: signAuthToken(user) };
}

async function login({ email, password, session }) {
  const user = await findByEmail(email);
  if (!user) throw new AppError('Invalid credentials', 401);
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('Invalid credentials', 401);
  session.userId = user._id.toString();
  return { user: toSafeUser(user), token: signAuthToken(user) };
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

async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await findById(userId);
  if (!user) throw new AppError('User not found', 404);
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AppError('Invalid current password', 400);
  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();
  return toSafeUser(user);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function forgotPassword(email) {
  const user = await findByEmail(email);
  if (!user) {
    logger.info('Password reset requested for unknown email', { email });
    return { sent: true };
  }

  await deleteTokensForUser(user._id);

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await createToken({ userId: user._id, tokenHash, expiresAt });

  const baseUrl = (process.env.APP_URL || process.env.CLIENT_ORIGIN || 'http://localhost:4000').replace(/\/$/, '');
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  logger.info('Password reset link generated', { email: user.email, resetUrl, expiresAt });

  return { sent: true };
}

async function resetPassword({ token, newPassword }) {
  const tokenHash = hashToken(token);
  const resetToken = await findValidToken(tokenHash);
  if (!resetToken) throw new AppError('Invalid or expired reset token', 400);

  const user = await findById(resetToken.user);
  if (!user) throw new AppError('User not found', 404);

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();

  await markTokenUsed(resetToken._id);
  await deleteTokensForUser(user._id);

  return toSafeUser(user);
}

module.exports = {
  signup,
  login,
  logout,
  getProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  toSafeUser,
};
