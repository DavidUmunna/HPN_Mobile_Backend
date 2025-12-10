async function healthController(_req, res) {
  res.json({ status: 'ok', time: new Date().toISOString() });
}

module.exports = { healthController };
