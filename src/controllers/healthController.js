const { getHealthReport } = require('../services/healthService');
const { renderHealthPage } = require('../views/healthView');

async function healthController(_req, res, next) {
  try {
    const report = await getHealthReport();
    const statusCode = report.status === 'fail' ? 503 : 200;
    res.status(statusCode).type('html').send(renderHealthPage(report));
  } catch (err) {
    next(err);
  }
}

module.exports = { healthController };
