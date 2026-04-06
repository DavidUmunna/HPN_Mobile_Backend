const { getSupportDirectory, updateSupportDirectory } = require('../services/supportService');

async function getSupportDirectoryController(_req, res, next) {
  try {
    const support = await getSupportDirectory();
    res.json({ support });
  } catch (err) {
    next(err);
  }
}

async function updateSupportDirectoryController(req, res, next) {
  try {
    const support = await updateSupportDirectory(req.body);
    res.json({ support });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSupportDirectoryController,
  updateSupportDirectoryController,
};