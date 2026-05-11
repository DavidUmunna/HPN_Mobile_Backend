const { AppError } = require('../utils/errors');
const { findById } = require('../repositories/userRepository');
const { verifyAuthToken } = require('../utils/jwt');

async function requireAuth(req, _res, next) {
  try {
    // Session-based auth
    if (req.session && req.session.userId) return next();

    // Bearer token auth
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const token = header.slice(7);
      const payload = verifyAuthToken(token);
      if (payload?.sub) {
        // Make userId available to all controllers for this request (not persisted to store)
        req.session.userId = payload.sub;
        req.user = { id: payload.sub, role: payload.role };
        return next();
      }
    }

    return next(new AppError('Unauthorized', 401));
  } catch (err) {
    return next(new AppError('Unauthorized', 401));
  }
}

async function requireAdmin(req, _res, next) {
  const userId = req.session?.userId || req.user?.id;
  if (!userId) return next(new AppError('Unauthorized', 401));
  const user = await findById(userId);

  if (!user || user.role !== 'admin') return next(new AppError('Forbidden error', 403));
  req.user = user;
  return next();
}

module.exports = { requireAuth, requireAdmin };
