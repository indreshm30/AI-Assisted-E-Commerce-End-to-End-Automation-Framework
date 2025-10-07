import { AIServiceRequest, AIServiceResponse } from './AIService';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

export interface LocalModelConfig {
  name: string;
  baseUrl: string;
  maxTokens: number;
  temperature: number;
}

export class LocalAIService {
  private models: Map<string, LocalModelConfig>;
  private isInitialized = false;

  constructor() {
    this.models = new Map();
    this.initializeModels();
  }

  private initializeModels(): void {
    // Ollama models configuration
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    
    // Add available models
    this.models.set('qwen2.5-coder', {
      name: 'qwen2.5-coder:1.5b',
      baseUrl: ollamaBaseUrl,
      maxTokens: 2048,
      temperature: 0.7
    });

    this.models.set('qwen2.5', {
      name: 'qwen2.5:3b',
      baseUrl: ollamaBaseUrl,
      maxTokens: 2048,
      temperature: 0.7
    });

    this.models.set('codellama', {
      name: 'codellama:7b',
      baseUrl: ollamaBaseUrl,
      maxTokens: 2048,
      temperature: 0.7
    });

    // LM Studio configuration
    const lmStudioBaseUrl = process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234';
    this.models.set('lm-studio', {
      name: 'local-model',
      baseUrl: lmStudioBaseUrl,
      maxTokens: 2048,
      temperature: 0.7
    });

    this.isInitialized = true;
    logger.info('Local AI Service initialized with models:', Array.from(this.models.keys()));
  }

  public async generateCompletion(request: AIServiceRequest & { model?: string }): Promise<AIServiceResponse> {
    const requestId = uuidv4();
    const startTime = Date.now();

    try {
      // Default to qwen2.5-coder for code-related tasks
      const modelKey = request.model || (
        request.requestType === 'test-generation' ? 'qwen2.5-coder' : 'qwen2.5'
      );

      const modelConfig = this.models.get(modelKey);
      if (!modelConfig) {
        throw new Error(`Model ${modelKey} not configured`);
      }

      logger.debug('Generating local AI completion', {
        requestId,
        model: modelConfig.name,
        requestType: request.requestType
      });

      const response = await this.callLocalModel(modelConfig, request);
      const responseTime = Date.now() - startTime;

      const result: AIServiceResponse = {
        success: true,
        content: response.content,
        usage: {
          inputTokens: this.estimateTokens(request.prompt),
          outputTokens: this.estimateTokens(response.content),
          totalTokens: this.estimateTokens(request.prompt) + this.estimateTokens(response.content)
        },
        responseTime,
        model: modelConfig.name,
        provider: 'local',
        requestId
      };

      logger.debug('Local AI completion successful', {
        requestId,
        responseTime,
        outputLength: response.content.length
      });

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Local AI completion failed:', error);

      return {
        success: false,
        content: '',
        responseTime,
        model: 'unknown',
        provider: 'local',
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async callLocalModel(config: LocalModelConfig, request: AIServiceRequest): Promise<{ content: string }> {
    try {
      // Try Ollama API format first
      const ollamaResponse = await this.tryOllamaAPI(config, request);
      if (ollamaResponse) return ollamaResponse;

      // Fallback to OpenAI-compatible API (LM Studio, etc.)
      const openaiResponse = await this.tryOpenAICompatibleAPI(config, request);
      if (openaiResponse) return openaiResponse;

      throw new Error('No compatible API found for local model');
    } catch (error) {
      throw new Error(`Local model API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async tryOllamaAPI(config: LocalModelConfig, request: AIServiceRequest): Promise<{ content: string } | null> {
    try {
      const response = await axios.post(`${config.baseUrl}/api/generate`, {
        model: config.name,
        prompt: this.buildPrompt(request),
        stream: false,
        options: {
          temperature: request.temperature || config.temperature,
          num_predict: request.maxTokens || config.maxTokens
        }
      }, {
        timeout: 60000 // 60 second timeout
      });

      if (response.data && response.data.response) {
        return { content: response.data.response };
      }
      return null;
    } catch (error) {
      logger.debug('Ollama API failed, trying OpenAI compatible:', error instanceof Error ? error.message : 'Unknown');
      return null;
    }
  }

  private async tryOpenAICompatibleAPI(config: LocalModelConfig, request: AIServiceRequest): Promise<{ content: string } | null> {
    try {
      const response = await axios.post(`${config.baseUrl}/v1/chat/completions`, {
        model: config.name,
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
        max_tokens: request.maxTokens || config.maxTokens,
        temperature: request.temperature || config.temperature
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000
      });

      if (response.data && response.data.choices && response.data.choices[0]) {
        return { content: response.data.choices[0].message.content };
      }
      return null;
    } catch (error) {
      logger.debug('OpenAI compatible API failed:', error instanceof Error ? error.message : 'Unknown');
      return null;
    }
  }

  private buildPrompt(request: AIServiceRequest): string {
    const systemPrompt = this.getSystemPrompt(request.requestType);
    return `${systemPrompt}\n\nUser Request: ${request.prompt}`;
  }

  private getSystemPrompt(requestType: string): string {
    const systemPrompts = {
      'test-generation': `You are an expert software testing engineer specializing in automated test generation. 
Generate comprehensive, well-structured test cases for the provided code.

Guidelines:
- Generate tests that cover edge cases, error conditions, and normal operation
- Include appropriate assertions and mock data
- Follow testing best practices for the detected framework (Jest, Mocha, etc.)
- Ensure tests are maintainable and readable
- Consider performance implications for integration tests
- Include setup and teardown procedures when necessary

Output Format: Provide complete, executable test code with clear comments.`,

      'business-rule-validation': `You are an expert business analyst and software architect specializing in business rule validation.
Analyze code snippets for business logic compliance and suggest improvements.

Guidelines:
- Identify potential business rule violations
- Check for data validation, security constraints, and business logic consistency
- Suggest improvements for maintainability and compliance
- Consider edge cases and error handling
- Evaluate performance and scalability implications
- Provide specific, actionable recommendations

Output Format: Provide structured analysis with identified issues, risk levels, and specific recommendations.`,

      'code-analysis': `You are an expert code reviewer and software architect specializing in code quality analysis.
Analyze code for best practices, potential issues, and improvement opportunities.

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

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  public async checkModelAvailability(): Promise<{ [key: string]: boolean }> {
    const availability: { [key: string]: boolean } = {};

    for (const [key, config] of this.models) {
      try {
        // Quick health check for each model
        const response = await axios.get(`${config.baseUrl}/api/tags`, { timeout: 5000 });
        availability[key] = response.status === 200;
      } catch (error) {
        try {
          // Try OpenAI compatible health check
          const response = await axios.get(`${config.baseUrl}/v1/models`, { timeout: 5000 });
          availability[key] = response.status === 200;
        } catch {
          availability[key] = false;
        }
      }
    }

    return availability;
  }

  public getAvailableModels(): string[] {
    return Array.from(this.models.keys());
  }
}