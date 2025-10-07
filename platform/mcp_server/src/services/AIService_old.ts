import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger';
import { config } from '../utils/config';
import { dbManager } from '../utils/database';
import { v4 as uuidv4 } from 'uuid';
import { LocalAIService } from './LocalAIService';

export interface AIServiceRequest {
  provider: 'openai' | 'anthropic' | 'local';
  requestType: 'test-generation' | 'business-rule-validation' | 'code-analysis';
  prompt: string;
  context?: Record<string, any>;
  userId?: string;
  maxTokens?: number;
  temperature?: number;
  model?: string; // For specifying local models like 'qwen2.5-coder', 'qwen2.5', etc.
}

export interface AIServiceResponse {
  success: boolean;
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  responseTime: number;
  model: string;
  provider: string;
  requestId: string;
  error?: string;
}

export class AIService {
  private openaiClient: OpenAI | null = null;
  private anthropicClient: Anthropic | null = null;
  private localAIService: LocalAIService | null = null;
  private isInitialized = false;

  constructor() {
    // Initialize synchronously for now, async initialization happens in generateCompletion
    this.initializeClientsSync();
  }

  private initializeClientsSync(): void {
    try {
      // Initialize OpenAI client if API key is provided
      if (config.ai.openai.apiKey) {
        this.openaiClient = new OpenAI({
          apiKey: config.ai.openai.apiKey
        });
        logger.info('OpenAI client initialized successfully');
      }

      // Initialize Anthropic client if API key is provided
      if (config.ai.anthropic.apiKey) {
        this.anthropicClient = new Anthropic({
          apiKey: config.ai.anthropic.apiKey
        });
        logger.info('Anthropic client initialized successfully');
      }

      // Always initialize local AI service
      this.localAIService = new LocalAIService();
      logger.info('Local AI Service initialized successfully');

      if (!this.openaiClient && !this.anthropicClient) {
        logger.warn('No AI provider API keys configured - will use local models when available or mock responses');
      }

      this.isInitialized = true;
      logger.info('AI Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AI Service:', error);
      throw error;
    }
  }

  private async initializeClients(): Promise<void> {

  private async initializeClients(): Promise<void> {
    try {
      // Initialize OpenAI client if API key is provided
      if (config.ai.openai.apiKey) {
        this.openaiClient = new OpenAI({
          apiKey: config.ai.openai.apiKey
        });
        logger.info('OpenAI client initialized successfully');
      }

      // Initialize Anthropic client if API key is provided
      if (config.ai.anthropic.apiKey) {
        this.anthropicClient = new Anthropic({
          apiKey: config.ai.anthropic.apiKey
        });
        logger.info('Anthropic client initialized successfully');
      }

      // Always initialize local AI service
      this.localAIService = new LocalAIService();
      logger.info('Local AI Service initialized successfully');

      if (!this.openaiClient && !this.anthropicClient) {
        logger.warn('No AI provider API keys configured - will use local models when available');
        // In development mode, we can continue without API keys for testing infrastructure
        if (process.env.NODE_ENV !== 'production') {
          logger.info('AI Service initialized in development mode - will fallback to local models or mock responses');
        } else {
          // In production, require at least one provider (API keys or local models)
          const localModels = await this.localAIService.checkModelAvailability();
          const hasLocalModels = Object.values(localModels).some(available => available);
          
          if (!hasLocalModels) {
            throw new Error('No AI providers configured: please set API keys or configure local models');
          }
          logger.info('Production mode using local AI models');
        }
      }

      this.isInitialized = true;
      logger.info('AI Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AI Service:', error);
      throw error;
    }
  }

  public async generateCompletion(request: AIServiceRequest): Promise<AIServiceResponse> {
    if (!this.isInitialized) {
      throw new Error('AI Service not initialized');
    }

    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      logger.debug('Generating AI completion', {
        requestId,
        provider: request.provider,
        requestType: request.requestType,
        userId: request.userId
      });

      let response: AIServiceResponse;

      // Check if we're in development mode without API keys
      if (!this.openaiClient && !this.anthropicClient && process.env.NODE_ENV !== 'production') {
        response = await this.generateMockCompletion(request, requestId, startTime);
      } else if (request.provider === 'openai' && this.openaiClient) {
        response = await this.generateOpenAICompletion(request, requestId, startTime);
      } else if (request.provider === 'anthropic' && this.anthropicClient) {
        response = await this.generateAnthropicCompletion(request, requestId, startTime);
      } else {
        throw new Error(`Provider ${request.provider} not available or not configured`);
      }

      // Log the API usage for analytics
      await this.logAIUsage(request, response);

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('AI completion generation failed:', error);

      const errorResponse: AIServiceResponse = {
        success: false,
        content: '',
        responseTime,
        model: request.provider === 'openai' ? config.ai.openai.model : config.ai.anthropic.model,
        provider: request.provider,
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      await this.logAIUsage(request, errorResponse);
      return errorResponse;
    }
  }

  private async generateOpenAICompletion(
    request: AIServiceRequest,
    requestId: string,
    startTime: number
  ): Promise<AIServiceResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not available');
    }

