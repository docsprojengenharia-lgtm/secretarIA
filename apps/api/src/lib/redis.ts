import IORedis from 'ioredis';
import { env } from './env.js';

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    if (times > 3) {
      console.warn('[Redis] Max retries reached, giving up reconnect');
      return null; // stop retrying
    }
    return Math.min(times * 1000, 5000);
  },
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

// Try to connect, but don't crash if unavailable
redis.connect().catch((err) => {
  console.warn('[Redis] Initial connection failed:', err.message);
  console.warn('[Redis] BullMQ workers will not function without Redis');
});
