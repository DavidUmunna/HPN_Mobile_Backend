const { Resend } = require('resend');
const { AppError } = require('./errors');
const { logger } = require('./logger');

let resendClient;

function getResendClient() {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new AppError('Resend API key not configured', 500);
  }

  resendClient = new Resend(apiKey);

  logger.info('Resend client created', {
    from: process.env.EMAIL_FROM || process.env.RESEND_FROM || null,
  });

  return resendClient;
}

async function sendMail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM;
  if (!from) {
    throw new AppError('Email sender not configured', 500);
  }

  const resend = getResendClient();

  logger.info('Sending email', {
    to,
    from: from || null,
    subject,
  });

  let result;
  try {
    result = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    });
  } catch (err) {
    logger.error('Email send failed', { to, subject, error: err.message });
    throw new AppError('Failed to send email', 502);
  }

  // Resend reports failures in the response instead of throwing
  if (result.error) {
    logger.error('Email rejected by Resend', {
      to,
      subject,
      error: result.error.message,
      name: result.error.name,
    });
    throw new AppError('Failed to send email', 502);
  }

  logger.info('Email sent', { to, subject, id: result.data?.id });

  return result.data;
}

module.exports = { sendMail };
