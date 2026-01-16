const PasswordResetToken = require('../models/PasswordResetToken');

async function deleteTokensForUser(userId) {
  return PasswordResetToken.deleteMany({ user: userId });
}

async function createToken({ userId, tokenHash, expiresAt }) {
  return PasswordResetToken.create({ user: userId, tokenHash, expiresAt });
}

async function findValidToken(tokenHash) {
  return PasswordResetToken.findOne({
    tokenHash,
    used: false,
    expiresAt: { $gt: new Date() },
  });
}

async function markTokenUsed(id) {
  return PasswordResetToken.findByIdAndUpdate(id, { used: true });
}

module.exports = { createToken, findValidToken, markTokenUsed, deleteTokensForUser };
