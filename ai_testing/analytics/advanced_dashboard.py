"""
Advanced Analytics Dashboard for AI-Enhanced Testing
Provides comprehensive insights, metrics, and visualizations for the testing framework.
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import statistics
from collections import defaultdict, Counter
import asyncio

# Add parent directory for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from ai_enhanced_tests.mcp_client import MCPClient
from ai_enhanced_tests.adaptive.adaptive_testing_engine import AdaptiveTestingEngine

logger = logging.getLogger(__name__)


@dataclass
class TestMetrics:
    """Comprehensive test metrics."""
    total_tests: int
    passed_tests: int
    failed_tests: int
    skipped_tests: int
    pass_rate: float
    avg_duration: float
    total_duration: float
    flaky_tests: List[str]
    coverage_percentage: float


@dataclass
class AIInsight:
    """AI-generated insight about testing."""
    category: str  # performance, quality, coverage, reliability
    title: str
    description: str
    severity: str  # low, medium, high, critical
    recommendations: List[str]
    confidence: float
    data_points: Dict[str, Any]


class AdvancedAnalyticsDashboard:
    """Advanced analytics dashboard for AI-enhanced testing framework."""
    
    def __init__(self, data_dir: str = "analytics_data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        
        # Historical data storage
        self.test_history: List[Dict[str, Any]] = []
        self.performance_trends: Dict[str, List[float]] = defaultdict(list)
        self.ai_insights: List[AIInsight] = []
        
        # Load existing data
        self._load_analytics_data()
    
    def record_test_run(self, test_results: Dict[str, Any]):
        """Record test run results for analysis."""
        try:
            # Standardize test result format
            standardized_result = {
                "timestamp": datetime.now().isoformat(),
                "run_id": test_results.get("run_id", f"run_{datetime.now().strftime('%Y%m%d_%H%M%S')}"),
                "total_tests": test_results.get("total", 0),
                "passed": test_results.get("passed", 0),
                "failed": test_results.get("failed", 0),
                "skipped": test_results.get("skipped", 0),
                "duration": test_results.get("duration", 0),
                "environment": test_results.get("environment", {}),
                "test_details": test_results.get("tests", []),
                "browser": test_results.get("browser", "unknown"),
                "platform": test_results.get("platform", "unknown")
            }
            
            self.test_history.append(standardized_result)
            
            # Update performance trends
            self._update_performance_trends(standardized_result)
            
            # Save data
            self._save_analytics_data()
            
            logger.info(f"Recorded test run: {standardized_result['run_id']}")
        
        except Exception as e:
            logger.error(f"Failed to record test run: {e}")
    
    def _update_performance_trends(self, test_result: Dict[str, Any]):
        """Update performance trend data."""
        timestamp = datetime.fromisoformat(test_result["timestamp"])
        day_key = timestamp.strftime("%Y-%m-%d")
        
        # Track daily metrics
        self.performance_trends[f"pass_rate_{day_key}"].append(
            test_result["passed"] / max(test_result["total_tests"], 1) * 100
        )
        self.performance_trends[f"avg_duration_{day_key}"].append(
            test_result["duration"] / max(test_result["total_tests"], 1)
        )
        self.performance_trends[f"total_tests_{day_key}"].append(test_result["total_tests"])
    
    async def generate_comprehensive_insights(self) -> List[AIInsight]:
        """Generate comprehensive AI insights about testing performance."""
        insights = []
        
        if not self.test_history:
            return insights
        
        try:
            # Generate different types of insights
            insights.extend(await self._analyze_pass_rate_trends())
            insights.extend(await self._analyze_performance_trends())
            insights.extend(await self._analyze_flaky_tests())
            insights.extend(await self._analyze_test_coverage())
            insights.extend(await self._analyze_failure_patterns())
            
            # Use AI for additional insights
            insights.extend(await self._get_ai_generated_insights())
            
            # Sort by severity and confidence
            insights.sort(key=lambda x: (self._severity_score(x.severity), -x.confidence), reverse=True)
            
            self.ai_insights = insights
            self._save_analytics_data()
            
        except Exception as e:
            logger.error(f"Failed to generate insights: {e}")
        
        return insights
    
    async def _analyze_pass_rate_trends(self) -> List[AIInsight]:
        """Analyze pass rate trends."""
        insights = []
        
        if len(self.test_history) < 3:
            return insights
        
        # Calculate recent pass rates
        recent_runs = self.test_history[-10:]
        pass_rates = [r["passed"] / max(r["total_tests"], 1) for r in recent_runs]
        
        avg_pass_rate = statistics.mean(pass_rates) * 100
        pass_rate_trend = self._calculate_trend(pass_rates)
        
        if avg_pass_rate < 70:
            insights.append(AIInsight(
                category="quality",
                title="Low Pass Rate Detected",
                description=f"Average pass rate is {avg_pass_rate:.1f}%, below the recommended 85%",
                severity="high" if avg_pass_rate < 50 else "medium",
                recommendations=[
                    "Review and fix failing tests",
                    "Improve test stability",
                    "Consider test environment issues",
                    "Implement better error handling"
                ],
                confidence=0.9,
                data_points={"avg_pass_rate": avg_pass_rate, "trend": pass_rate_trend}
            ))
        
        elif pass_rate_trend < -0.1:  # Declining trend
            insights.append(AIInsight(
                category="quality",
                title="Declining Pass Rate Trend",
                description=f"Pass rate has been declining (trend: {pass_rate_trend:.2f})",
                severity="medium",
                recommendations=[
                    "Investigate recent changes",
                    "Review test maintenance",
                    "Check for environmental issues"
                ],
                confidence=0.8,
                data_points={"trend": pass_rate_trend, "recent_pass_rates": pass_rates[-5:]}
            ))
        
        return insights
    
    async def _analyze_performance_trends(self) -> List[AIInsight]:
        """Analyze test performance trends."""
        insights = []
        
        if len(self.test_history) < 5:
            return insights
        
        # Calculate duration trends
        recent_runs = self.test_history[-10:]
        avg_durations = [r["duration"] / max(r["total_tests"], 1) for r in recent_runs]
        
        avg_duration = statistics.mean(avg_durations)
        duration_trend = self._calculate_trend(avg_durations)
        
        if avg_duration > 30:  # 30 seconds per test on average
            insights.append(AIInsight(
                category="performance",
                title="Slow Test Execution",
                description=f"Average test duration is {avg_duration:.1f} seconds per test",
                severity="medium",
                recommendations=[
                    "Optimize test selectors",
                    "Reduce explicit waits",
                    "Parallelize test execution",
                    "Review test setup/teardown"
                ],
                confidence=0.8,
                data_points={"avg_duration": avg_duration, "trend": duration_trend}
            ))
        
        elif duration_trend > 0.2:  # Increasing trend
            insights.append(AIInsight(
                category="performance",
                title="Increasing Test Duration",
                description=f"Test execution time is increasing (trend: {duration_trend:.2f})",
                severity="medium",
                recommendations=[
                    "Profile slow tests",
                    "Check for performance regressions",
                    "Optimize test infrastructure"
                ],
                confidence=0.7,
                data_points={"trend": duration_trend, "recent_durations": avg_durations[-5:]}
            ))
        
        return insights
    
    async def _analyze_flaky_tests(self) -> List[AIInsight]:
        """Analyze flaky test patterns."""
        insights = []
        
        # Track test results across runs
        test_outcomes = defaultdict(list)
        
        for run in self.test_history[-20:]:  # Last 20 runs
            for test in run.get("test_details", []):
                test_name = test.get("name", "unknown")
                test_status = test.get("status", "unknown")
                test_outcomes[test_name].append(test_status)
        
        # Identify flaky tests
        flaky_tests = []
        for test_name, outcomes in test_outcomes.items():
            if len(outcomes) >= 5:  # At least 5 runs
                pass_count = outcomes.count("passed")
                fail_count = outcomes.count("failed")
                
                # Flaky if both passes and fails exist
                if pass_count > 0 and fail_count > 0:
                    flakiness_score = min(pass_count, fail_count) / len(outcomes)
                    if flakiness_score >= 0.2:  # At least 20% flakiness
                        flaky_tests.append({
                            "name": test_name,
                            "flakiness_score": flakiness_score,
                            "outcomes": outcomes
                        })
        
        if flaky_tests:
            flaky_tests.sort(key=lambda x: x["flakiness_score"], reverse=True)
            top_flaky = flaky_tests[:5]
            
            insights.append(AIInsight(
                category="reliability",
                title="Flaky Tests Detected",
                description=f"Found {len(flaky_tests)} flaky tests with inconsistent results",
                severity="high" if len(flaky_tests) > 10 else "medium",
                recommendations=[
                    "Stabilize flaky tests with better waits",
                    "Review test data dependencies",
                    "Fix timing-related issues",
                    "Add retry mechanisms for unstable tests"
                ],
                confidence=0.9,
                data_points={
                    "flaky_count": len(flaky_tests),
                    "top_flaky_tests": [{"name": t["name"], "score": t["flakiness_score"]} for t in top_flaky]
                }
            ))
        
        return insights
    
    async def _analyze_test_coverage(self) -> List[AIInsight]:
        """Analyze test coverage patterns."""
        insights = []
        
        # Analyze test distribution across components
        component_coverage = defaultdict(int)
        
        for run in self.test_history[-5:]:  # Recent runs
            for test in run.get("test_details", []):
                test_name = test.get("name", "").lower()
                
                # Classify by component
                if "login" in test_name or "auth" in test_name:
                    component_coverage["authentication"] += 1
                elif "product" in test_name or "catalog" in test_name:
                    component_coverage["product_catalog"] += 1
                elif "cart" in test_name:
                    component_coverage["shopping_cart"] += 1
                elif "checkout" in test_name or "payment" in test_name:
                    component_coverage["checkout"] += 1
                elif "order" in test_name:
                    component_coverage["order_management"] += 1
                else:
                    component_coverage["other"] += 1
        
        total_tests = sum(component_coverage.values())
        if total_tests > 0:
            # Check for low coverage areas
            low_coverage_components = []
            for component, count in component_coverage.items():
                coverage_percentage = (count / total_tests) * 100
                if coverage_percentage < 10 and component != "other":  # Less than 10%
                    low_coverage_components.append(component)
            
            if low_coverage_components:
                insights.append(AIInsight(
                    category="coverage",
                    title="Low Test Coverage Areas",
                    description=f"Components with low test coverage: {', '.join(low_coverage_components)}",
                    severity="medium",
                    recommendations=[
                        f"Increase test coverage for {', '.join(low_coverage_components)}",
                        "Generate additional tests for uncovered areas",
                        "Review component criticality and add appropriate tests"
                    ],
                    confidence=0.8,
                    data_points={
                        "component_coverage": dict(component_coverage),
                        "low_coverage_components": low_coverage_components
                    }
                ))
        
        return insights
    
    async def _analyze_failure_patterns(self) -> List[AIInsight]:
        """Analyze failure patterns across test runs."""
        insights = []
        
        # Collect failure patterns
        failure_patterns = defaultdict(int)
        error_messages = []
        
        for run in self.test_history[-10:]:
            for test in run.get("test_details", []):
                if test.get("status") == "failed":
                    error_msg = test.get("error", "").lower()
                    error_messages.append(error_msg)
                    
                    # Categorize failures
                    if "timeout" in error_msg:
                        failure_patterns["timeout"] += 1
                    elif "selector" in error_msg or "element" in error_msg:
                        failure_patterns["element_not_found"] += 1
                    elif "network" in error_msg:
                        failure_patterns["network_issue"] += 1
                    elif "assertion" in error_msg:
                        failure_patterns["assertion_failure"] += 1
                    else:
                        failure_patterns["other"] += 1
        
        if failure_patterns:
            top_failure_type = max(failure_patterns.items(), key=lambda x: x[1])
            
            insights.append(AIInsight(
                category="reliability",
                title="Common Failure Pattern Detected",
                description=f"Most common failure type: {top_failure_type[0]} ({top_failure_type[1]} occurrences)",
                severity="medium",
                recommendations=[
                    f"Focus on fixing {top_failure_type[0]} issues",
                    "Implement preventive measures",
                    "Add better error handling"
                ],
                confidence=0.8,
                data_points={
                    "failure_patterns": dict(failure_patterns),
                    "top_failure": {"type": top_failure_type[0], "count": top_failure_type[1]}
                }
            ))
        
        return insights
    
    async def _get_ai_generated_insights(self) -> List[AIInsight]:
        """Get additional insights from AI analysis."""
        insights = []
        
        try:
            async with MCPClient() as client:
                # Prepare data for AI analysis
                analysis_data = {
                    "test_history": self.test_history[-20:],  # Recent history
                    "performance_trends": dict(self.performance_trends),
                    "request_type": "comprehensive_analysis"
                }
                
                ai_insights = await client.get_test_insights(analysis_data)
                
                # Convert AI insights to our format
                for insight in ai_insights.get("insights", []):
                    insights.append(AIInsight(
                        category="ai_analysis",
                        title=insight.get("title", "AI-Generated Insight"),
                        description=insight.get("description", ""),
                        severity=insight.get("severity", "medium"),
                        recommendations=insight.get("recommendations", []),
                        confidence=insight.get("confidence", 0.7),
                        data_points=insight.get("data", {})
                    ))
        
        except Exception as e:
            logger.warning(f"Could not get AI-generated insights: {e}")
        
        return insights
    
    def _calculate_trend(self, values: List[float]) -> float:
        """Calculate trend using simple linear regression slope."""
        if len(values) < 2:
            return 0.0
        
        n = len(values)
        x_sum = sum(range(n))
        y_sum = sum(values)
        xy_sum = sum(i * values[i] for i in range(n))
        x_sq_sum = sum(i * i for i in range(n))
        
        slope = (n * xy_sum - x_sum * y_sum) / (n * x_sq_sum - x_sum * x_sum)
        return slope
    
    def _severity_score(self, severity: str) -> int:
        """Convert severity to numeric score for sorting."""
        return {"critical": 4, "high": 3, "medium": 2, "low": 1}.get(severity, 1)
    
    def generate_dashboard_data(self) -> Dict[str, Any]:
        """Generate comprehensive dashboard data."""
        if not self.test_history:
            return {"message": "No test data available"}
        
        recent_run = self.test_history[-1] if self.test_history else {}
        recent_runs = self.test_history[-10:]
        
        # Calculate current metrics
        current_metrics = TestMetrics(
            total_tests=recent_run.get("total_tests", 0),
            passed_tests=recent_run.get("passed", 0),
            failed_tests=recent_run.get("failed", 0),
            skipped_tests=recent_run.get("skipped", 0),
            pass_rate=recent_run.get("passed", 0) / max(recent_run.get("total_tests", 1), 1) * 100,
            avg_duration=recent_run.get("duration", 0) / max(recent_run.get("total_tests", 1), 1),
            total_duration=recent_run.get("duration", 0),
            flaky_tests=[],  # Would be populated by flaky test analysis
            coverage_percentage=0.0  # Would be calculated from actual coverage data
        )
        
        # Historical trends
        historical_pass_rates = [
            r["passed"] / max(r["total_tests"], 1) * 100 for r in recent_runs
        ]
        historical_durations = [
            r["duration"] / max(r["total_tests"], 1) for r in recent_runs
        ]
        
        # Top insights (most critical)
        top_insights = sorted(self.ai_insights, 
                            key=lambda x: (self._severity_score(x.severity), -x.confidence), 
                            reverse=True)[:5]
        
        return {
            "current_metrics": asdict(current_metrics),
            "historical_trends": {
                "pass_rates": historical_pass_rates,
                "durations": historical_durations,
                "timestamps": [r["timestamp"] for r in recent_runs]
            },
            "top_insights": [asdict(insight) for insight in top_insights],
            "summary": {
                "total_runs": len(self.test_history),
                "avg_pass_rate": statistics.mean(historical_pass_rates) if historical_pass_rates else 0,
                "avg_duration": statistics.mean(historical_durations) if historical_durations else 0,
                "insights_count": len(self.ai_insights),
                "last_run": recent_run.get("timestamp", "Never")
            }
        }
    
    def export_insights_report(self) -> str:
        """Export insights as formatted report."""
        if not self.ai_insights:
            return "No insights available"
        
        report_lines = [
            "AI-Enhanced Testing Analytics Report",
            "=" * 40,
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"Total Insights: {len(self.ai_insights)}",
            ""
        ]
        
        # Group insights by category
        insights_by_category = defaultdict(list)
        for insight in self.ai_insights:
            insights_by_category[insight.category].append(insight)
        
        for category, insights in insights_by_category.items():
            report_lines.append(f"{category.upper()} INSIGHTS")
            report_lines.append("-" * 20)
            
            for insight in insights:
                report_lines.extend([
                    f"• {insight.title} ({insight.severity.upper()})",
                    f"  {insight.description}",
                    f"  Confidence: {insight.confidence:.2f}",
                    "  Recommendations:",
                ])
                
                for rec in insight.recommendations:
                    report_lines.append(f"    - {rec}")
                
                report_lines.append("")
        
        # Save report
        report_path = self.data_dir / f"insights_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(report_lines))
        
        return str(report_path)
    
    def _load_analytics_data(self):
        """Load analytics data from disk."""
        try:
            history_file = self.data_dir / "test_history.json"
            if history_file.exists():
                with open(history_file, 'r', encoding='utf-8') as f:
                    self.test_history = json.load(f)
            
            insights_file = self.data_dir / "ai_insights.json"
            if insights_file.exists():
                with open(insights_file, 'r', encoding='utf-8') as f:
                    insights_data = json.load(f)
                    self.ai_insights = [AIInsight(**insight) for insight in insights_data]
            
            logger.info(f"Loaded {len(self.test_history)} test runs and {len(self.ai_insights)} insights")
        
        except Exception as e:
            logger.warning(f"Could not load analytics data: {e}")
    
    def _save_analytics_data(self):
        """Save analytics data to disk."""
        try:
            with open(self.data_dir / "test_history.json", 'w', encoding='utf-8') as f:
                json.dump(self.test_history, f, indent=2, ensure_ascii=False)
            
            with open(self.data_dir / "ai_insights.json", 'w', encoding='utf-8') as f:
                insights_data = [asdict(insight) for insight in self.ai_insights]
                json.dump(insights_data, f, indent=2, ensure_ascii=False, default=str)
        
        except Exception as e:
            logger.error(f"Could not save analytics data: {e}")


async def main():
    """Example usage of analytics dashboard."""
    dashboard = AdvancedAnalyticsDashboard()
    
    # Simulate some test runs
    sample_runs = [
        {
            "run_id": "run_001",
            "total": 50,
            "passed": 45,
            "failed": 4,
            "skipped": 1,
            "duration": 1200,
            "tests": [
                {"name": "test_login", "status": "passed", "duration": 15},
                {"name": "test_product_search", "status": "failed", "error": "timeout waiting for selector"},
            ]
        },
        {
            "run_id": "run_002", 
            "total": 50,
            "passed": 47,
            "failed": 3,
            "skipped": 0,
            "duration": 1100,
            "tests": [
                {"name": "test_login", "status": "passed", "duration": 12},
                {"name": "test_checkout", "status": "failed", "error": "element not found"},
            ]
        }
    ]
    
    # Record test runs
    for run in sample_runs:
        dashboard.record_test_run(run)
    
    # Generate insights
    insights = await dashboard.generate_comprehensive_insights()
    print(f"Generated {len(insights)} insights")
    
    # Get dashboard data
    dashboard_data = dashboard.generate_dashboard_data()
    print(f"Dashboard summary: {json.dumps(dashboard_data['summary'], indent=2)}")
    
    # Export report
    report_path = dashboard.export_insights_report()
    print(f"Report exported to: {report_path}")


if __name__ == "__main__":
    asyncio.run(main())