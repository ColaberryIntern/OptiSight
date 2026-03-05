const Redis = require('ioredis');
const logger = require('./logger');

let client = null;
let isConnected = false;

function getRedisClient() {
  if (client) return client;

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  client = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: false,
  });

  client.on('connect', () => {
    isConnected = true;
    logger.info('Redis connected');
  });

  client.on('error', (err) => {
    isConnected = false;
    logger.warn(`Redis connection error: ${err.message}`);
  });

  client.on('close', () => {
    isConnected = false;
  });

  return client;
}

async function getCache(key) {
  try {
    const redis = getRedisClient();
    if (!isConnected) return null;
    const data = await redis.get(key);
    if (data === null) return null;
    return JSON.parse(data);
  } catch (err) {
    logger.warn(`Cache get error for key "${key}": ${err.message}`);
    return null;
  }
}

async function setCache(key, value, ttlSeconds = 300) {
  try {
    const redis = getRedisClient();
    if (!isConnected) return;
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await redis.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await redis.set(key, serialized);
    }
  } catch (err) {
    logger.warn(`Cache set error for key "${key}": ${err.message}`);
  }
}

async function deleteCache(key) {
  try {
    const redis = getRedisClient();
    if (!isConnected) return;
    await redis.del(key);
  } catch (err) {
    logger.warn(`Cache delete error for key "${key}": ${err.message}`);
  }
}

async function deleteCachePattern(pattern) {
  try {
    const redis = getRedisClient();
    if (!isConnected) return;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    logger.warn(`Cache delete pattern error for "${pattern}": ${err.message}`);
  }
}

module.exports = {
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  getRedisClient,
};
