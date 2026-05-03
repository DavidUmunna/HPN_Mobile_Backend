const { findById } = require('../repositories/userRepository');
const {
  signup,
  login,
  adminLogin,
  logout,
  getProfile,
  updateProfile,
  requestPasswordReset,
  resetPasswordWithToken,
  changePassword,
  buildPasswordResetLink,
} = require('../services/authService');

function getResetPasswordUiUrl() {
  if (process.env.RESET_PASSWORD_URL) return process.env.RESET_PASSWORD_URL;
  if (process.env.CLIENT_RESET_PASSWORD_URL) return process.env.CLIENT_RESET_PASSWORD_URL;
  if (process.env.CLIENT_ORIGIN) return `${process.env.CLIENT_ORIGIN.replace(/\/$/, '')}/reset-password`;
  return null;
}

async function signupController(req, res, next) {
  try {
    const { user, token } = await signup(req.body);
    let preserveAdminSession = false;

    if (req.session?.userId) {
      const sessionUser = await findById(req.session.userId);
      preserveAdminSession = sessionUser?.role === 'admin';
    }

    if (!preserveAdminSession) {
      req.session.userId = user.id;
    }
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

async function adminLoginController(req, res, next) {
  try {
    const user = await adminLogin({ ...req.body, session: req.session });
    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.save((err) => {
      if (err) return next(err);
      res.json({ user });
    });
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

async function updateMeController(req, res, next) {
  try {
    const user = await updateProfile({ userId: req.session.userId, updates: req.body });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function forgotPasswordController(req, res, next) {
  try {
    const resetPageUrl = getResetPasswordUiUrl();

    await requestPasswordReset({ email: req.body.email, resetPageUrl });
    res.json({ message: 'If an account exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
}

async function resetPasswordController(req, res, next) {
  try {
    const user = await resetPasswordWithToken({
      token: req.body.token || req.query.token,
      password: req.body.password,
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function changePasswordController(req, res, next) {
  try {
    const user = await changePassword({
      userId: req.session.userId,
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

function resetPasswordPageController(req, res) {
  const token = req.query.token;
  if (!token) {
    res.status(400).json({ message: 'Reset token is required.' });
    return;
  }

  const resetPasswordUiUrl = getResetPasswordUiUrl();
  if (!resetPasswordUiUrl) {
    res.status(500).json({ message: 'Reset password UI URL not configured.' });
    return;
  }

  res.redirect(302, buildPasswordResetLink(resetPasswordUiUrl, token));
}

module.exports = {
  signupController,
  loginController,
  adminLoginController,
  logoutController,
  meController,
  updateMeController,
  forgotPasswordController,
  resetPasswordController,
  changePasswordController,
  resetPasswordPageController,
};
