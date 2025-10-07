import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { errorHandler, notFound } from './middleware/errorMiddleware';
import { requestLogger } from './middleware/loggerMiddleware';
import { prisma } from './utils/database';
import { redis } from './utils/redis';
import logger from './utils/logger';

// Route imports
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import cartRoutes from './routes/cart.routes';
import orderRoutes from './routes/order.routes';
import paymentRoutes from './routes/payment.routes';
import adminRoutes from './routes/admin.routes';
import userRoutes from './routes/user.routes';
import reviewRoutes from './routes/review.routes';
import wishlistRoutes from './routes/wishlist.routes';

// Load environment variables
dotenv.config();

class Server {
  public app: Application;
  private PORT: number;

  constructor() {
    this.app = express();
    this.PORT = parseInt(process.env.PORT || '3001', 10);
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));

    // CORS configuration
    this.app.use(cors({
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        process.env.ADMIN_URL || 'http://localhost:3001'
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    });

    this.app.use('/api/', limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(cookieParser());

    // Logging middleware
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    }
    this.app.use(requestLogger);

    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
      });
    });

    // API info endpoint
    this.app.get('/api', (req: Request, res: Response) => {
      res.status(200).json({
        name: 'AutomateStore API',
        version: process.env.API_VERSION || 'v1',
        description: 'Advanced E-Commerce Backend for Comprehensive Testing',
        documentation: '/api/docs',
        endpoints: {
          auth: '/api/v1/auth',
          products: '/api/v1/products',
          cart: '/api/v1/cart',
          orders: '/api/v1/orders',
          payments: '/api/v1/payments',
          admin: '/api/v1/admin',
          users: '/api/v1/users',
          reviews: '/api/v1/reviews',
          wishlist: '/api/v1/wishlist',
        },
      });
    });
  }

  private initializeRoutes(): void {
    const apiVersion = process.env.API_VERSION || 'v1';
    const baseRoute = `/api/${apiVersion}`;

    // API Routes
    this.app.use(`${baseRoute}/auth`, authRoutes);
    this.app.use(`${baseRoute}/products`, productRoutes);
    this.app.use(`${baseRoute}/cart`, cartRoutes);
    this.app.use(`${baseRoute}/orders`, orderRoutes);
    this.app.use(`${baseRoute}/payments`, paymentRoutes);
    this.app.use(`${baseRoute}/admin`, adminRoutes);
    this.app.use(`${baseRoute}/users`, userRoutes);
    this.app.use(`${baseRoute}/reviews`, reviewRoutes);
    this.app.use(`${baseRoute}/wishlist`, wishlistRoutes);
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFound);

    // Global error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Test database connection
      await prisma.$connect();
      logger.info('✅ Connected to PostgreSQL database');

      // Test Redis connection (optional)
      if (process.env.NODE_ENV === 'production') {
        try {
          await redis.ping();
          logger.info('✅ Connected to Redis cache');
        } catch (error) {
          logger.warn('⚠️  Redis connection failed, running without cache');
        }
      } else {
        logger.info('⚠️  Redis skipped in development mode');
      }

      // Start the server
      this.app.listen(this.PORT, () => {
        logger.info(`🚀 AutomateStore API Server started successfully`);
        logger.info(`📡 Server running on port ${this.PORT}`);
        logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`📋 API Documentation: http://localhost:${this.PORT}/api`);
        logger.info(`🏥 Health Check: http://localhost:${this.PORT}/health`);
      });

    } catch (error) {
      logger.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    try {
      await prisma.$disconnect();
      await redis.quit();
      logger.info('✅ Server stopped gracefully');
    } catch (error) {
      logger.error('❌ Error stopping server:', error);
    }
  }
}

// Handle graceful shutdown
const server = new Server();

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await server.stop();
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

export default server;

// Start the server if this file is run directly
if (require.main === module) {
  server.start();
}