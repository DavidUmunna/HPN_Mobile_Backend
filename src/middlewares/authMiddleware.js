const { AppError } = require('../utils/errors');
const { findById } = require('../repositories/userRepository');

function requireAuth(req, _res, next) {
  if (req.session && req.session.userId) return next();
  next(new AppError('Unauthorized', 401));
}

async function requireAdmin(req, _res, next) {
  if (!req.session || !req.session.userId) return next(new AppError('Unauthorized', 401));
  const user = await findById(req.session.userId);
  if (!user || user.role !== 'admin') return next(new AppError('Forbidden', 403));
  req.user = user;
  return next();
}

module.exports = { requireAuth, requireAdmin };
