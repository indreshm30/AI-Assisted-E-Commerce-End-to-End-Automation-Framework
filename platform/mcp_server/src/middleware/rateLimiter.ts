import { RateLimiterMemory } from 'rate-limiter-flexible';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

const rateLimiter = new RateLimiterMemory({
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900', 10), // 15 minutes in seconds
  blockDuration: 60, // Block for 1 minute if limit exceeded
});

export const rateLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    await rateLimiter.consume(key);
    next();
  } catch (rejRes: any) {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    logger.warn(`Rate limit exceeded for IP: ${key}`, {
      remainingPoints: rejRes.remainingPoints,
      msBeforeNext: rejRes.msBeforeNext,
      totalHits: rejRes.totalHits
    });

    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        retryAfter: Math.round(rejRes.msBeforeNext / 1000)
      },
      metadata: {
        timestamp: new Date(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
};