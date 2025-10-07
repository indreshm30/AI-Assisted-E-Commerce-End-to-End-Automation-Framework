import { logger } from '../utils/logger';
import { dbManager } from '../utils/database';
import { v4 as uuidv4 } from 'uuid';

export interface AnalyticsQuery {
  metric: 'test_coverage' | 'execution_time' | 'success_rate' | 'error_patterns' | 'ai_usage' | 'business_rule_compliance';
  timeRange: {
    start: Date;
    end: Date;
  };
  filters?: {
    testType?: string;
    status?: string;
    userId?: string;
    domain?: string;
    aiModel?: string;
  };
  groupBy?: 'day' | 'week' | 'month' | 'user' | 'testType' | 'domain';
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
}

export interface AnalyticsResult {
  success: boolean;
  metric: string;
  data: Array<{
    timestamp?: string;
    group?: string;
    value: number;
    metadata?: Record<string, any>;
  }>;
  summary: {
    total: number;
    average: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    periodComparison?: {
      current: number;
      previous: number;
      change: number;
      changePercent: number;
    };
  };
  insights: string[];
  error?: string;
}

export interface MetricEvent {
  metricType: string;
  metricValue: number;
  dimensions: Record<string, any>;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export class AnalyticsService {
  constructor() {}

  public async recordMetric(event: MetricEvent): Promise<boolean> {
    try {
      const db = dbManager.getDatabase();
      const insertMetric = db.prepare(`
        INSERT INTO analytics_metrics (
          id, metric_type, metric_value, dimensions, timestamp,
          user_id, session_id, metadata
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
      `);

      const metricId = uuidv4();
      
      insertMetric.run(
        metricId,
        event.metricType,
        event.metricValue,
        JSON.stringify(event.dimensions),
        event.userId || null,
        event.sessionId || null,
        JSON.stringify(event.metadata || {})
      );

      logger.debug('Metric recorded successfully', {
        metricId,
        type: event.metricType,
        value: event.metricValue,
        userId: event.userId
      });

      return true;
    } catch (error) {
      logger.error('Failed to record metric:', error);
      return false;
    }
  }

  public async queryMetrics(query: AnalyticsQuery): Promise<AnalyticsResult> {
    try {
      logger.info('Executing analytics query', {
        metric: query.metric,
        timeRange: query.timeRange,
        filters: query.filters
      });

      const data = await this.executeMetricQuery(query);
      const summary = await this.calculateSummary(data, query);
      const insights = this.generateInsights(data, summary, query);

      const result: AnalyticsResult = {
        success: true,
        metric: query.metric,
        data,
        summary,
        insights
      };

      logger.info('Analytics query completed successfully', {
        metric: query.metric,
        dataPoints: data.length,
        trend: summary.trend
      });

      return result;

    } catch (error) {
      logger.error('Analytics query failed:', error);
      return {
        success: false,
        metric: query.metric,
        data: [],
        summary: {
          total: 0,
          average: 0,
          trend: 'stable'
        },
        insights: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async executeMetricQuery(query: AnalyticsQuery): Promise<any[]> {
    const db = dbManager.getDatabase();
    
    switch (query.metric) {
      case 'test_coverage':
        return this.queryTestCoverage(db, query);
      case 'execution_time':
        return this.queryExecutionTime(db, query);
      case 'success_rate':
        return this.querySuccessRate(db, query);
      case 'error_patterns':
        return this.queryErrorPatterns(db, query);
      case 'ai_usage':
        return this.queryAIUsage(db, query);
      case 'business_rule_compliance':
        return this.queryBusinessRuleCompliance(db, query);
      default:
        throw new Error(`Unsupported metric: ${query.metric}`);
    }
  }

  private queryTestCoverage(db: any, query: AnalyticsQuery): any[] {
    let sql = `
      SELECT 
        DATE(created_at) as timestamp,
        AVG(coverage_percentage) as value,
        COUNT(*) as count,
        test_type as group_field
      FROM test_executions
      WHERE created_at BETWEEN ? AND ?
        AND execution_status != 'failed'
        AND coverage_percentage IS NOT NULL
    `;

    const params = [query.timeRange.start.toISOString(), query.timeRange.end.toISOString()];

    if (query.filters?.testType) {
      sql += ' AND test_type = ?';
      params.push(query.filters.testType);
    }

    if (query.filters?.userId) {
      sql += ' AND user_id = ?';
      params.push(query.filters.userId);
    }

    if (query.groupBy === 'testType') {
      sql += ' GROUP BY test_type, DATE(created_at)';
    } else if (query.groupBy === 'day') {
      sql += ' GROUP BY DATE(created_at)';
    } else {
      sql += ' GROUP BY DATE(created_at)';
    }

    sql += ' ORDER BY timestamp';

    const stmt = db.prepare(sql);
    const results = stmt.all(...params);

    return results.map((row: any) => ({
      timestamp: row.timestamp,
      group: query.groupBy === 'testType' ? row.group_field : undefined,
      value: Math.round(row.value * 100) / 100,
      metadata: {
        count: row.count,
        metricType: 'coverage_percentage'
      }
    }));
  }

  private queryExecutionTime(db: any, query: AnalyticsQuery): any[] {
    let sql = `
      SELECT 
        DATE(created_at) as timestamp,
        AVG(execution_time) as value,
        COUNT(*) as count,
        test_type as group_field
      FROM test_executions
      WHERE created_at BETWEEN ? AND ?
        AND execution_time IS NOT NULL
    `;

    const params = [query.timeRange.start.toISOString(), query.timeRange.end.toISOString()];

    if (query.filters?.testType) {
      sql += ' AND test_type = ?';
      params.push(query.filters.testType);
    }

    if (query.filters?.userId) {
      sql += ' AND user_id = ?';
      params.push(query.filters.userId);
    }

    if (query.groupBy === 'testType') {
      sql += ' GROUP BY test_type, DATE(created_at)';
    } else {
      sql += ' GROUP BY DATE(created_at)';
    }

    sql += ' ORDER BY timestamp';

    const stmt = db.prepare(sql);
    const results = stmt.all(...params);

    return results.map((row: any) => ({
      timestamp: row.timestamp,
      group: query.groupBy === 'testType' ? row.group_field : undefined,
      value: Math.round(row.value),
      metadata: {
        count: row.count,
        metricType: 'execution_time_ms'
      }
    }));
  }

  private querySuccessRate(db: any, query: AnalyticsQuery): any[] {
    let sql = `
      SELECT 
        DATE(created_at) as timestamp,
        COUNT(CASE WHEN execution_status = 'generated' OR execution_status = 'passed' THEN 1 END) * 100.0 / COUNT(*) as value,
        COUNT(*) as total_count,
        COUNT(CASE WHEN execution_status = 'generated' OR execution_status = 'passed' THEN 1 END) as success_count,
        test_type as group_field
      FROM test_executions
      WHERE created_at BETWEEN ? AND ?
    `;

    const params = [query.timeRange.start.toISOString(), query.timeRange.end.toISOString()];

    if (query.filters?.testType) {
      sql += ' AND test_type = ?';
      params.push(query.filters.testType);
    }

    if (query.filters?.userId) {
      sql += ' AND user_id = ?';
      params.push(query.filters.userId);
    }

    if (query.groupBy === 'testType') {
      sql += ' GROUP BY test_type, DATE(created_at)';
    } else {
      sql += ' GROUP BY DATE(created_at)';
    }

    sql += ' ORDER BY timestamp';

    const stmt = db.prepare(sql);
    const results = stmt.all(...params);

    return results.map((row: any) => ({
      timestamp: row.timestamp,
      group: query.groupBy === 'testType' ? row.group_field : undefined,
      value: Math.round(row.value * 100) / 100,
      metadata: {
        totalCount: row.total_count,
        successCount: row.success_count,
        metricType: 'success_rate_percentage'
      }
    }));
  }

  private queryErrorPatterns(db: any, query: AnalyticsQuery): any[] {
    let sql = `
      SELECT 
        error_message,
        COUNT(*) as value,
        DATE(created_at) as timestamp,
        test_type as group_field
      FROM test_executions
      WHERE created_at BETWEEN ? AND ?
        AND error_message IS NOT NULL
        AND error_message != ''
    `;

    const params = [query.timeRange.start.toISOString(), query.timeRange.end.toISOString()];

    if (query.filters?.testType) {
      sql += ' AND test_type = ?';
      params.push(query.filters.testType);
    }

    if (query.filters?.userId) {
      sql += ' AND user_id = ?';
      params.push(query.filters.userId);
    }

    sql += ' GROUP BY error_message, DATE(created_at) ORDER BY value DESC LIMIT 20';

    const stmt = db.prepare(sql);
    const results = stmt.all(...params);

    return results.map((row: any) => ({
      timestamp: row.timestamp,
      group: this.categorizeError(row.error_message),
      value: row.value,
      metadata: {
        errorMessage: row.error_message,
        metricType: 'error_frequency'
      }
    }));
  }

  private queryAIUsage(db: any, query: AnalyticsQuery): any[] {
    let sql = `
      SELECT 
        DATE(created_at) as timestamp,
        service_provider as group_field,
        COUNT(*) as request_count,
        SUM(input_tokens + output_tokens) as total_tokens,
        AVG(response_time) as avg_response_time,
        SUM(cost_estimate) as total_cost
      FROM ai_service_logs
      WHERE created_at BETWEEN ? AND ?
    `;

    const params = [query.timeRange.start.toISOString(), query.timeRange.end.toISOString()];

    if (query.filters?.aiModel) {
      sql += ' AND model_name LIKE ?';
      params.push(`%${query.filters.aiModel}%`);
    }

    if (query.filters?.userId) {
      sql += ' AND user_id = ?';
      params.push(query.filters.userId);
    }

    sql += ' GROUP BY DATE(created_at), service_provider ORDER BY timestamp';

    const stmt = db.prepare(sql);
    const results = stmt.all(...params);

    return results.map((row: any) => ({
      timestamp: row.timestamp,
      group: row.group_field,
      value: row.total_cost || 0,
      metadata: {
        requestCount: row.request_count,
        totalTokens: row.total_tokens,
        avgResponseTime: Math.round(row.avg_response_time || 0),
        metricType: 'ai_cost_dollars'
      }
    }));
  }

  private queryBusinessRuleCompliance(db: any, query: AnalyticsQuery): any[] {
    let sql = `
      SELECT 
        DATE(created_at) as timestamp,
        domain as group_field,
        AVG(
          CASE 
            WHEN status = 'compliant' THEN 100
            WHEN status = 'partially-compliant' THEN 70
            WHEN status = 'non-compliant' THEN 30
            ELSE 50
          END
        ) as value,
        COUNT(*) as count
      FROM business_rules
      WHERE created_at BETWEEN ? AND ?
        AND status IS NOT NULL
    `;

    const params = [query.timeRange.start.toISOString(), query.timeRange.end.toISOString()];

    if (query.filters?.domain) {
      sql += ' AND domain = ?';
      params.push(query.filters.domain);
    }

    if (query.filters?.userId) {
      sql += ' AND user_id = ?';
      params.push(query.filters.userId);
    }

    if (query.groupBy === 'domain') {
      sql += ' GROUP BY domain, DATE(created_at)';
    } else {
      sql += ' GROUP BY DATE(created_at)';
    }

    sql += ' ORDER BY timestamp';

    const stmt = db.prepare(sql);
    const results = stmt.all(...params);

    return results.map((row: any) => ({
      timestamp: row.timestamp,
      group: query.groupBy === 'domain' ? row.group_field : undefined,
      value: Math.round(row.value * 100) / 100,
      metadata: {
        count: row.count,
        metricType: 'compliance_score'
      }
    }));
  }

  private async calculateSummary(data: any[], query: AnalyticsQuery): Promise<any> {
    if (data.length === 0) {
      return {
        total: 0,
        average: 0,
        trend: 'stable'
      };
    }

    const values = data.map(d => d.value);
    const total = values.reduce((sum, val) => sum + val, 0);
    const average = total / values.length;

    // Calculate trend (simple linear regression on time series)
    const trend = this.calculateTrend(data);

    // Calculate period comparison if possible
    const midPoint = Math.floor(data.length / 2);
    let periodComparison;
    
    if (data.length >= 4) {
      const firstHalf = data.slice(0, midPoint);
      const secondHalf = data.slice(midPoint);
      
      const firstAvg = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;
      
      const change = secondAvg - firstAvg;
      const changePercent = firstAvg !== 0 ? (change / firstAvg) * 100 : 0;

      periodComparison = {
        current: Math.round(secondAvg * 100) / 100,
        previous: Math.round(firstAvg * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100
      };
    }

    return {
      total: Math.round(total * 100) / 100,
      average: Math.round(average * 100) / 100,
      trend,
      periodComparison
    };
  }

  private calculateTrend(data: any[]): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 3) return 'stable';

    // Simple trend calculation: compare first third with last third
    const firstThird = Math.floor(data.length / 3);
    const lastThird = data.length - firstThird;

    const firstAvg = data.slice(0, firstThird)
      .reduce((sum, d) => sum + d.value, 0) / firstThird;
    const lastAvg = data.slice(lastThird)
      .reduce((sum, d) => sum + d.value, 0) / (data.length - lastThird);

    const percentChange = ((lastAvg - firstAvg) / firstAvg) * 100;

    if (percentChange > 5) return 'increasing';
    if (percentChange < -5) return 'decreasing';
    return 'stable';
  }

  private categorizeError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('timeout') || message.includes('network')) return 'Network Issues';
    if (message.includes('syntax') || message.includes('parse')) return 'Syntax Errors';
    if (message.includes('auth') || message.includes('permission')) return 'Authentication';
    if (message.includes('validation') || message.includes('invalid')) return 'Validation Errors';
    if (message.includes('database') || message.includes('sql')) return 'Database Issues';
    if (message.includes('memory') || message.includes('resource')) return 'Resource Issues';
    
    return 'Other Errors';
  }

  private generateInsights(data: any[], summary: any, query: AnalyticsQuery): string[] {
    const insights: string[] = [];

    // Trend insights
    if (summary.trend === 'increasing') {
      insights.push(`${query.metric.replace('_', ' ')} is showing an upward trend`);
    } else if (summary.trend === 'decreasing') {
      insights.push(`${query.metric.replace('_', ' ')} is showing a downward trend`);
    }

    // Period comparison insights
    if (summary.periodComparison) {
      const { change, changePercent } = summary.periodComparison;
      if (Math.abs(changePercent) > 10) {
        const direction = change > 0 ? 'increased' : 'decreased';
        insights.push(`Performance has ${direction} by ${Math.abs(changePercent).toFixed(1)}% compared to the previous period`);
      }
    }

    // Metric-specific insights
    switch (query.metric) {
      case 'test_coverage':
        if (summary.average < 70) {
          insights.push('Test coverage is below recommended threshold of 70%');
        } else if (summary.average > 90) {
          insights.push('Excellent test coverage achieved!');
        }
        break;

      case 'success_rate':
        if (summary.average < 80) {
          insights.push('Success rate indicates potential quality issues that need attention');
        } else if (summary.average > 95) {
          insights.push('High success rate indicates robust test generation process');
        }
        break;

      case 'execution_time':
        if (summary.average > 5000) {
          insights.push('Average execution time is high - consider optimization');
        }
        break;

      case 'ai_usage':
        const totalCost = data.reduce((sum, d) => sum + d.value, 0);
        if (totalCost > 100) {
          insights.push('AI usage costs are significant - consider optimization strategies');
        }
        break;

      case 'business_rule_compliance':
        if (summary.average < 80) {
          insights.push('Business rule compliance needs improvement');
        }
        break;
    }

    // Data volume insights
    if (data.length < 5) {
      insights.push('Limited data available - longer time periods may provide better insights');
    }

    return insights.slice(0, 5); // Limit to 5 insights
  }

  public async getDashboardMetrics(userId?: string, timeRange?: { start: Date; end: Date }): Promise<any> {
    try {
      const defaultTimeRange = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        end: new Date()
      };

      const range = timeRange || defaultTimeRange;

      // Execute multiple queries in parallel
      const [testCoverage, successRate, aiUsage, businessRuleCompliance] = await Promise.all([
        this.queryMetrics({
          metric: 'test_coverage',
          timeRange: range,
          filters: userId ? { userId } : undefined,
          groupBy: 'day'
        }),
        this.queryMetrics({
          metric: 'success_rate',
          timeRange: range,
          filters: userId ? { userId } : undefined,
          groupBy: 'day'
        }),
        this.queryMetrics({
          metric: 'ai_usage',
          timeRange: range,
          filters: userId ? { userId } : undefined,
          groupBy: 'day'
        }),
        this.queryMetrics({
          metric: 'business_rule_compliance',
          timeRange: range,
          filters: userId ? { userId } : undefined,
          groupBy: 'day'
        })
      ]);

      return {
        success: true,
        data: {
          testCoverage,
          successRate,
          aiUsage,
          businessRuleCompliance
        },
        timeRange: range,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Failed to get dashboard metrics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async getTopMetrics(metricType: string, limit: number = 10): Promise<any> {
    try {
      const db = dbManager.getDatabase();
      let query = '';
      let results: any[] = [];

      switch (metricType) {
        case 'most_tested_functions':
          query = `
            SELECT target_function, COUNT(*) as test_count, 
                   AVG(coverage_percentage) as avg_coverage
            FROM test_executions 
            WHERE created_at >= datetime('now', '-30 days')
            GROUP BY target_function 
            ORDER BY test_count DESC 
            LIMIT ?`;
          results = db.prepare(query).all(limit);
          break;

        case 'highest_coverage_tests':
          query = `
            SELECT target_function, coverage_percentage, file_path, created_at
            FROM test_executions 
            WHERE coverage_percentage IS NOT NULL 
            ORDER BY coverage_percentage DESC 
            LIMIT ?`;
          results = db.prepare(query).all(limit);
          break;

        case 'most_active_users':
          query = `
            SELECT user_id, COUNT(*) as activity_count,
                   AVG(coverage_percentage) as avg_coverage
            FROM test_executions 
            WHERE created_at >= datetime('now', '-30 days')
            GROUP BY user_id 
            ORDER BY activity_count DESC 
            LIMIT ?`;
          results = db.prepare(query).all(limit);
          break;

        default:
          throw new Error(`Unknown metric type: ${metricType}`);
      }

      return {
        success: true,
        metricType,
        data: results,
        limit,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error(`Failed to get top metrics for ${metricType}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}