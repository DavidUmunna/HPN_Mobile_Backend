const {
  signup,
  login,
  adminLogin,
  logout,
  getProfile,
  requestPasswordReset,
  resetPasswordWithToken,
} = require('../services/authService');

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

async function adminLoginController(req, res, next) {
  try {
    const user = await adminLogin({ ...req.body, session: req.session });
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

async function forgotPasswordController(req, res, next) {
  try {
    const baseUrl =
      process.env.APP_BASE_URL ||
      process.env.CLIENT_ORIGIN ||
      `${req.protocol}://${req.get('host')}`;

    await requestPasswordReset({ email: req.body.email, baseUrl });
    res.json({ message: 'If an account exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
}

async function resetPasswordController(req, res, next) {
  try {
    const user = await resetPasswordWithToken({
      token: req.body.token,
      password: req.body.password,
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

function resetPasswordPageController(req, res) {
  const token = req.query.token;
  if (!token) {
    res.status(400).send('Reset token is required.');
    return;
  }

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Reset Password</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #0f172a;
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
          }
          .card {
            background: #1e293b;
            padding: 32px 36px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            width: 100%;
            max-width: 420px;
          }
          h1 {
            margin-top: 0;
            font-size: 22px;
          }
          label {
            display: block;
            margin-top: 16px;
            font-size: 14px;
          }
          input {
            width: 100%;
            padding: 10px 12px;
            margin-top: 8px;
            border-radius: 8px;
            border: 1px solid #334155;
            background: #0f172a;
            color: #fff;
          }
          button {
            margin-top: 20px;
            width: 100%;
            padding: 10px 12px;
            border: none;
            border-radius: 8px;
            background: #38bdf8;
            color: #0f172a;
            font-weight: 700;
            cursor: pointer;
          }
          .message {
            margin-top: 16px;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Create a new password</h1>
          <form id="reset-form">
            <label for="password">New password</label>
            <input id="password" type="password" required minlength="8" />
            <label for="confirm">Confirm password</label>
            <input id="confirm" type="password" required minlength="8" />
            <button type="submit">Update password</button>
            <div id="message" class="message"></div>
          </form>
        </div>
        <script>
          const token = ${JSON.stringify(token)};
          const form = document.getElementById('reset-form');
          const message = document.getElementById('message');

          form.addEventListener('submit', async (event) => {
            event.preventDefault();
            message.textContent = '';

            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirm').value;
            if (password !== confirm) {
              message.textContent = 'Passwords do not match.';
              return;
            }

            const response = await fetch('/api/auth/reset-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, password }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
              message.textContent = data.message || 'Unable to reset password.';
              return;
            }

            message.textContent = 'Password updated. You can now log in.';
            form.reset();
          });
        </script>
      </body>
    </html>
  `);
}

module.exports = {
  signupController,
  loginController,
  adminLoginController,
  logoutController,
  meController,
  forgotPasswordController,
  resetPasswordController,
  resetPasswordPageController,
};
