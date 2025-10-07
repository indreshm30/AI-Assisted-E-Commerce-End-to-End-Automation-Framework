import { AIService, AIServiceRequest } from './AIService';
import { logger } from '../utils/logger';
import { dbManager } from '../utils/database';
import { v4 as uuidv4 } from 'uuid';

export interface BusinessRuleRequest {
  ruleType: 'validation' | 'calculation' | 'workflow' | 'security';
  code: string;
  context: {
    domain: string;
    relatedEntities?: string[];
    constraints?: string[];
    expectedOutcome?: string;
  };
  options?: {
    aiModel?: 'gpt-4-turbo' | 'claude-3-sonnet';
    analysisDepth?: 'quick' | 'thorough' | 'comprehensive';
  };
  userId: string;
}

export interface BusinessRuleValidationResult {
  success: boolean;
  ruleId: string;
  analysis: {
    compliance: {
      score: number; // 0-100
      status: 'compliant' | 'non-compliant' | 'partially-compliant' | 'needs-review';
      issues: Array<{
        type: 'error' | 'warning' | 'suggestion';
        severity: 'low' | 'medium' | 'high' | 'critical';
        message: string;
        lineNumber?: number;
        suggestion?: string;
      }>;
    };
    businessLogic: {
      validity: boolean;
      consistency: boolean;
      completeness: boolean;
      maintainability: number; // 0-100
      testability: number; // 0-100;
    };
    recommendations: string[];
    riskAssessment: {
      level: 'low' | 'medium' | 'high' | 'critical';
      factors: string[];
      mitigations: string[];
    };
  };
  metadata: {
    ruleType: string;
    domain: string;
    aiModel: string;
    analysisTime: number;
    codeLength: number;
  };
  error?: string;
}

