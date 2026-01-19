const { upsertToken, disableToken } = require('../repositories/pushTokenRepository');
const { AppError } = require('../utils/errors');

function toPushTokenResponse(token) {
  return {
    id: token._id.toString(),
    token: token.token,
    platform: token.platform,
    enabled: token.enabled,
    lastSeenAt: token.lastSeenAt,
  };
}

async function registerPushToken(userId, payload) {
  const token = await upsertToken({ userId, token: payload.token, platform: payload.platform });
  return toPushTokenResponse(token);
}

async function unregisterPushToken(userId, tokenValue) {
  const token = await disableToken({ userId, token: tokenValue });
  if (!token) throw new AppError('Push token not found', 404);
  return toPushTokenResponse(token);
}

module.exports = { registerPushToken, unregisterPushToken };
