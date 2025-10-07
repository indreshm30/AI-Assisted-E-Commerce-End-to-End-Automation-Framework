// Core MCP Protocol Types
export interface MCPRequest {
  id: string;
  method: string;
  params?: any;
  timestamp: Date;
}

export interface MCPResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
}

// User Story Types
export interface UserStory {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  businessRules: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedComplexity: number;
  tags?: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Test Generation Types
export interface TestGenerationRequest {
  userStory: UserStory;
  testType: 'unit' | 'integration' | 'e2e' | 'performance' | 'security';
  framework: 'playwright' | 'jest' | 'cypress' | 'selenium';
  options?: {
    includeEdgeCases?: boolean;
    includeNegativeTests?: boolean;
    generateTestData?: boolean;
    targetBrowser?: string[];
    mobileSupport?: boolean;
  };
}

export interface GeneratedTest {
  id: string;
  userStoryId: string;
  testType: TestGenerationRequest['testType'];
  framework: TestGenerationRequest['framework'];
  code: string;
  metadata: {
    aiModel: string;
    confidence: number;
    generatedAt: Date;
    testCoverage: string[];
    estimatedExecutionTime: number;
  };
  dependencies?: string[];
  setupInstructions?: string;
  teardownInstructions?: string;
}

// Business Rule Types
export enum BusinessRuleCategory {
  INVENTORY = 'inventory',
  PRICING = 'pricing',
  SHIPPING = 'shipping',
  PAYMENT = 'payment',
  USER_PERMISSIONS = 'user_permissions',
  SECURITY = 'security',
  COMPLIANCE = 'compliance',
  PROMOTIONS = 'promotions',
  TAX = 'tax'
}

export interface BusinessRule {
  id: string;
  category: BusinessRuleCategory;
  name: string;
  description: string;
  condition: string;
  action: string;
  priority: number;
  active: boolean;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessRuleValidationResult {
  ruleId: string;
  valid: boolean;
  violations?: {
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    location?: string;
    suggestion?: string;
  }[];
  confidence: number;
}

// Scenario Orchestration Types
export interface TestScenario {
  id: string;
  name: string;
  description: string;
  steps: TestStep[];
  preconditions?: string[];
  postconditions?: string[];
  testData?: any;
  tags?: string[];
}

export interface TestStep {
  id: string;
  description: string;
  action: string;
  expectedResult: string;
  parameters?: Record<string, any>;
  timeout?: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  scenarios: TestScenario[];
  executionOrder?: 'sequential' | 'parallel' | 'mixed';
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    retryOn: string[];
  };
}

export interface ExecutionPlan {
  id: string;
  workflowId: string;
  estimatedDuration: number;
  resourceRequirements: {
    cpu: number;
    memory: number;
    storage: number;
  };
  dependencies: string[];
  executionSteps: {
    stepId: string;
    estimatedDuration: number;
    parallelizable: boolean;
  }[];
}

// Analytics Types
export interface TestResults {
  testId: string;
  scenarioId?: string;
  status: 'passed' | 'failed' | 'skipped' | 'timeout' | 'error';
  duration: number;
  startTime: Date;
  endTime: Date;
  details?: {
    assertions?: {
      total: number;
      passed: number;
      failed: number;
    };
    screenshots?: string[];
    logs?: string[];
    errors?: string[];
  };
  environment?: {
    browser?: string;
    platform?: string;
    version?: string;
  };
}

export interface AnalyticsReport {
  id: string;
  generatedAt: Date;
  summary: {
    totalTests: number;
    passRate: number;
    averageDuration: number;
    flakiness: number;
  };
  trends: {
    passRateHistory: Array<{ date: Date; passRate: number }>;
    durationTrends: Array<{ date: Date; avgDuration: number }>;
    failurePatterns: Array<{ pattern: string; frequency: number }>;
  };
  insights: {
    riskAreas: string[];
    optimizationSuggestions: string[];
    qualityMetrics: Record<string, number>;
  };
  recommendations: {
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    description: string;
    actionItems: string[];
  }[];
}

// AI Service Types
export interface AIProvider {
  name: 'openai' | 'anthropic' | 'local';
  model: string;
  apiKey?: string;
  endpoint?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIGenerationContext {
  userStory: UserStory;
  existingTests?: GeneratedTest[];
  businessRules?: BusinessRule[];
  codebase?: {
    structure: string;
    technologies: string[];
    patterns: string[];
  };
  previousFailures?: {
    testId: string;
    failure: string;
    frequency: number;
  }[];
}

export interface AIInsight {
  id: string;
  type: 'pattern' | 'prediction' | 'optimization' | 'risk';
  confidence: number;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
  recommendations?: string[];
  data?: any;
  generatedAt: Date;
}

// Context Management Types
export interface TestContext {
  sessionId: string;
  userStories: UserStory[];
  generatedTests: GeneratedTest[];
  businessRules: BusinessRule[];
  testResults: TestResults[];
  insights: AIInsight[];
  metadata: {
    projectId?: string;
    userId?: string;
    environment?: string;
    createdAt: Date;
    lastUpdated: Date;
  };
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: Date;
    requestId: string;
    processingTime: number;
  };
}

// WebSocket Event Types
export interface WSEvent {
  type: string;
  payload: any;
  timestamp: Date;
}

export interface TestGenerationEvent extends WSEvent {
  type: 'test-generation-started' | 'test-generation-progress' | 'test-generation-completed' | 'test-generation-failed';
  payload: {
    userStoryId: string;
    progress?: number;
    generatedTest?: GeneratedTest;
    error?: string;
  };
}

export interface ValidationEvent extends WSEvent {
  type: 'validation-started' | 'validation-completed' | 'validation-failed';
  payload: {
    ruleId: string;
    result?: BusinessRuleValidationResult;
    error?: string;
  };
}

// Configuration Types
export interface MCPServerConfig {
  port: number;
  environment: 'development' | 'staging' | 'production';
  ai: {
    providers: AIProvider[];
    defaultProvider: string;
    fallbackProvider?: string;
  };
  database: {
    url: string;
    maxConnections?: number;
  };
  redis?: {
    url: string;
    password?: string;
  };
  security: {
    jwtSecret: string;
    jwtExpiresIn: string;
    rateLimiting: {
      windowMs: number;
      maxRequests: number;
    };
  };
  features: {
    aiGeneration: boolean;
    businessRuleValidation: boolean;
    analytics: boolean;
    websocket: boolean;
  };
  performance: {
    maxConcurrentGenerations: number;
    generationTimeoutMs: number;
    cacheTtlSeconds: number;
  };
}