export class BusinessRuleService {
  private aiService: AIService;

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  public async validateBusinessRule(request: BusinessRuleRequest): Promise<BusinessRuleValidationResult> {
    const ruleId = uuidv4();
    const startTime = Date.now();

    try {
      logger.info('Starting business rule validation', {
        ruleId,
        ruleType: request.ruleType,
        domain: request.context.domain,
        userId: request.userId
      });

      // Build comprehensive analysis prompt
      const prompt = this.buildValidationPrompt(request);
      
      // Determine AI provider preference
      const provider = request.options?.aiModel === 'claude-3-sonnet' ? 'anthropic' : 'openai';
      
      // Generate analysis using AI service
      const aiRequest: AIServiceRequest = {
        provider,
        requestType: 'business-rule-validation',
        prompt,
        context: {
          ruleType: request.ruleType,
          domain: request.context.domain,
          analysisDepth: request.options?.analysisDepth || 'thorough'
        },
        userId: request.userId
      };

      const aiResponse = await this.aiService.generateCompletion(aiRequest);

      if (!aiResponse.success) {
        throw new Error(aiResponse.error || 'AI service failed to validate business rule');
      }

      // Process AI response and extract structured analysis
      const analysis = await this.processValidationResponse(aiResponse.content, request);
      
      // Store validation record
      await this.storeValidationRecord(ruleId, request, aiResponse, analysis);
      
      const analysisTime = Date.now() - startTime;

      const result: BusinessRuleValidationResult = {
        success: true,
        ruleId,
        analysis,
        metadata: {
          ruleType: request.ruleType,
          domain: request.context.domain,
          aiModel: aiResponse.model,
          analysisTime,
          codeLength: request.code.length
        }
      };

      logger.info('Business rule validation completed successfully', {
        ruleId,
        analysisTime,
        complianceScore: analysis.compliance.score
      });

      return result;

    } catch (error) {
      logger.error('Business rule validation failed:', error);
      
      const analysisTime = Date.now() - startTime;
      
      // Store error record
      await this.storeErrorRecord(ruleId, request, error, analysisTime);

      return {
        success: false,
        ruleId,
        analysis: this.getDefaultAnalysis(),
        metadata: {
          ruleType: request.ruleType,
          domain: request.context.domain,
          aiModel: request.options?.aiModel || 'gpt-4-turbo',
          analysisTime,
          codeLength: request.code.length
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private buildValidationPrompt(request: BusinessRuleRequest): string {
    const { ruleType, code, context, options } = request;
    
    let prompt = `Analyze the following business rule code for compliance, quality, and best practices.

**Business Rule Information:**
- Rule Type: ${ruleType}
- Business Domain: ${context.domain}
- Analysis Depth: ${options?.analysisDepth || 'thorough'}

**Code to Analyze:**
\`\`\`
${code}
\`\`\``;

    if (context.relatedEntities && context.relatedEntities.length > 0) {
      prompt += `\n\n**Related Business Entities:**
${context.relatedEntities.map(entity => `- ${entity}`).join('\n')}`;
    }

    if (context.constraints && context.constraints.length > 0) {
      prompt += `\n\n**Business Constraints:**
${context.constraints.map(constraint => `- ${constraint}`).join('\n')}`;
    }

    if (context.expectedOutcome) {
      prompt += `\n\n**Expected Business Outcome:**
${context.expectedOutcome}`;
    }

    // Add rule type specific analysis instructions
    prompt += `\n\n**Analysis Requirements:**
${this.getRuleTypeAnalysisInstructions(ruleType)}

**Required Analysis Structure:**

1. **COMPLIANCE ANALYSIS (Score: 0-100)**
   - Overall compliance score
   - Status: compliant/non-compliant/partially-compliant/needs-review
   - Detailed issues list with:
     - Type: error/warning/suggestion
     - Severity: low/medium/high/critical
     - Message describing the issue
     - Line number (if applicable)
     - Specific suggestion for improvement

2. **BUSINESS LOGIC ASSESSMENT**
   - Validity: Does the logic serve the business purpose?
   - Consistency: Is the logic internally consistent?
   - Completeness: Are all business cases covered?
   - Maintainability score (0-100)
   - Testability score (0-100)

3. **RECOMMENDATIONS**
   - List 3-7 specific actionable recommendations
   - Priority order from most critical to least critical

4. **RISK ASSESSMENT**
   - Risk level: low/medium/high/critical
   - Risk factors (business and technical)
   - Suggested mitigation strategies

**Output Format:**
Provide a structured analysis following the exact format above. Be specific and actionable in all recommendations.`;

    return prompt;
  }

  private getRuleTypeAnalysisInstructions(ruleType: string): string {
    const instructions = {
      validation: `
- Check input validation completeness and security
- Verify data type and range validations
- Assess error handling and user feedback
- Review sanitization and SQL injection prevention
- Evaluate business rule completeness`,

      calculation: `
- Verify mathematical accuracy and precision
- Check for edge cases and boundary conditions
- Assess handling of division by zero and overflow
- Review rounding and decimal precision logic
- Validate business formula implementation`,

      workflow: `
- Analyze state transition logic and completeness
- Check for deadlocks and infinite loops
- Verify proper error handling and rollback procedures
- Assess user permission and access control
- Review audit trail and logging requirements`,

      security: `
- Evaluate authentication and authorization mechanisms
- Check for common security vulnerabilities (OWASP Top 10)
- Assess data encryption and sensitive information handling
- Review session management and timeout logic
- Validate input sanitization and output encoding`
    };

    return instructions[ruleType as keyof typeof instructions] || instructions.validation;
  }

  private async processValidationResponse(aiContent: string, request: BusinessRuleRequest): Promise<any> {
    try {
      // Parse AI response to extract structured analysis
      const analysis = this.parseAIAnalysis(aiContent);
      
      // Apply business rule specific scoring adjustments
      analysis.compliance.score = this.adjustComplianceScore(analysis.compliance.score, request.ruleType);
      
      // Enhance analysis with additional checks
      const codeMetrics = this.analyzeCodeMetrics(request.code);
      analysis.businessLogic.maintainability = codeMetrics.maintainability;
      analysis.businessLogic.testability = codeMetrics.testability;

      return analysis;
    } catch (error) {
      logger.error('Failed to process validation response:', error);
      return this.getDefaultAnalysis();
    }
  }

  private parseAIAnalysis(content: string): any {
    // Initialize default structure
    const analysis = this.getDefaultAnalysis();

    try {
      // Extract compliance score
      const scoreMatch = content.match(/(?:score|compliance)[:\s]*(\d+)/i);
      if (scoreMatch && scoreMatch[1]) {
        analysis.compliance.score = Math.min(parseInt(scoreMatch[1], 10), 100);
      }

      // Extract compliance status
      const statusMatch = content.match(/(compliant|non-compliant|partially-compliant|needs-review)/i);
      if (statusMatch && statusMatch[1]) {
        analysis.compliance.status = statusMatch[1].toLowerCase();
      }

      // Extract issues
      const issuesSection = this.extractSection(content, 'issues|problems|violations');
      if (issuesSection) {
        analysis.compliance.issues = this.parseIssues(issuesSection);
      }

      // Extract business logic assessment
      const validityMatch = content.match(/validity[:\s]*(true|false|yes|no)/i);
      if (validityMatch && validityMatch[1]) {
        analysis.businessLogic.validity = ['true', 'yes'].includes(validityMatch[1].toLowerCase());
      }

      const consistencyMatch = content.match(/consistency[:\s]*(true|false|yes|no)/i);
      if (consistencyMatch && consistencyMatch[1]) {
        analysis.businessLogic.consistency = ['true', 'yes'].includes(consistencyMatch[1].toLowerCase());
      }

      const completenessMatch = content.match(/completeness[:\s]*(true|false|yes|no)/i);
      if (completenessMatch && completenessMatch[1]) {
        analysis.businessLogic.completeness = ['true', 'yes'].includes(completenessMatch[1].toLowerCase());
      }

      // Extract recommendations
      const recommendationsSection = this.extractSection(content, 'recommendations|suggestions');
      if (recommendationsSection) {
        analysis.recommendations = this.parseRecommendations(recommendationsSection);
      }

      // Extract risk assessment
      const riskMatch = content.match(/risk\s+level[:\s]*(low|medium|high|critical)/i);
      if (riskMatch && riskMatch[1]) {
        analysis.riskAssessment.level = riskMatch[1].toLowerCase();
      }

      const factorsSection = this.extractSection(content, 'risk\s+factors?|factors?');
      if (factorsSection) {
        analysis.riskAssessment.factors = this.parseListItems(factorsSection);
      }

      const mitigationsSection = this.extractSection(content, 'mitigation|mitigations');
      if (mitigationsSection) {
        analysis.riskAssessment.mitigations = this.parseListItems(mitigationsSection);
      }

    } catch (error) {
      logger.error('Failed to parse AI analysis:', error);
    }

    return analysis;
  }

  private extractSection(content: string, sectionPattern: string): string | null {
    const regex = new RegExp(`(?:${sectionPattern})[:\s]*([\\s\\S]*?)(?=\\n\\n|\\n[A-Z]|$)`, 'i');
    const match = regex.exec(content);
    return match && match[1] ? match[1].trim() : null;
  }

  private parseIssues(issuesText: string): any[] {
    const issues: any[] = [];
    const lines = issuesText.split('\n');

    for (const line of lines) {
      if (line.trim().length > 0) {
        const issue = this.parseIssueLine(line);
        if (issue) {
          issues.push(issue);
        }
      }
    }

    return issues;
  }

  private parseIssueLine(line: string): any | null {
    // Match various issue formats
    const patterns = [
      /(?:(\w+)[:.]?\s*)?(critical|high|medium|low)[:\s]*(.+)/i,
      /(error|warning|suggestion)[:\s]*(.+)/i,
      /line\s+(\d+)[:\s]*(.+)/i,
      /[-*]\s*(.+)/
    ];

    for (const pattern of patterns) {
      const match = pattern.exec(line.trim());
      if (match) {
        return {
          type: this.determineIssueType(line),
          severity: this.determineSeverity(line),
          message: match[match.length - 1]?.trim() || '',
          lineNumber: this.extractLineNumber(line),
          suggestion: this.extractSuggestion(line)
        };
      }
    }

    return null;
  }

  private determineIssueType(text: string): 'error' | 'warning' | 'suggestion' {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('error') || lowerText.includes('critical')) return 'error';
    if (lowerText.includes('warning') || lowerText.includes('warn')) return 'warning';
    return 'suggestion';
  }

  private determineSeverity(text: string): 'low' | 'medium' | 'high' | 'critical' {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('critical')) return 'critical';
    if (lowerText.includes('high')) return 'high';
    if (lowerText.includes('medium')) return 'medium';
    return 'low';
  }

  private extractLineNumber(text: string): number | undefined {
    const match = text.match(/line\s+(\d+)/i);
    return match && match[1] ? parseInt(match[1], 10) : undefined;
  }

  private extractSuggestion(text: string): string | undefined {
    const suggestionMatch = text.match(/suggest(?:ion)?[:\s]*(.+)/i);
    return suggestionMatch && suggestionMatch[1] ? suggestionMatch[1].trim() : undefined;
  }

  private parseRecommendations(text: string): string[] {
    const recommendations: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0 && (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed))) {
        const cleaned = trimmed.replace(/^[-*\d.]+\s*/, '').trim();
        if (cleaned.length > 10) {
          recommendations.push(cleaned);
        }
      }
    }