    const completion = await this.openaiClient.chat.completions.create({
      model: config.ai.openai.model,
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(request.requestType)
        },
        {
          role: 'user',
          content: request.prompt
        }
      ],
      max_tokens: request.maxTokens || config.ai.openai.maxTokens,
      temperature: request.temperature || config.ai.openai.temperature,
      response_format: { type: 'text' }
    });

    const responseTime = Date.now() - startTime;
    const usage = completion.usage;

    return {
      success: true,
      content: completion.choices[0]?.message?.content || '',
      usage: usage ? {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      } : undefined,
      responseTime,
      model: config.ai.openai.model,
      provider: 'openai',
      requestId
    };
  }

  private async generateMockCompletion(
    request: AIServiceRequest,
    requestId: string,
    startTime: number
  ): Promise<AIServiceResponse> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    const responseTime = Date.now() - startTime;
    let mockContent = '';

    switch (request.requestType) {
      case 'test-generation':
        mockContent = `// Mock Generated Test Code for Development
describe('${request.context?.targetFunction || 'Function'} Tests', () => {
  it('should handle valid input', () => {
    // Mock test implementation
    expect(true).toBe(true);
  });
  
  it('should handle edge cases', () => {
    // Mock edge case test
    expect(() => {}).not.toThrow();
  });
  
  it('should validate error conditions', () => {
    // Mock error handling test  
    expect(false).toBe(false);
  });
});`;
        break;

      case 'business-rule-validation':
        mockContent = `**Business Rule Analysis (Mock Mode)**

**Compliance Score: 85**
**Status: partially-compliant**

**Issues Found:**
- Warning: Input validation could be more comprehensive
- Suggestion: Consider adding error handling for edge cases
- Low: Documentation could be improved

**Business Logic Assessment:**
- Validity: true
- Consistency: true  
- Completeness: false
- Maintainability: 80
- Testability: 75

**Recommendations:**
1. Add comprehensive input validation
2. Implement proper error handling
3. Add unit tests for all code paths
4. Improve code documentation
5. Consider refactoring for better maintainability

**Risk Assessment:**
- Risk Level: medium
- Factors: Limited error handling, incomplete validation
- Mitigations: Add comprehensive testing, improve validation logic`;
        break;

      default:
        mockContent = `Mock AI response for ${request.requestType}. This is a development mode placeholder when AI API keys are not configured.`;
    }

    return {
      success: true,
      content: mockContent,
      usage: {
        inputTokens: Math.floor(request.prompt.length / 4),
        outputTokens: Math.floor(mockContent.length / 4),
        totalTokens: Math.floor((request.prompt.length + mockContent.length) / 4)
      },
      responseTime,
      model: `mock-${request.provider}-model`,
      provider: request.provider,
      requestId
    };
  }

  private async generateAnthropicCompletion(
    request: AIServiceRequest,
    requestId: string,
    startTime: number
  ): Promise<AIServiceResponse> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not available');
    }

    const message = await this.anthropicClient.messages.create({
      model: config.ai.anthropic.model,
      max_tokens: request.maxTokens || config.ai.anthropic.maxTokens,
      messages: [
        {
          role: 'user',
          content: `${this.getSystemPrompt(request.requestType)}\n\n${request.prompt}`
        }
      ]
    });

    const responseTime = Date.now() - startTime;
    const content = message.content[0];

    return {
      success: true,
      content: content && 'text' in content ? content.text : '',
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        totalTokens: message.usage.input_tokens + message.usage.output_tokens
      },
      responseTime,
      model: config.ai.anthropic.model,
      provider: 'anthropic',
      requestId
    };
  }

  private getSystemPrompt(requestType: string): string {
    const systemPrompts = {
      'test-generation': `You are an expert software testing engineer specializing in automated test generation. 
Your task is to generate comprehensive, well-structured test cases for the provided code.

Guidelines:
- Generate tests that cover edge cases, error conditions, and normal operation
- Include appropriate assertions and mock data
- Follow testing best practices for the detected framework (Jest, Mocha, etc.)
- Ensure tests are maintainable and readable
- Consider performance implications for integration tests
- Include setup and teardown procedures when necessary

Output Format: Provide complete, executable test code with clear comments.`,

      'business-rule-validation': `You are an expert business analyst and software architect specializing in business rule validation.
Your task is to analyze code snippets for business logic compliance and suggest improvements.

Guidelines:
- Identify potential business rule violations
- Check for data validation, security constraints, and business logic consistency
- Suggest improvements for maintainability and compliance
- Consider edge cases and error handling
- Evaluate performance and scalability implications
- Provide specific, actionable recommendations

Output Format: Provide structured analysis with identified issues, risk levels, and specific recommendations.`,

      'code-analysis': `You are an expert code reviewer and software architect specializing in code quality analysis.
Your task is to analyze code for best practices, potential issues, and improvement opportunities.

Guidelines:
- Identify code quality issues, security vulnerabilities, and performance problems
- Check for adherence to coding standards and best practices
- Suggest refactoring opportunities and architectural improvements
- Consider maintainability, readability, and testability
- Provide specific examples and recommendations
- Focus on practical, actionable insights

Output Format: Provide structured analysis with categorized findings and prioritized recommendations.`
    };

    return systemPrompts[requestType as keyof typeof systemPrompts] || 
           'You are a helpful AI assistant specialized in software development and analysis.';
  }

  private async logAIUsage(request: AIServiceRequest, response: AIServiceResponse): Promise<void> {
    try {
      const db = dbManager.getDatabase();
      const insertLog = db.prepare(`
        INSERT INTO ai_service_logs (
          id, service_provider, model_name, request_type,
          input_tokens, output_tokens, response_time, cost_estimate,
          status, error_message, user_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      // Estimate cost based on token usage (approximate pricing)
      let costEstimate = 0;
      if (response.usage) {
        if (request.provider === 'openai') {
          // GPT-4 Turbo pricing (approximate)
          costEstimate = (response.usage.inputTokens * 0.01 + response.usage.outputTokens * 0.03) / 1000;
        } else if (request.provider === 'anthropic') {
          // Claude 3 pricing (approximate)
          costEstimate = (response.usage.inputTokens * 0.003 + response.usage.outputTokens * 0.015) / 1000;
        }
      }

      insertLog.run(
        response.requestId,
        request.provider,
        response.model,
        request.requestType,
        response.usage?.inputTokens || 0,
        response.usage?.outputTokens || 0,
        response.responseTime,
        costEstimate,
        response.success ? 'success' : 'error',
        response.error || null,
        request.userId || null
      );

      logger.debug('AI usage logged successfully', {
        requestId: response.requestId,
        provider: request.provider,
        tokens: response.usage?.totalTokens || 0,
        cost: costEstimate
      });
    } catch (error) {
      logger.error('Failed to log AI usage:', error);
    }
  }

  public async getUsageStats(userId?: string, timeRange?: { start: Date; end: Date }): Promise<any> {
    try {
      const db = dbManager.getDatabase();
      let query = `
        SELECT 
          service_provider,
          model_name,
          COUNT(*) as request_count,
          SUM(input_tokens) as total_input_tokens,
          SUM(output_tokens) as total_output_tokens,
          AVG(response_time) as avg_response_time,
          SUM(cost_estimate) as total_cost,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_requests,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_requests
        FROM ai_service_logs
        WHERE 1 = 1
      `;

      const params: any[] = [];

      if (userId) {
        query += ' AND user_id = ?';
        params.push(userId);
      }

      if (timeRange) {
        query += ' AND created_at BETWEEN ? AND ?';
        params.push(timeRange.start.toISOString(), timeRange.end.toISOString());
      }

      query += ' GROUP BY service_provider, model_name ORDER BY total_cost DESC';

      const stmt = db.prepare(query);
      const results = stmt.all(...params);

      return {
        success: true,
        data: results,
        summary: {
          totalRequests: results.reduce((sum: number, row: any) => sum + row.request_count, 0),
          totalCost: results.reduce((sum: number, row: any) => sum + row.total_cost, 0),
          avgResponseTime: results.reduce((sum: number, row: any) => sum + row.avg_response_time, 0) / results.length || 0,
          successRate: results.reduce((sum: number, row: any) => sum + row.successful_requests, 0) / 
                      results.reduce((sum: number, row: any) => sum + row.request_count, 0) * 100 || 0
        }
      };
    } catch (error) {
      logger.error('Failed to get usage stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}