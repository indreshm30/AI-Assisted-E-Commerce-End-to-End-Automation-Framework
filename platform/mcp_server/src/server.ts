import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();
import { config, validateConfig } from './utils/config';
import { dbManager } from './utils/database';
import { errorHandler } from './middleware/errorHandler';
import { rateLimitMiddleware } from './middleware/rateLimiter';
import { authMiddleware, optionalAuthMiddleware, AuthenticatedRequest } from './middleware/auth';
import { validate, commonSchemas } from './middleware/validation';
import { AIService } from './services/AIService';
import { TestGenerationService } from './services/TestGenerationService';
import { BusinessRuleService } from './services/BusinessRuleService';
import { AnalyticsService } from './services/AnalyticsService';

// Types and interfaces
export interface WebSocketMessage {
  type: 'test-generation' | 'business-rule-validation' | 'status-update' | 'analytics-query';
  payload: any;
  requestId: string;
  userId?: string;
}

class MCPServer {
  private app: express.Application;
  private server: any;
  private io: Server;
  private aiService: AIService;
  private testGenerationService: TestGenerationService;
  private businessRuleService: BusinessRuleService;
  private analyticsService: AnalyticsService;
  
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: config.server.cors.origin,
        credentials: config.server.cors.credentials
      },
      pingTimeout: config.websocket.pingTimeout,
      pingInterval: config.websocket.pingInterval
    });
    
    // Initialize services
    this.aiService = new AIService();
    this.testGenerationService = new TestGenerationService(this.aiService);
    this.businessRuleService = new BusinessRuleService(this.aiService);
    this.analyticsService = new AnalyticsService();
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeWebSocket();
  }

  private initializeMiddleware(): void {
    // Basic middleware
    this.app.use(cors({
      origin: config.server.cors.origin,
      credentials: config.server.cors.credentials
    }));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Security middleware
    this.app.use(rateLimitMiddleware);
    
    // Request logging middleware
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.headers['x-request-id']
      });
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      const dbHealthy = await dbManager.healthCheck();
      
      res.json({
        status: dbHealthy ? 'healthy' : 'degraded',
        timestamp: new Date(),
        version: '1.0.0',
        services: {
          database: dbHealthy,
          ai: true,
          websocket: true
        },
        config: {
          environment: config.server.environment,
          port: config.server.port
        }
      });
    });

    // Test Generation endpoints
    this.app.post('/api/generate-test', 
      authMiddleware, 
      validate({ body: commonSchemas.testGenerationRequest }),
      async (req: AuthenticatedRequest, res) => {
        try {
          const testRequest = {
            ...req.body,
            userId: req.user!.id
          };
          
          const result = await this.testGenerationService.generateTest(testRequest);
          
          // Record analytics metric
          await this.analyticsService.recordMetric({
            metricType: 'test_generation_request',
            metricValue: 1,
            dimensions: {
              testType: testRequest.testType,
              success: result.success,
              aiModel: result.metadata.aiModel
            },
            userId: req.user!.id
          });
          
          res.json(result);
        } catch (error) {
          logger.error('Test generation API error:', error);
          res.status(500).json({
            success: false,
            error: 'Internal server error'
          });
        }
      }
    );

    this.app.get('/api/tests',
      authMiddleware,
      async (req: AuthenticatedRequest, res) => {
        try {
          const filters = {
            testType: req.query.testType as string,
            status: req.query.status as string,
            limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
            offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0
          };
          
          const result = await this.testGenerationService.getTestHistory(req.user!.id, filters);
          res.json(result);
        } catch (error) {
          logger.error('Get test history API error:', error);
          res.status(500).json({
            success: false,
            error: 'Internal server error'
          });
        }
      }
    );

    this.app.get('/api/tests/:testId',
      authMiddleware,
      async (req: AuthenticatedRequest, res) => {
        try {
          if (!req.params.testId) {
            res.status(400).json({ success: false, error: 'Test ID required' });
            return;
          }
          const result = await this.testGenerationService.getTestById(req.params.testId, req.user!.id);
          res.json(result);
        } catch (error) {
          logger.error('Get test by ID API error:', error);
          res.status(500).json({
            success: false,
            error: 'Internal server error'
          });
        }
      }
    );

    // Business Rule Validation endpoints
    this.app.post('/api/validate-business-rule',
      authMiddleware,
      validate({ body: commonSchemas.businessRuleRequest }),
      async (req: AuthenticatedRequest, res) => {
        try {
          const ruleRequest = {
            ...req.body,
            userId: req.user!.id
          };
          
          const result = await this.businessRuleService.validateBusinessRule(ruleRequest);
          
          // Record analytics metric
          await this.analyticsService.recordMetric({
            metricType: 'business_rule_validation_request',
            metricValue: 1,
            dimensions: {
              ruleType: ruleRequest.ruleType,
              domain: ruleRequest.context.domain,
              success: result.success
            },
            userId: req.user!.id
          });
          
          res.json(result);
        } catch (error) {
          logger.error('Business rule validation API error:', error);
          res.status(500).json({
            success: false,
            error: 'Internal server error'
          });
        }
      }
    );

    this.app.get('/api/business-rules',
      authMiddleware,
      async (req: AuthenticatedRequest, res) => {
        try {
          const filters = {
            ruleType: req.query.ruleType as string,
            domain: req.query.domain as string,
            status: req.query.status as string,
            limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
            offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0
          };
          
          const result = await this.businessRuleService.getValidationHistory(req.user!.id, filters);
          res.json(result);
        } catch (error) {
          logger.error('Get business rule history API error:', error);
          res.status(500).json({
            success: false,
            error: 'Internal server error'
          });
        }
      }
    );

    this.app.get('/api/business-rules/:ruleId',
      authMiddleware,
      async (req: AuthenticatedRequest, res) => {
        try {
          if (!req.params.ruleId) {
            res.status(400).json({ success: false, error: 'Rule ID required' });
            return;
          }
          const result = await this.businessRuleService.getValidationById(req.params.ruleId, req.user!.id);
          res.json(result);
        } catch (error) {
          logger.error('Get business rule by ID API error:', error);
          res.status(500).json({
            success: false,
            error: 'Internal server error'
          });
        }
      }
    );

    // Analytics endpoints
    this.app.post('/api/analytics/query',
      authMiddleware,
      validate({ body: commonSchemas.analyticsQuery }),
      async (req: AuthenticatedRequest, res) => {
        try {
          const query = {
            ...req.body,
            filters: {
              ...req.body.filters,
              userId: req.user!.id // Ensure users only see their own data
            }
          };
          
          const result = await this.analyticsService.queryMetrics(query);
          res.json(result);
        } catch (error) {
          logger.error('Analytics query API error:', error);
          res.status(500).json({
            success: false,
            error: 'Internal server error'
          });
        }
      }
    );

    this.app.get('/api/analytics/dashboard',
      authMiddleware,
      async (req: AuthenticatedRequest, res) => {
        try {
          let timeRange;
          if (req.query.start && req.query.end) {
            timeRange = {
              start: new Date(req.query.start as string),
              end: new Date(req.query.end as string)
            };
          }
          
          const result = await this.analyticsService.getDashboardMetrics(req.user!.id, timeRange);
          res.json(result);
        } catch (error) {
          logger.error('Dashboard metrics API error:', error);
          res.status(500).json({
            success: false,
            error: 'Internal server error'
          });
        }
      }
    );

    this.app.get('/api/analytics/top/:metricType',
      authMiddleware,
      async (req: AuthenticatedRequest, res) => {
        try {
          const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
          if (!req.params.metricType) {
            res.status(400).json({ success: false, error: 'Metric type required' });
            return;
          }
          const result = await this.analyticsService.getTopMetrics(req.params.metricType, limit);
          res.json(result);
        } catch (error) {
          logger.error('Top metrics API error:', error);
          res.status(500).json({
            success: false,
            error: 'Internal server error'
          });
        }
      }
    );

    // AI Usage Statistics endpoint
    this.app.get('/api/ai/usage-stats',
      authMiddleware,
      async (req: AuthenticatedRequest, res) => {
        try {
          let timeRange;
          if (req.query.start && req.query.end) {
            timeRange = {
              start: new Date(req.query.start as string),
              end: new Date(req.query.end as string)
            };
          }
          
          const result = await this.aiService.getUsageStats(req.user!.id, timeRange);
          res.json(result);
        } catch (error) {
          logger.error('AI usage stats API error:', error);
          res.status(500).json({
            success: false,
            error: 'Internal server error'
          });
        }
      }
    );

    // Error handling middleware (must be last)
    this.app.use(errorHandler);
  }

  private initializeWebSocket(): void {
    this.io.on('connection', (socket) => {
      logger.info('WebSocket client connected', { socketId: socket.id });

      socket.on('test-generation-request', async (data: WebSocketMessage) => {
        try {
          logger.info('Test generation request received', { 
            requestId: data.requestId,
            socketId: socket.id 
          });
          
          if (!data.userId) {
            socket.emit('test-generation-error', {
              requestId: data.requestId,
              error: 'User authentication required'
            });
            return;
          }

          // Send progress update
          socket.emit('test-generation-progress', {
            requestId: data.requestId,
            status: 'processing',
            progress: 25,
            message: 'Analyzing source code...'
          });

          // Process test generation
          const testRequest = {
            ...data.payload,
            userId: data.userId
          };
          
          socket.emit('test-generation-progress', {
            requestId: data.requestId,
            status: 'processing',
            progress: 50,
            message: 'Generating test code with AI...'
          });

          const result = await this.testGenerationService.generateTest(testRequest);
          
          socket.emit('test-generation-progress', {
            requestId: data.requestId,
            status: 'processing',
            progress: 90,
            message: 'Finalizing test generation...'
          });

          // Record analytics
          await this.analyticsService.recordMetric({
            metricType: 'websocket_test_generation',
            metricValue: 1,
            dimensions: {
              testType: testRequest.testType,
              success: result.success
            },
            userId: data.userId,
            sessionId: socket.id
          });

          socket.emit('test-generation-complete', {
            requestId: data.requestId,
            status: 'completed',
            result
          });
        } catch (error) {
          logger.error('WebSocket test generation failed:', error);
          socket.emit('test-generation-error', {
            requestId: data.requestId,
            error: error instanceof Error ? error.message : 'Test generation failed'
          });
        }
      });

      socket.on('business-rule-validation-request', async (data: WebSocketMessage) => {
        try {
          logger.info('Business rule validation request received', { 
            requestId: data.requestId,
            socketId: socket.id 
          });
          
          if (!data.userId) {
            socket.emit('business-rule-validation-error', {
              requestId: data.requestId,
              error: 'User authentication required'
            });
            return;
          }

          // Send progress update
          socket.emit('business-rule-validation-progress', {
            requestId: data.requestId,
            status: 'processing',
            progress: 30,
            message: 'Analyzing business rule...'
          });

          const ruleRequest = {
            ...data.payload,
            userId: data.userId
          };

          socket.emit('business-rule-validation-progress', {
            requestId: data.requestId,
            status: 'processing',
            progress: 70,
            message: 'Validating with AI analysis...'
          });

          const result = await this.businessRuleService.validateBusinessRule(ruleRequest);

          // Record analytics
          await this.analyticsService.recordMetric({
            metricType: 'websocket_business_rule_validation',
            metricValue: 1,
            dimensions: {
              ruleType: ruleRequest.ruleType,
              domain: ruleRequest.context.domain,
              success: result.success
            },
            userId: data.userId,
            sessionId: socket.id
          });

          socket.emit('business-rule-validation-complete', {
            requestId: data.requestId,
            status: 'completed',
            result
          });
        } catch (error) {
          logger.error('WebSocket business rule validation failed:', error);
          socket.emit('business-rule-validation-error', {
            requestId: data.requestId,
            error: error instanceof Error ? error.message : 'Business rule validation failed'
          });
        }
      });

      socket.on('analytics-query', async (data: WebSocketMessage) => {
        try {
          if (!data.userId) {
            socket.emit('analytics-error', {
              requestId: data.requestId,
              error: 'User authentication required'
            });
            return;
          }

          const query = {
            ...data.payload,
            filters: {
              ...data.payload.filters,
              userId: data.userId
            }
          };

          const result = await this.analyticsService.queryMetrics(query);

          socket.emit('analytics-result', {
            requestId: data.requestId,
            result
          });
        } catch (error) {
          logger.error('WebSocket analytics query failed:', error);
          socket.emit('analytics-error', {
            requestId: data.requestId,
            error: error instanceof Error ? error.message : 'Analytics query failed'
          });
        }
      });

      socket.on('disconnect', () => {
        logger.info('WebSocket client disconnected', { socketId: socket.id });
      });
    });
  }

  public async start(): Promise<void> {
    try {
      // Validate configuration
      validateConfig();
      
      // Initialize database
      await dbManager.initialize();
      
      // Start HTTP server
      this.server.listen(config.server.port, config.server.host, () => {
        logger.info(`MCP Server started successfully`, {
          host: config.server.host,
          port: config.server.port,
          environment: config.server.environment,
          cors: config.server.cors.origin
        });
      });
    } catch (error) {
      logger.error('Failed to start MCP Server:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      if (this.server) {
        this.server.close();
      }
      
      await dbManager.close();
      logger.info('MCP Server stopped gracefully');
    } catch (error) {
      logger.error('Error during server shutdown:', error);
    }
  }
}

// Create and start server
const mcpServer = new MCPServer();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await mcpServer.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await mcpServer.stop();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
mcpServer.start().catch((error) => {
  logger.error('Failed to start MCP Server:', error);
  process.exit(1);
});

export default mcpServer;