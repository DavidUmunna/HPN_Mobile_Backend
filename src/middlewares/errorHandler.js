const { logger } = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  const status = err.statusCode || 500;
  const payload = { message: err.message || 'Internal Server Error' };
  if (err.details) payload.details = err.details;

  logger.error('Request error', { status, error: err, path: req.path });

  if (status >= 500) payload.message = 'Something went wrong';
  res.status(status).json(payload);
}

module.exports = { errorHandler };
