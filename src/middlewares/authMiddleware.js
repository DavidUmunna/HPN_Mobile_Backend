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
        req.session = req.session || {};
        req.session.userId = payload.sub; // allow downstream reuse
        return next();
      }
    }

    return next(new AppError('Unauthorized', 401));
  } catch (err) {
    return next(new AppError('Unauthorized', 401));
  }
}

async function requireAdmin(req, _res, next) {
  if (!req.session || !req.session.userId) return next(new AppError('Unauthorized', 401));
  const userId = req.session.userId;
  const user = await findById(userId);
 
  if (!user || user.role !== 'admin') return next(new AppError('Forbidden error', 403));
  req.user = user;
  return next();
}

module.exports = { requireAuth, requireAdmin };
