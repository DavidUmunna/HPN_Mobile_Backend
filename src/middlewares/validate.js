const { AppError } = require('../utils/errors');

function validate(schema) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(
      { body: req.body, params: req.params, query: req.query },
      { abortEarly: false, allowUnknown: true }
    );
    if (error) return next(new AppError('Validation failed', 400, error.details));
    req.body = value.body;
    req.params = value.params;
    req.query = value.query;
    return next();
  };
}

module.exports = { validate };
