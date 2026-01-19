const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

let firebaseAdmin = null;

function parseServiceAccount(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    logger.error('Invalid Firebase service account JSON', { err: err.message });
    return null;
  }
}

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    return parseServiceAccount(decoded);
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
      const absolutePath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      const raw = fs.readFileSync(absolutePath, 'utf8');
      return parseServiceAccount(raw);
    } catch (err) {
      logger.error('Unable to read Firebase service account file', { err: err.message });
    }
  }

  return null;
}

function getFirebaseAdmin() {
  if (firebaseAdmin) return firebaseAdmin;
  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) return null;

  // Lazy-load to avoid dependency overhead when not configured.
  // eslint-disable-next-line global-require
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }

  firebaseAdmin = admin;
  return firebaseAdmin;
}

module.exports = { getFirebaseAdmin };
