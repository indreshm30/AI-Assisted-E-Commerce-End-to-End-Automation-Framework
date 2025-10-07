export interface MCPServerConfig {
  server: {
    port: number;
    host: string;
    environment: 'development' | 'production' | 'test';
    cors: {
      origin: string[];
      credentials: boolean;
    };
  };
  database: {
    path: string;
    maxConnections: number;
    timeout: number;
  };
  ai: {
    openai: {
      apiKey: string;
      model: string;
      maxTokens: number;
      temperature: number;
    };
    anthropic: {
      apiKey: string;
      model: string;
      maxTokens: number;
    };
    local: {
      ollamaBaseUrl: string;
      lmStudioBaseUrl: string;
      preferredModels: string[];
      enabled: boolean;
    };
  };
  security: {
    jwtSecret: string;
    jwtExpiresIn: string;
    rateLimiting: {
      windowMs: number;
      maxRequests: number;
    };
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    file: string;
    maxSize: string;
    maxFiles: number;
  };
  websocket: {
    pingTimeout: number;
    pingInterval: number;
    maxConnections: number;
  };
}

export const config: MCPServerConfig = {
  server: {
    port: parseInt(process.env.PORT || '3003', 10),
    host: process.env.HOST || 'localhost',
    environment: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001', 'http://localhost:3002'],
      credentials: true
    }
  },
  database: {
    path: process.env.DATABASE_PATH || './data/mcp_server.db',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
    timeout: parseInt(process.env.DB_TIMEOUT || '30000', 10)
  },
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4096', 10),
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7')
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
      maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4096', 10)
    },
    local: {
      ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      lmStudioBaseUrl: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234',
      preferredModels: process.env.LOCAL_AI_MODELS?.split(',') || ['qwen2.5-coder:1.5b', 'qwen2.5:3b'],
      enabled: process.env.ENABLE_LOCAL_AI !== 'false' // Default to enabled
    }
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    rateLimiting: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
    }
  },
  logging: {
    level: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',
    file: process.env.LOG_FILE || './logs/mcp-server.log',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '14', 10)
  },
  websocket: {
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '60000', 10),
    pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000', 10),
    maxConnections: parseInt(process.env.WS_MAX_CONNECTIONS || '100', 10)
  }
};

export const validateConfig = (): void => {
  const errors: string[] = [];

  // Validate required AI API keys (only in production)
  if (!config.ai.openai.apiKey && !config.ai.anthropic.apiKey && config.server.environment === 'production') {
    errors.push('At least one AI provider API key (OPENAI_API_KEY or ANTHROPIC_API_KEY) must be configured in production');
  }

  // Validate JWT secret in production
  if (config.server.environment === 'production' && config.security.jwtSecret === 'your-super-secret-jwt-key-change-in-production') {
    errors.push('JWT_SECRET must be set to a secure value in production');
  }

  // Validate port range
  if (config.server.port < 1 || config.server.port > 65535) {
    errors.push('Server port must be between 1 and 65535');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
};