import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: No valid token provided', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.headers['x-request-id']
      });
      
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication token required'
        },
        metadata: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      logger.error('JWT_SECRET environment variable not configured');
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_CONFIGURATION_ERROR',
          message: 'Server authentication configuration error'
        }
      });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    
    if (!decoded || !decoded.id || !decoded.email) {
      logger.warn('Authentication failed: Invalid token structure', {
        ip: req.ip,
        tokenPresent: !!token,
        decodedPresent: !!decoded
      });
      
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token'
        }
      });
      return;
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'user'
    };

    logger.debug('User authenticated successfully', {
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      ip: req.ip
    });

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired'
        }
      });
    } else if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication processing error'
        }
      });
    }
  }
};

export const optionalAuthMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No auth provided - continue without user context
    next();
    return;
  }

  // Auth provided - validate it
  authMiddleware(req, res, next);
};