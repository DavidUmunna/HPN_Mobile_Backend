const nodemailer = require('nodemailer');
const { AppError } = require('./errors');
const { logger } = require('./logger');

let transporter;
let verifyPromise;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host) {
    throw new AppError('SMTP host not configured', 500);
  }

  const secure = process.env.SMTP_SECURE === 'false' || port === 587;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS:true,
    auth: user && pass ? { user, pass } : undefined,
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 15000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 10000),
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 20000),
  });

  logger.info('SMTP transporter created', {
    host,
    port,
    secure,
    hasAuth: Boolean(user && pass),
    from: process.env.SMTP_FROM || null,
  });

  return transporter;
}

async function verifyTransporter() {
  const mailer = getTransporter();
  if (verifyPromise) return verifyPromise;

  verifyPromise = mailer
    .verify()
    .then(() => {
      logger.info('SMTP transporter verified successfully', {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
      });
      return true;
    })
    .catch((error) => {
      logger.error('SMTP transporter verification failed', {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        error,
      });
      verifyPromise = null;
      throw error;
    });

  return verifyPromise;
}

async function sendMail({ to, subject, html, text }) {
  const from = process.env.SMTP_FROM ;
  const mailer = getTransporter();
  await verifyTransporter();

  logger.info('Sending email', {
    to,
    from: from || null,
    subject,
  });

  return mailer.sendMail({ from, to, subject, html, text });
}

module.exports = { sendMail, verifyTransporter };
