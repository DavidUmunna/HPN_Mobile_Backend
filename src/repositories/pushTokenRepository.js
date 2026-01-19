const PushToken = require('../models/PushToken');

async function upsertToken({ userId, token, platform }) {
  return PushToken.findOneAndUpdate(
    { userId, token },
    { platform, enabled: true, lastSeenAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
}

async function listTokensForUser(userId) {
  return PushToken.find({ userId, enabled: true }).lean();
}

async function disableToken({ userId, token }) {
  return PushToken.findOneAndUpdate({ userId, token }, { enabled: false }, { new: true }).lean();
}

async function deleteTokens(tokens) {
  if (!tokens.length) return 0;
  const result = await PushToken.deleteMany({ token: { $in: tokens } });
  return result.deletedCount || 0;
}

module.exports = {
  upsertToken,
  listTokensForUser,
  disableToken,
  deleteTokens,
};
