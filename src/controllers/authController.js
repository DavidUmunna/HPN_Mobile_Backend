const { signup, login, logout, getProfile } = require('../services/authService');

async function signupController(req, res, next) {
  try {
    const user = await signup(req.body);
    req.session.userId = user.id;
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

async function loginController(req, res, next) {
  try {
    const user = await login({ ...req.body, session: req.session });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function logoutController(req, res, next) {
  try {
    await logout(req.session);
    res.clearCookie(process.env.SESSION_NAME || 'sid');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function meController(req, res, next) {
  try {
    const user = await getProfile(req.session.userId);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { signupController, loginController, logoutController, meController };
