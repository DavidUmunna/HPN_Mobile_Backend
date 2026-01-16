const {
  signup,
  login,
  logout,
  getProfile,
  changePassword,
  forgotPassword,
  resetPassword,
} = require('../services/authService');

async function signupController(req, res, next) {
  try {
    const { user, token } = await signup(req.body);
    req.session.userId = user.id;
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
}

async function loginController(req, res, next) {
  try {
    const { user, token } = await login({ ...req.body, session: req.session });
    res.json({ user, token });
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

async function changePasswordController(req, res, next) {
  try {
    const user = await changePassword({ userId: req.session.userId, ...req.body });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function forgotPasswordController(req, res, next) {
  try {
    const result = await forgotPassword(req.body.email);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function resetPasswordController(req, res, next) {
  try {
    const user = await resetPassword(req.body);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signupController,
  loginController,
  logoutController,
  meController,
  changePasswordController,
  forgotPasswordController,
  resetPasswordController,
};
