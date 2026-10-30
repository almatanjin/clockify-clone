import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const globalForRedis = globalThis as unknown as {
  redisClient?: Redis | null;
  redisAvailable?: boolean;
};

function createRedisClient(): Redis | null {
  try {
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) return null; // Stop retrying after 3 attempts
        return Math.min(times * 100, 1000);
      },
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    client.on('error', (err) => {
      // Log only on first error to prevent terminal spam
      if (globalForRedis.redisAvailable !== false) {
        console.warn('[Redis] Connection warning (falling back to PostgreSQL):', err.message);
      }
      globalForRedis.redisAvailable = false;
    });

    client.on('connect', () => {
      globalForRedis.redisAvailable = true;
    });

    return client;
  } catch (error) {
    console.warn('[Redis] Initialization error (falling back to PostgreSQL):', error);
    return null;
  }
}

export const redis = globalForRedis.redisClient ?? createRedisClient();

if (process.env.NODE_ENV !== 'production' && redis) {
  globalForRedis.redisClient = redis;
}

export async function isRedisAvailable(): Promise<boolean> {
  if (!redis) return false;
  if (globalForRedis.redisAvailable === false) return false;
  try {
    if (redis.status === 'wait') {
      await redis.connect();
    }
    const ping = await redis.ping();
    globalForRedis.redisAvailable = ping === 'PONG';
    return globalForRedis.redisAvailable;
  } catch {
    globalForRedis.redisAvailable = false;
    return false;
  }
}
