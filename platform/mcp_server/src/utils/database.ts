import Database from 'better-sqlite3';
import { logger } from './logger';
import { config } from './config';
import * as fs from 'fs';
import * as path from 'path';

export interface DatabaseConnection {
  db: Database.Database;
  close: () => void;
}

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: Database.Database | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Ensure database directory exists
      const dbDir = path.dirname(config.database.path);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
        logger.info(`Created database directory: ${dbDir}`);
      }

      // Initialize database connection
      this.db = new Database(config.database.path, {
        timeout: config.database.timeout,
        verbose: config.server.environment === 'development' ? logger.debug : undefined
      });

      // Configure database settings
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = 1000');
      this.db.pragma('temp_store = memory');

      // Create tables
      await this.createTables();

      this.isInitialized = true;
      logger.info('Database initialized successfully', {
        path: config.database.path,
        mode: 'WAL'
      });
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const tableCreationQueries = [
      // Test Executions table
      `CREATE TABLE IF NOT EXISTS test_executions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        test_type TEXT NOT NULL,
        target_function TEXT NOT NULL,
        file_path TEXT NOT NULL,
        ai_model TEXT NOT NULL,
        generated_test TEXT NOT NULL,
        execution_status TEXT NOT NULL,
        execution_time INTEGER,
        coverage_percentage REAL,
        error_message TEXT,
        business_rules TEXT, -- JSON string
        metadata TEXT, -- JSON string
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Business Rules table
      `CREATE TABLE IF NOT EXISTS business_rules (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        rule_type TEXT NOT NULL,
        domain TEXT NOT NULL,
        code_snippet TEXT NOT NULL,
        validation_result TEXT NOT NULL, -- JSON string
        ai_analysis TEXT NOT NULL, -- JSON string
        status TEXT NOT NULL,
        related_entities TEXT, -- JSON string
        constraints TEXT, -- JSON string
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Analytics Metrics table
      `CREATE TABLE IF NOT EXISTS analytics_metrics (
        id TEXT PRIMARY KEY,
        metric_type TEXT NOT NULL,
        metric_value REAL NOT NULL,
        dimensions TEXT NOT NULL, -- JSON string
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_id TEXT,
        session_id TEXT,
        metadata TEXT -- JSON string
      )`,

      // WebSocket Sessions table
      `CREATE TABLE IF NOT EXISTS websocket_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        socket_id TEXT NOT NULL UNIQUE,
        connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL,
        metadata TEXT -- JSON string
      )`,

      // AI Service Logs table
      `CREATE TABLE IF NOT EXISTS ai_service_logs (
        id TEXT PRIMARY KEY,
        service_provider TEXT NOT NULL,
        model_name TEXT NOT NULL,
        request_type TEXT NOT NULL,
        input_tokens INTEGER,
        output_tokens INTEGER,
        response_time INTEGER,
        cost_estimate REAL,
        status TEXT NOT NULL,
        error_message TEXT,
        user_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    // Create indexes for better performance
    const indexCreationQueries = [
      'CREATE INDEX IF NOT EXISTS idx_test_executions_user_id ON test_executions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_test_executions_created_at ON test_executions(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_test_executions_status ON test_executions(execution_status)',
      'CREATE INDEX IF NOT EXISTS idx_business_rules_user_id ON business_rules(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_business_rules_domain ON business_rules(domain)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_metrics_type ON analytics_metrics(metric_type)',
      'CREATE INDEX IF NOT EXISTS idx_analytics_metrics_timestamp ON analytics_metrics(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_websocket_sessions_user_id ON websocket_sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_websocket_sessions_status ON websocket_sessions(status)',
      'CREATE INDEX IF NOT EXISTS idx_ai_service_logs_provider ON ai_service_logs(service_provider)',
      'CREATE INDEX IF NOT EXISTS idx_ai_service_logs_created_at ON ai_service_logs(created_at)'
    ];

    try {
      // Execute table creation queries
      for (const query of tableCreationQueries) {
        this.db.exec(query);
      }

      // Execute index creation queries
      for (const query of indexCreationQueries) {
        this.db.exec(query);
      }

      logger.info('Database tables and indexes created successfully');
    } catch (error) {
      logger.error('Failed to create database tables:', error);
      throw error;
    }
  }

  public getDatabase(): Database.Database {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  public async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      logger.info('Database connection closed');
    }
  }

  // Utility methods for common database operations
  public async executeTransaction<T>(callback: (db: Database.Database) => T): Promise<T> {
    const db = this.getDatabase();
    const transaction = db.transaction(() => callback(db));
    return transaction();
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const db = this.getDatabase();
      const result = db.prepare('SELECT 1 as health').get() as any;
      return !!(result && result.health === 1);
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }
}

export const dbManager = DatabaseManager.getInstance();