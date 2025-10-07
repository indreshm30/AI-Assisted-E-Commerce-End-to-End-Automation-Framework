import { AIService, AIServiceRequest } from './AIService';
import { logger } from '../utils/logger';
import { dbManager } from '../utils/database';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export interface TestGenerationRequest {
  testType: 'unit' | 'integration' | 'e2e' | 'performance';
  targetFunction: string;
  context: {
    filePath: string;
    dependencies?: string[];
    businessRules?: string[];
    expectedBehavior?: string;
  };
  options?: {
    coverage?: number;
    aiModel?: 'gpt-4-turbo' | 'claude-3-sonnet';
    complexity?: 'basic' | 'intermediate' | 'advanced';
  };
  userId: string;
}

export interface TestGenerationResult {
  success: boolean;
  testId: string;
  generatedTest: string;
  metadata: {
    testType: string;
    targetFunction: string;
    filePath: string;
    aiModel: string;
    complexity: string;
    estimatedCoverage?: number;
    generationTime: number;
    recommendations?: string[];
  };
  error?: string;
}

export class TestGenerationService {
  private aiService: AIService;

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  public async generateTest(request: TestGenerationRequest): Promise<TestGenerationResult> {
    const testId = uuidv4();
    const startTime = Date.now();

    try {
      logger.info('Starting test generation', {
        testId,
        testType: request.testType,
        targetFunction: request.targetFunction,
        userId: request.userId
      });

      // Read the source file for context
      const sourceCode = await this.readSourceFile(request.context.filePath);
      
      // Generate the AI prompt based on test type and context
      const prompt = this.buildTestGenerationPrompt(request, sourceCode);
      
      // Determine AI provider preference
      const provider = request.options?.aiModel === 'claude-3-sonnet' ? 'anthropic' : 'openai';
      
      // Generate test using AI service
      const aiRequest: AIServiceRequest = {
        provider,
        requestType: 'test-generation',
        prompt,
        context: {
          testType: request.testType,
          targetFunction: request.targetFunction,
          complexity: request.options?.complexity || 'intermediate'
        },
        userId: request.userId
      };

      const aiResponse = await this.aiService.generateCompletion(aiRequest);

      if (!aiResponse.success) {
        throw new Error(aiResponse.error || 'AI service failed to generate test');
      }

      // Process and enhance the generated test
      const processedTest = await this.processGeneratedTest(aiResponse.content, request);
      
      // Store test execution record
      await this.storeTestRecord(testId, request, aiResponse, processedTest);
      
      const generationTime = Date.now() - startTime;

      const result: TestGenerationResult = {
        success: true,
        testId,
        generatedTest: processedTest.code,
        metadata: {
          testType: request.testType,
          targetFunction: request.targetFunction,
          filePath: request.context.filePath,
          aiModel: aiResponse.model,
          complexity: request.options?.complexity || 'intermediate',
          estimatedCoverage: processedTest.estimatedCoverage,
          generationTime,
          recommendations: processedTest.recommendations
        }
      };

      logger.info('Test generation completed successfully', {
        testId,
        generationTime,
        testLength: processedTest.code.length
      });

      return result;

    } catch (error) {
      logger.error('Test generation failed:', error);
      
      const generationTime = Date.now() - startTime;
      
      // Store error record
      await this.storeErrorRecord(testId, request, error, generationTime);

      return {
        success: false,
        testId,
        generatedTest: '',
        metadata: {
          testType: request.testType,
          targetFunction: request.targetFunction,
          filePath: request.context.filePath,
          aiModel: request.options?.aiModel || 'gpt-4-turbo',
          complexity: request.options?.complexity || 'intermediate',
          generationTime
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async readSourceFile(filePath: string): Promise<string> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Source file not found: ${filePath}`);
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return content;
    } catch (error) {
      logger.error(`Failed to read source file: ${filePath}`, error);
      throw error;
    }
  }

  private buildTestGenerationPrompt(request: TestGenerationRequest, sourceCode: string): string {
    const { testType, targetFunction, context, options } = request;
    
    let prompt = `Generate comprehensive ${testType} tests for the function "${targetFunction}".

**Source Code:**
\`\`\`
${sourceCode}
\`\`\`

**Test Requirements:**
- Test Type: ${testType}
- Target Function: ${targetFunction}
- Complexity Level: ${options?.complexity || 'intermediate'}
- File Path: ${context.filePath}`;

    if (context.dependencies && context.dependencies.length > 0) {
      prompt += `\n- Dependencies to Mock: ${context.dependencies.join(', ')}`;
    }

    if (context.businessRules && context.businessRules.length > 0) {
      prompt += `\n- Business Rules to Validate: ${context.businessRules.join(', ')}`;
    }

    if (context.expectedBehavior) {
      prompt += `\n- Expected Behavior: ${context.expectedBehavior}`;
    }

    if (options?.coverage) {
      prompt += `\n- Target Code Coverage: ${options.coverage}%`;
    }

    // Add test type specific instructions
    const typeSpecificInstructions = this.getTestTypeInstructions(testType);
    prompt += `\n\n**Test Type Specific Instructions:**\n${typeSpecificInstructions}`;

    prompt += `\n\n**Output Requirements:**
1. Generate complete, executable test code
2. Include proper setup and teardown procedures
3. Cover edge cases and error conditions
4. Add meaningful test descriptions and comments
5. Use appropriate testing framework (Jest, Mocha, etc.)
6. Include mock data and assertions
7. Ensure tests are maintainable and readable

**Format the response as:**
\`\`\`javascript
// Generated test code here
\`\`\`

**Additional Recommendations:**
Provide 3-5 specific recommendations for improving test coverage or test quality.`;

    return prompt;
  }

  private getTestTypeInstructions(testType: string): string {
    const instructions = {
      unit: `
- Focus on testing individual functions in isolation
- Mock external dependencies and API calls
- Test both successful and error scenarios
- Validate input/output transformations
- Check boundary conditions and edge cases
- Ensure fast execution (< 100ms per test)`,

      integration: `
- Test interaction between multiple components
- Use real or realistic test data
- Validate data flow between services
- Test API endpoints and database operations
- Include authentication and authorization tests
- Verify error handling across component boundaries`,

      e2e: `
- Test complete user workflows and scenarios
- Use browser automation tools (Selenium, Playwright, etc.)
- Include user interface interactions
- Validate business process flows
- Test across different environments
- Include performance and load considerations`,

      performance: `
- Measure execution time and resource usage
- Test with varying data loads
- Identify bottlenecks and optimization opportunities
- Include memory usage and CPU utilization tests
- Test concurrent access scenarios
- Validate system behavior under stress`
    };

    return instructions[testType as keyof typeof instructions] || instructions.unit;
  }

  private async processGeneratedTest(generatedCode: string, request: TestGenerationRequest): Promise<{
    code: string;
    estimatedCoverage?: number;
    recommendations: string[];
  }> {
    try {
      // Extract code from markdown blocks if present
      let processedCode = generatedCode;
      const codeBlockRegex = /```(?:javascript|js|typescript|ts)?\n([\s\S]*?)\n```/g;
      const match = codeBlockRegex.exec(generatedCode);
      
      if (match && match[1]) {
        processedCode = match[1];
      }

      // Extract recommendations
      const recommendations = this.extractRecommendations(generatedCode);
      
      // Estimate test coverage based on test complexity and content
      const estimatedCoverage = this.estimateTestCoverage(processedCode, request);

      return {
        code: processedCode.trim(),
        estimatedCoverage,
        recommendations
      };
    } catch (error) {
      logger.error('Failed to process generated test:', error);
      return {
        code: generatedCode,
        recommendations: []
      };
    }
  }

  private extractRecommendations(content: string): string[] {
    const recommendations: string[] = [];
    
    // Look for recommendation patterns in the AI response
    const patterns = [
      /(?:recommendation|suggest|improve|consider)[s]?:?\s*(.+)/gi,
      /(?:additional|further|next)[s]?\s+(?:recommendation|step|improvement)[s]?:?\s*(.+)/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const recommendation = match[1]?.trim();
        if (recommendation && recommendation.length > 10 && recommendation.length < 200) {
          recommendations.push(recommendation);
        }
      }
    });

    return recommendations.slice(0, 5); // Limit to 5 recommendations
  }

  private estimateTestCoverage(testCode: string, request: TestGenerationRequest): number {
    let baseScore = 50; // Base coverage estimate

    // Factors that increase coverage estimate
    const positiveFactors = [
      { pattern: /describe\s*\(/g, points: 10, max: 30 },
      { pattern: /it\s*\(/g, points: 5, max: 40 },
      { pattern: /test\s*\(/g, points: 5, max: 40 },
      { pattern: /expect\s*\(/g, points: 3, max: 30 },
      { pattern: /mock|spy|stub/gi, points: 5, max: 20 },
      { pattern: /throw|error|catch/gi, points: 3, max: 15 },
      { pattern: /edge\s+case|boundary/gi, points: 8, max: 16 }
    ];

    positiveFactors.forEach(factor => {
      const matches = (testCode.match(factor.pattern) || []).length;
      const points = Math.min(matches * factor.points, factor.max);
      baseScore += points;
    });

    // Adjust based on test type
    const typeMultipliers = {
      unit: 1.0,
      integration: 0.8,
      e2e: 0.6,
      performance: 0.7
    };

    baseScore *= typeMultipliers[request.testType] || 1.0;

    // Adjust based on complexity
    const complexityMultipliers = {
      basic: 0.8,
      intermediate: 1.0,
      advanced: 1.2
    };

    baseScore *= complexityMultipliers[request.options?.complexity || 'intermediate'];

    // Cap at 95% (perfect coverage is rare)
    return Math.min(Math.round(baseScore), 95);
  }

  private async storeTestRecord(
    testId: string,
    request: TestGenerationRequest,
    aiResponse: any,
    processedTest: any
  ): Promise<void> {
    try {
      const db = dbManager.getDatabase();
      const insertTest = db.prepare(`
        INSERT INTO test_executions (
          id, user_id, test_type, target_function, file_path, ai_model,
          generated_test, execution_status, coverage_percentage,
          business_rules, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      insertTest.run(
        testId,
        request.userId,
        request.testType,
        request.targetFunction,
        request.context.filePath,
        aiResponse.model,
        processedTest.code,
        'generated',
        processedTest.estimatedCoverage,
        JSON.stringify(request.context.businessRules || []),
        JSON.stringify({
          complexity: request.options?.complexity || 'intermediate',
          dependencies: request.context.dependencies || [],
          recommendations: processedTest.recommendations,
          aiRequestId: aiResponse.requestId,
          responseTime: aiResponse.responseTime,
          tokenUsage: aiResponse.usage
        })
      );

      logger.debug('Test record stored successfully', { testId });
    } catch (error) {
      logger.error('Failed to store test record:', error);
    }
  }

  private async storeErrorRecord(
    testId: string,
    request: TestGenerationRequest,
    error: any,
    generationTime: number
  ): Promise<void> {
    try {
      const db = dbManager.getDatabase();
      const insertTest = db.prepare(`
        INSERT INTO test_executions (
          id, user_id, test_type, target_function, file_path, ai_model,
          generated_test, execution_status, error_message, execution_time,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      insertTest.run(
        testId,
        request.userId,
        request.testType,
        request.targetFunction,
        request.context.filePath,
        request.options?.aiModel || 'gpt-4-turbo',
        '',
        'failed',
        error instanceof Error ? error.message : 'Unknown error',
        generationTime
      );

      logger.debug('Error record stored successfully', { testId });
    } catch (dbError) {
      logger.error('Failed to store error record:', dbError);
    }
  }

  public async getTestHistory(
    userId: string,
    filters?: {
      testType?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<any> {
    try {
      const db = dbManager.getDatabase();
      let query = `
        SELECT 
          id, test_type, target_function, file_path, ai_model,
          execution_status, coverage_percentage, error_message,
          created_at, updated_at
        FROM test_executions
        WHERE user_id = ?
      `;

      const params: any[] = [userId];

      if (filters?.testType) {
        query += ' AND test_type = ?';
        params.push(filters.testType);
      }

      if (filters?.status) {
        query += ' AND execution_status = ?';
        params.push(filters.status);
      }

      query += ' ORDER BY created_at DESC';

      if (filters?.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
        
        if (filters?.offset) {
          query += ' OFFSET ?';
          params.push(filters.offset);
        }
      }

      const stmt = db.prepare(query);
      const results = stmt.all(...params);

      return {
        success: true,
        data: results,
        total: results.length
      };
    } catch (error) {
      logger.error('Failed to get test history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async getTestById(testId: string, userId: string): Promise<any> {
    try {
      const db = dbManager.getDatabase();
      const stmt = db.prepare(`
        SELECT * FROM test_executions
        WHERE id = ? AND user_id = ?
      `);

      const result = stmt.get(testId, userId) as any;

      if (!result) {
        return {
          success: false,
          error: 'Test not found or access denied'
        };
      }

      return {
        success: true,
        data: {
          ...result,
          business_rules: result.business_rules ? JSON.parse(result.business_rules) : [],
          metadata: result.metadata ? JSON.parse(result.metadata) : {}
        }
      };
    } catch (error) {
      logger.error('Failed to get test by ID:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}