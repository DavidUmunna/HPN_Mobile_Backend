const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const {
  createUser,
  findByEmail,
  findById,
  findByResetTokenHash,
  setResetToken,
  updatePassword,
} = require('../repositories/userRepository');
const { sendMail } = require('../utils/mailer');
const { AppError } = require('../utils/errors');
const { logger } = require('../utils/logger');
const { signAuthToken } = require('../utils/jwt');

const SALT_ROUNDS = 10;
const RESET_TOKEN_TTL_MINUTES = Number(process.env.RESET_TOKEN_TTL_MINUTES || 60);

function shouldLogPasswordResetLink() {
  return process.env.LOG_PASSWORD_RESET_LINKS === 'true' || process.env.NODE_ENV !== 'production';
}

function buildPasswordResetLink(resetPageUrl, token) {
  if (!resetPageUrl) {
    throw new AppError('Reset password UI URL not configured', 500);
  }

  const normalizedUrl = resetPageUrl.replace(/\/$/, '');
  const separator = normalizedUrl.includes('?') ? '&' : '?';
  return `${normalizedUrl}${separator}token=${encodeURIComponent(token)}`;
}

function toSafeUser(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    phone: user.phone,
    address: user.address,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isOnboarded: user.isOnboarded,
    mustChangePassword: user.mustChangePassword === true,
  };
}

function normalizeProfileUpdates(payload = {}) {
  const updates = {};
  if (typeof payload.name === 'string') updates.name = payload.name;
  if (typeof payload.phone === 'string') updates.phone = payload.phone;
  if (typeof payload.email === 'string') updates.email = payload.email;
  if (typeof payload.address === 'string') updates.address = payload.address;
  if (typeof payload.avatarUrl === 'string') updates.avatarUrl = payload.avatarUrl;

  const onboardingValue =
    typeof payload.isOnboarded === 'boolean'
      ? payload.isOnboarded
      : typeof payload.isonboarded === 'boolean'
      ? payload.isonboarded
      : typeof payload.is_onboarded === 'boolean'
      ? payload.is_onboarded
      : undefined;

  if (onboardingValue !== undefined) updates.isOnboarded = onboardingValue;

  return updates;
}

async function signup({ name, email, password, phone, address, role }) {
  const existing = await findByEmail(email);
  if (existing) throw new AppError('Email already registered', 409);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await createUser({
    name,
    email,
    phone,
    address,
    role: role || 'member',
    passwordHash,
  });
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

async function adminLogin({ email, password, session }) {
  const user = await findByEmail(email);
  if (!user) throw new AppError('Invalid credentials', 401);
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError('Invalid credentials', 401);
  if (user.role !== 'admin') throw new AppError('Forbidden', 403);
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

async function updateProfile({ userId, updates }) {
  let user;
  try {
    user = await findById(userId);
  } catch (err) {
    if (err?.name === 'CastError') throw new AppError('Invalid user id', 400);
    throw err;
  }

  if (!user) throw new AppError('User not found', 404);

  const normalized = normalizeProfileUpdates(updates);
  if (Object.keys(normalized).length === 0) {
    throw new AppError('No valid profile fields provided', 400);
  }

  if (normalized.email !== undefined) {
    const email = normalized.email.trim().toLowerCase();
    if (email && email !== user.email) {
      const existing = await findByEmail(email);
      if (existing && existing._id.toString() !== userId) {
        throw new AppError('Email already in use', 409);
      }
      user.email = email;
    }
  }

  if (normalized.name !== undefined) user.name = normalized.name;
  if (normalized.phone !== undefined) user.phone = normalized.phone;
  if (normalized.address !== undefined) user.address = normalized.address;
  if (normalized.avatarUrl !== undefined) user.avatarUrl = normalized.avatarUrl;
  if (normalized.isOnboarded !== undefined) user.isOnboarded = normalized.isOnboarded;

  try {
    const saved = await user.save();
    return toSafeUser(saved);
  } catch (err) {
    if (err?.name === 'CastError') throw new AppError('Invalid user id', 400);
    if (err?.code === 11000) throw new AppError('Email already in use', 409);
    throw err;
  }
}

async function requestPasswordReset({ email, resetPageUrl }) {
  const user = await findByEmail(email);
  if (!user) return;

  if (!resetPageUrl) throw new AppError('Reset password UI URL not configured', 500);

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await setResetToken(user._id, { tokenHash, expiresAt });

  const resetLink = buildPasswordResetLink(resetPageUrl, rawToken);

  if (shouldLogPasswordResetLink()) {
    logger.info('Generated password reset link', {
      userId: user._id.toString(),
      email: user.email,
      resetLink,
      expiresAt: expiresAt.toISOString(),
    });
  }

  const subject = 'Reset your HPN password';
  const text = `You requested a password reset. Open this link to set a new password: ${resetLink}`;
  const html = `
    <p>You requested a password reset.</p>
    <p><a href="${resetLink}">Click here to set a new password</a></p>
    <p>If you did not request this, you can ignore this email.</p>
  `;

  await sendMail({ to: user.email, subject, text, html });
}

async function resetPasswordWithToken({ token, password }) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await findByResetTokenHash(tokenHash);
  if (!user) throw new AppError('Reset token invalid or expired', 400);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const updated = await updatePassword(user._id, passwordHash);
  return toSafeUser(updated);
}

async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await findById(userId);
  if (!user) throw new AppError('User not found', 404);

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AppError('Current password is incorrect', 400);

  const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
  if (isSamePassword) {
    throw new AppError('New password must be different from your current password', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const updated = await updatePassword(user._id, passwordHash);
  return toSafeUser(updated);
}

module.exports = {
  signup,
  login,
  adminLogin,
  logout,
  getProfile,
  updateProfile,
  requestPasswordReset,
  resetPasswordWithToken,
  changePassword,
  toSafeUser,
  buildPasswordResetLink,
};
