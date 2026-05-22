const { logger } = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  if (err.name === 'CastError' && err.path === '_id') {
    return res.status(404).json({ message: 'Not found' });
  }

  const status = err.statusCode || 500;
  const payload = { message: err.message || 'Internal Server Error' };
  if (err.details) payload.details = err.details;

  logger.error('Request error', { status, error: err, path: req.path });

  res.status(status).json(payload);
}

module.exports = { errorHandler };