    return recommendations.slice(0, 7); // Limit to 7 recommendations
  }

  private parseListItems(text: string): string[] {
    const items: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0 && (trimmed.startsWith('-') || trimmed.startsWith('*'))) {
        const cleaned = trimmed.replace(/^[-*]\s*/, '').trim();
        if (cleaned.length > 0) {
          items.push(cleaned);
        }
      }
    }

    return items.slice(0, 10); // Limit to 10 items
  }

  private adjustComplianceScore(baseScore: number, ruleType: string): number {
    // Apply rule type specific adjustments
    const typeAdjustments = {
      security: -5,   // Security rules should be stricter
      validation: 0,  // Standard validation
      calculation: 2, // Mathematical logic can be more lenient
      workflow: -2    // Workflow rules need careful review
    };

    const adjustment = typeAdjustments[ruleType as keyof typeof typeAdjustments] || 0;
    return Math.max(0, Math.min(100, baseScore + adjustment));
  }

  private analyzeCodeMetrics(code: string): { maintainability: number; testability: number } {
    // Simple heuristic-based code analysis
    let maintainability = 70; // Base score
    let testability = 70;     // Base score

    // Positive factors
    if (/\/\*[\s\S]*?\*\/|\/\//.test(code)) maintainability += 5; // Has comments
    if (/function\s+\w+\s*\(/.test(code)) testability += 5;       // Named functions
    if (/const\s+|let\s+/.test(code)) maintainability += 3;       // Modern variable declarations
    if (/return\s+/.test(code)) testability += 5;                 // Has return statements

    // Negative factors
    const complexity = (code.match(/if\s*\(|while\s*\(|for\s*\(/g) || []).length;
    maintainability -= Math.min(complexity * 2, 20);              // Cyclomatic complexity
    testability -= Math.min(complexity * 1.5, 15);

    if (/eval\s*\(|with\s*\(/.test(code)) {
      maintainability -= 15; // Dangerous patterns
      testability -= 10;
    }

    if (code.length > 1000) {
      maintainability -= Math.min((code.length - 1000) / 100, 15); // Long functions
    }

    return {
      maintainability: Math.max(0, Math.min(100, Math.round(maintainability))),
      testability: Math.max(0, Math.min(100, Math.round(testability)))
    };
  }

  private getDefaultAnalysis(): any {
    return {
      compliance: {
        score: 50,
        status: 'needs-review',
        issues: []
      },
      businessLogic: {
        validity: false,
        consistency: false,
        completeness: false,
        maintainability: 50,
        testability: 50
      },
      recommendations: [],
      riskAssessment: {
        level: 'medium',
        factors: [],
        mitigations: []
      }
    };
  }

  private async storeValidationRecord(
    ruleId: string,
    request: BusinessRuleRequest,
    aiResponse: any,
    analysis: any
  ): Promise<void> {
    try {
      const db = dbManager.getDatabase();
      const insertRule = db.prepare(`
        INSERT INTO business_rules (
          id, user_id, rule_type, domain, code_snippet, validation_result,
          ai_analysis, status, related_entities, constraints,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      insertRule.run(
        ruleId,
        request.userId,
        request.ruleType,
        request.context.domain,
        request.code,
        JSON.stringify({
          compliance: analysis.compliance,
          businessLogic: analysis.businessLogic,
          aiModel: aiResponse.model,
          aiRequestId: aiResponse.requestId
        }),
        JSON.stringify({
          recommendations: analysis.recommendations,
          riskAssessment: analysis.riskAssessment,
          responseTime: aiResponse.responseTime,
          tokenUsage: aiResponse.usage
        }),
        analysis.compliance.status,
        JSON.stringify(request.context.relatedEntities || []),
        JSON.stringify(request.context.constraints || [])
      );

      logger.debug('Business rule validation record stored successfully', { ruleId });
    } catch (error) {
      logger.error('Failed to store validation record:', error);
    }
  }

  private async storeErrorRecord(
    ruleId: string,
    request: BusinessRuleRequest,
    error: any,
    analysisTime: number
  ): Promise<void> {
    try {
      const db = dbManager.getDatabase();
      const insertRule = db.prepare(`
        INSERT INTO business_rules (
          id, user_id, rule_type, domain, code_snippet, validation_result,
          ai_analysis, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      insertRule.run(
        ruleId,
        request.userId,
        request.ruleType,
        request.context.domain,
        request.code,
        JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
        JSON.stringify({ analysisTime, status: 'error' }),
        'error'
      );

      logger.debug('Error record stored successfully', { ruleId });
    } catch (dbError) {
      logger.error('Failed to store error record:', dbError);
    }
  }

  public async getValidationHistory(
    userId: string,
    filters?: {
      ruleType?: string;
      domain?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<any> {
    try {
      const db = dbManager.getDatabase();
      let query = `
        SELECT 
          id, rule_type, domain, status, created_at, updated_at
        FROM business_rules
        WHERE user_id = ?
      `;

      const params: any[] = [userId];

      if (filters?.ruleType) {
        query += ' AND rule_type = ?';
        params.push(filters.ruleType);
      }

      if (filters?.domain) {
        query += ' AND domain = ?';
        params.push(filters.domain);
      }

      if (filters?.status) {
        query += ' AND status = ?';
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
      logger.error('Failed to get validation history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async getValidationById(ruleId: string, userId: string): Promise<any> {
    try {
      const db = dbManager.getDatabase();
      const stmt = db.prepare(`
        SELECT * FROM business_rules
        WHERE id = ? AND user_id = ?
      `);

      const result = stmt.get(ruleId, userId) as any;

      if (!result) {
        return {
          success: false,
          error: 'Business rule validation not found or access denied'
        };
      }

      return {
        success: true,
        data: {
          ...result,
          validation_result: result.validation_result ? JSON.parse(result.validation_result) : {},
          ai_analysis: result.ai_analysis ? JSON.parse(result.ai_analysis) : {},
          related_entities: result.related_entities ? JSON.parse(result.related_entities) : [],
          constraints: result.constraints ? JSON.parse(result.constraints) : []
        }
      };
    } catch (error) {
      logger.error('Failed to get validation by ID:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}