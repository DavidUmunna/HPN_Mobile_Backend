const session = require('express-session');
const { RedisStore } = require('connect-redis');
const { getRedisClient } = require('./redis');

function sessionConfig(store) {
  const ttlSeconds = Number(process.env.SESSION_TTL_SECONDS || 60 * 60 * 24 * 7);

  return {
    name: process.env.SESSION_NAME || 'sid',
    secret: process.env.SESSION_SECRET || 'change-me',
    resave: false,
    saveUninitialized: false,
    store,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: ttlSeconds * 1000,
    },
  };
}

function buildStore() {
  const useMemory = process.env.NODE_ENV === 'test' || process.env.USE_MEMORY_SESSION === 'true' || !process.env.REDIS_URL;
  if (useMemory) {
    return new session.MemoryStore();
  }
  const client = getRedisClient();
  return new RedisStore({ client, prefix: 'sess:' });
}

const sessionStore = buildStore();

module.exports = { sessionConfig, sessionStore };
