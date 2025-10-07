import { createClient, RedisClientType } from 'redis';
import logger from './logger';

// Create Redis client
const redis: RedisClientType = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: false // Disable reconnect for development
  }
});

let isConnected = false;

// Handle Redis connection events
redis.on('connect', () => {
  logger.info('✅ Redis client connected');
  isConnected = true;
});

redis.on('ready', () => {
  logger.info('✅ Redis client ready');
});

redis.on('error', (err) => {
  if (process.env.NODE_ENV === 'development') {
    // Don't spam logs in development when Redis is not running
    return;
  }
  logger.error('❌ Redis client error:', err);
});

redis.on('end', () => {
  logger.info('📴 Redis client disconnected');
  isConnected = false;
});

// Connect to Redis (optional in development)
(async () => {
  try {
    await redis.connect();
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('Failed to connect to Redis:', error);
    } else {
      logger.warn('Redis not available, running without cache');
    }
  }
})();

// Redis utility functions
export class RedisService {
  static async set(key: string, value: any, ttl?: number): Promise<boolean> {
    if (!isConnected) return false;
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redis.setEx(key, ttl, serialized);
      } else {
        await redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  static async get<T>(key: string): Promise<T | null> {
    if (!isConnected) return null;
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  static async delete(key: string): Promise<boolean> {
    if (!isConnected) return false;
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis DELETE error for key ${key}:`, error);
      return false;
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }
}

export { redis };