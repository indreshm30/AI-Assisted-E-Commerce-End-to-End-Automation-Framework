import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ValidationSchema {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}

export const validate = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validationErrors: string[] = [];
    
    // Validate request body
    if (schema.body) {
      const { error } = schema.body.validate(req.body);
      if (error) {
        validationErrors.push(`Body: ${error.details.map(d => d.message).join(', ')}`);
      }
    }
    
    // Validate query parameters
    if (schema.query) {
      const { error } = schema.query.validate(req.query);
      if (error) {
        validationErrors.push(`Query: ${error.details.map(d => d.message).join(', ')}`);
      }
    }
    
    // Validate route parameters
    if (schema.params) {
      const { error } = schema.params.validate(req.params);
      if (error) {
        validationErrors.push(`Params: ${error.details.map(d => d.message).join(', ')}`);
      }
    }
    
    if (validationErrors.length > 0) {
      logger.warn('Request validation failed', {
        errors: validationErrors,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: validationErrors
        },
        metadata: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }
    
    next();
  };
};

// Common validation schemas
export const commonSchemas = {
  // Test Generation Request
  testGenerationRequest: Joi.object({
    testType: Joi.string().valid('unit', 'integration', 'e2e', 'performance').required(),
    targetFunction: Joi.string().min(1).max(200).required(),
    context: Joi.object({
      filePath: Joi.string().required(),
      dependencies: Joi.array().items(Joi.string()).optional(),
      businessRules: Joi.array().items(Joi.string()).optional(),
      expectedBehavior: Joi.string().optional()
    }).required(),
    options: Joi.object({
      coverage: Joi.number().min(0).max(100).optional(),
      aiModel: Joi.string().valid('gpt-4-turbo', 'claude-3-sonnet').optional(),
      complexity: Joi.string().valid('basic', 'intermediate', 'advanced').optional()
    }).optional()
  }),

  // Business Rule Validation Request
  businessRuleRequest: Joi.object({
    ruleType: Joi.string().valid('validation', 'calculation', 'workflow', 'security').required(),
    code: Joi.string().min(1).required(),
    context: Joi.object({
      domain: Joi.string().required(),
      relatedEntities: Joi.array().items(Joi.string()).optional(),
      constraints: Joi.array().items(Joi.string()).optional()
    }).required()
  }),

  // Analytics Query Request
  analyticsQuery: Joi.object({
    metric: Joi.string().valid('test_coverage', 'execution_time', 'success_rate', 'error_patterns').required(),
    timeRange: Joi.object({
      start: Joi.date().required(),
      end: Joi.date().required()
    }).required(),
    filters: Joi.object({
      testType: Joi.string().optional(),
      status: Joi.string().optional(),
      userId: Joi.string().optional()
    }).optional()
  }),

  // Pagination parameters
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};