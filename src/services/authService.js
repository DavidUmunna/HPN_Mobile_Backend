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

async function requestPasswordReset({ email, baseUrl }) {
  const user = await findByEmail(email);
  if (!user) return;

  if (!baseUrl) {
    throw new AppError('Reset base URL not configured', 500);
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await setResetToken(user._id, { tokenHash, expiresAt });

  const trimmedBaseUrl = baseUrl.replace(/\/$/, '');
  const resetLink = `${trimmedBaseUrl}/api/auth/reset-password?token=${rawToken}`;

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

module.exports = {
  signup,
  login,
  adminLogin,
  logout,
  getProfile,
  requestPasswordReset,
  resetPasswordWithToken,
  toSafeUser,
};
