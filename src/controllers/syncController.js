const { syncData } = require('../services/syncService');

async function syncController(req, res, next) {
  try {
    const { items } = req.body;
    const result = await syncData({ userId: req.session.userId, items });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { syncController };
