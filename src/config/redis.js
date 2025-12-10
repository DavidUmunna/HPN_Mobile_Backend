const { createClient } = require('redis');
const { logger } = require('../utils/logger');

let redisClient;

async function connectRedis() {
  if (redisClient && redisClient.isOpen) return redisClient;
  const url = process.env.REDIS_URL;
  if (!url) {
    logger.warn('REDIS_URL not set, skipping Redis connection (sessions may fail)');
    return null;
  }

  redisClient = createClient({ url });
  redisClient.on('error', (err) => logger.error('Redis error', { error: err }));
  redisClient.on('connect', () => logger.info('Redis client connected'));
  redisClient.on('reconnecting', () => logger.warn('Redis reconnecting'));

  await redisClient.connect();
  return redisClient;
}

function getRedisClient() {
  if (!redisClient || !redisClient.isOpen) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
}

module.exports = { connectRedis, getRedisClient };
