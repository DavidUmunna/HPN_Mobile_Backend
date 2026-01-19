const { Expo } = require('expo-server-sdk');
const { deleteTokens, listTokensForUser } = require('../repositories/pushTokenRepository');
const { logger } = require('../utils/logger');

const expo = new Expo(
  process.env.EXPO_ACCESS_TOKEN ? { accessToken: process.env.EXPO_ACCESS_TOKEN } : undefined
);

const INVALID_EXPO_ERRORS = new Set(['DeviceNotRegistered', 'InvalidCredentials']);

function normalizeData(data) {
  if (!data) return undefined;
  return Object.entries(data).reduce((acc, [key, value]) => {
    if (value === undefined || value === null) return acc;
    acc[key] = typeof value === 'string' ? value : JSON.stringify(value);
    return acc;
  }, {});
}

function buildMessages(tokens, { title, body, data }) {
  const payloadData = normalizeData(data);
  return tokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data: payloadData,
  }));
}

async function sendPushToUser(userId, { title, body, data }) {
  const tokens = await listTokensForUser(userId);
  if (!tokens.length) return { delivered: 0, failed: 0 };

  const tokenValues = tokens.map((token) => token.token).filter(Boolean);
  const expoTokens = tokenValues.filter((token) => Expo.isExpoPushToken(token));

  if (!expoTokens.length) {
    logger.warn('No valid Expo push tokens found for user', { userId });
    return { delivered: 0, failed: tokenValues.length };
  }

  const messages = buildMessages(expoTokens, { title, body, data });
  const chunks = expo.chunkPushNotifications(messages);
  let delivered = 0;
  let failed = 0;
  const invalidTokens = [];

  try {
    for (const chunk of chunks) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.forEach((ticket, index) => {
        if (ticket.status === 'ok') {
          delivered += 1;
          return;
        }

        failed += 1;
        const error = ticket.details?.error;
        if (error && INVALID_EXPO_ERRORS.has(error)) {
          invalidTokens.push(chunk[index]?.to);
        }
      });
    }

    if (invalidTokens.length) {
      await deleteTokens(invalidTokens);
    }

    return { delivered, failed };
  } catch (err) {
    logger.error('Failed to send Expo push notification', { err: err.message });
    return { delivered: 0, failed: expoTokens.length };
  }
}

module.exports = { sendPushToUser };
