const { getPrayers, addPrayer, togglePray } = require('../services/prayerService');

async function listPrayersController(req, res, next) {
  try {
    const prayers = await getPrayers({ userId: req.session.userId, category: req.query.category });
    res.json({ prayers });
  } catch (err) {
    next(err);
  }
}

async function createPrayerController(req, res, next) {
  try {
    const prayer = await addPrayer({
      userId: req.session.userId,
      request: req.body.request,
      category: req.body.category,
      authorName: req.body.authorName,
    });
    res.status(201).json({ prayer });
  } catch (err) {
    next(err);
  }
}

async function togglePrayController(req, res, next) {
  try {
    const result = await togglePray({ prayerId: req.params.id, userId: req.session.userId });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { listPrayersController, createPrayerController, togglePrayController };
