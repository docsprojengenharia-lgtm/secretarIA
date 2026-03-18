import IORedis from 'ioredis';
import { env } from './env.js';

/**
 * Redis connection — optional.
 * If REDIS_URL is empty, Redis is skipped entirely.
 * If REDIS_URL is set but connection fails, the API continues without queues.
 * BullMQ workers and queues require Redis; without it, WhatsApp queues are disabled.
 */

let redis: IORedis | null = null;
let redisAvailable = false;

const redisUrl = env.REDIS_URL;

if (redisUrl) {
  const instance = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    connectTimeout: 5000,
    retryStrategy(times) {
      if (times > 3) {
        console.warn('[Redis] Max retries reached, giving up reconnect');
        return null;
      }
      return Math.min(times * 1000, 5000);
    },
    lazyConnect: true,
  });

  instance.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
  });

  instance.on('connect', () => {
    console.log('[Redis] Connected');
    redisAvailable = true;
  });

  instance.on('close', () => {
    redisAvailable = false;
  });

  // Try to connect, but don't crash if unavailable
  try {
    await instance.connect();
    redis = instance;
    redisAvailable = true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[Redis] Initial connection failed:', message);
    console.warn('[Redis] Running without Redis — WhatsApp queues disabled');
    redis = null;
    redisAvailable = false;
  }
} else {
  console.log('[Redis] No REDIS_URL configured — running without Redis (WhatsApp queues disabled)');
}

export { redis, redisAvailable };
