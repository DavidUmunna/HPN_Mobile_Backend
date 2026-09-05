const { logger } = require('../utils/logger');

// The SMS Works issues one long-lived JWT from its dashboard (no separate
// token/auth call, no SDK needed — plain REST over Node's built-in fetch).
// https://thesmsworks.co.uk/developers
const API_URL = 'https://api.thesmsworks.co.uk/v1/message/send';
const apiKey = process.env.SMS_WORKS_API_KEY;
const senderId = process.env.SMS_WORKS_SENDER;

if (!apiKey) {
  logger.warn('SMS_WORKS_API_KEY is not set — SMS sending is disabled until it is configured.');
}

function isSmsConfigured() {
  return Boolean(apiKey && senderId);
}

// Never log a full phone number — only enough to spot which recipient failed.
function maskPhone(phone) {
  if (!phone) return 'unknown';
  const digits = phone.replace(/\D/g, '');
  return digits.length > 4 ? `***${digits.slice(-4)}` : '***';
}

// The SMS Works accepts UK numbers as 07... or international as 447...;
// normalize a leading 0 to the 44 country code and strip formatting.
function normalizeUkNumber(phone) {
  const digits = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
  return digits.startsWith('0') ? `44${digits.slice(1)}` : digits;
}

async function sendSms(to, body) {
  if (!isSmsConfigured()) {
    return { success: false, error: 'SMS is not configured' };
  }
  if (!to) {
    return { success: false, error: 'Missing phone number' };
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: apiKey },
      body: JSON.stringify({ sender: senderId, destination: normalizeUkNumber(to), content: body }),
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const reason = data?.message || data?.error || `Request failed (${response.status})`;
      logger.warn('SMS delivery failed', { to: maskPhone(to), err: reason });
      return { success: false, error: reason };
    }

    return { success: true, sid: data?.messageid };
  } catch (err) {
    logger.warn('SMS delivery failed', { to: maskPhone(to), err: err.message });
    return { success: false, error: err.message };
  }
}

// recipients: [{ id, phone }]; buildBody: (recipient) => string
async function sendBulkSms(recipients, buildBody) {
  const result = { delivered: 0, failed: 0, failures: [] };

  if (!isSmsConfigured()) {
    result.failed = recipients.length;
    result.failures = recipients.map((r) => ({ userId: r.id, reason: 'SMS is not configured' }));
    return result;
  }

  for (const recipient of recipients) {
    if (!recipient.phone) {
      result.failed += 1;
      result.failures.push({ userId: recipient.id, reason: 'No phone number on file' });
      continue;
    }

    const outcome = await sendSms(recipient.phone, buildBody(recipient));
    if (outcome.success) {
      result.delivered += 1;
    } else {
      result.failed += 1;
      result.failures.push({ userId: recipient.id, reason: outcome.error });
    }
  }

  return result;
}

module.exports = { isSmsConfigured, sendSms, sendBulkSms };
