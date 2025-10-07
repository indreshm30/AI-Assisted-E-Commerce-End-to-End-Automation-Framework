"""
Adaptive Testing Framework
Learns from test failures and automatically generates new tests or improves existing ones.
"""

import asyncio
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import re
import pickle
from collections import defaultdict, Counter
import statistics

# Add parent directory for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from ai_enhanced_tests.mcp_client import MCPClient, TestGenerationRequest
from ai_enhanced_tests.generators.ai_test_generator import AITestGenerator

logger = logging.getLogger(__name__)


@dataclass
class TestFailurePattern:
    """Pattern of test failures for learning."""
    test_name: str
    failure_type: str
    error_message: str
    element_selector: Optional[str]
    timestamp: datetime
    frequency: int = 1
    context: Dict[str, Any] = None


@dataclass
class AdaptiveRule:
    """Rule learned from failure patterns."""
    rule_id: str
    pattern: str
    suggested_fix: str
    confidence: float
    success_rate: float
    created_at: datetime
    last_applied: Optional[datetime] = None


class AdaptiveTestingEngine:
    """Engine that learns from test failures and adapts testing strategy."""
    
    def __init__(self, data_dir: str = "adaptive_data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        
        # Data storage
        self.failure_patterns: List[TestFailurePattern] = []
        self.adaptive_rules: List[AdaptiveRule] = []
        self.success_improvements: Dict[str, List[float]] = defaultdict(list)
        
        # Configuration
        self.learning_window = timedelta(days=7)  # Learn from last 7 days
        self.min_pattern_frequency = 3  # Minimum occurrences to create rule
        self.confidence_threshold = 0.7  # Minimum confidence for auto-apply
        
        # Load existing data
        self._load_adaptive_data()
    
    def record_test_failure(self, test_result: Dict[str, Any]):
        """Record a test failure for learning."""
        try:
            failure_pattern = self._extract_failure_pattern(test_result)
            if failure_pattern:
                # Check if we've seen this pattern before
                existing_pattern = self._find_existing_pattern(failure_pattern)
                if existing_pattern:
                    existing_pattern.frequency += 1
                    existing_pattern.timestamp = datetime.now()
                else:
                    self.failure_patterns.append(failure_pattern)
                
                logger.info(f"Recorded failure pattern: {failure_pattern.failure_type}")
                self._save_adaptive_data()
        
        except Exception as e:
            logger.error(f"Failed to record test failure: {e}")
    
    def _extract_failure_pattern(self, test_result: Dict[str, Any]) -> Optional[TestFailurePattern]:
        """Extract failure pattern from test result."""
        if test_result.get("status") != "failed":
            return None
        
        error_message = test_result.get("error_message", "")
        test_name = test_result.get("test_name", "")
        
        # Classify failure type
        failure_type = self._classify_failure(error_message)
        
        # Extract element selector if UI-related
        element_selector = self._extract_element_selector(error_message)
        
        # Extract additional context
        context = {
            "browser": test_result.get("browser", "unknown"),
            "viewport": test_result.get("viewport", {}),
            "duration": test_result.get("duration", 0),
            "url": test_result.get("url", ""),
            "screenshot": test_result.get("screenshot", "")
        }
        
        return TestFailurePattern(
            test_name=test_name,
            failure_type=failure_type,
            error_message=error_message,
            element_selector=element_selector,
            timestamp=datetime.now(),
            context=context
        )
    
    def _classify_failure(self, error_message: str) -> str:
        """Classify failure type based on error message."""
        error_lower = error_message.lower()
        
        # Common failure patterns
        if any(word in error_lower for word in ["timeout", "wait", "element not found"]):
            return "timing_issue"
        elif any(word in error_lower for word in ["selector", "locator", "element"]):
            return "element_selector"
        elif any(word in error_lower for word in ["network", "connection", "request"]):
            return "network_issue"
        elif any(word in error_lower for word in ["assertion", "expected", "actual"]):
            return "assertion_failure"
        elif any(word in error_lower for word in ["permission", "access", "forbidden"]):
            return "permission_issue"
        elif any(word in error_lower for word in ["data", "invalid", "null"]):
            return "data_issue"
        else:
            return "unknown"
    
    def _extract_element_selector(self, error_message: str) -> Optional[str]:
        """Extract element selector from error message."""
        # Common patterns for element selectors in error messages
        patterns = [
            r"locator\s+['\"]([^'\"]+)['\"]",
            r"element\s+['\"]([^'\"]+)['\"]",
            r"selector\s+['\"]([^'\"]+)['\"]",
            r"['\"]([#\.\[\]@\w\-:]+)['\"]"  # CSS selector pattern
        ]
        
        for pattern in patterns:
            match = re.search(pattern, error_message, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return None
    
    def _find_existing_pattern(self, new_pattern: TestFailurePattern) -> Optional[TestFailurePattern]:
        """Find existing similar pattern."""
        for existing in self.failure_patterns:
            if (existing.test_name == new_pattern.test_name and
                existing.failure_type == new_pattern.failure_type and
                existing.element_selector == new_pattern.element_selector):
                return existing
        return None
    
    async def analyze_patterns_and_create_rules(self) -> List[AdaptiveRule]:
        """Analyze failure patterns and create adaptive rules."""
        new_rules = []
        
        # Group patterns by type
        pattern_groups = defaultdict(list)
        for pattern in self.failure_patterns:
            if pattern.frequency >= self.min_pattern_frequency:
                pattern_groups[pattern.failure_type].append(pattern)
        
        # Create rules for each pattern type
        for failure_type, patterns in pattern_groups.items():
            rule = await self._create_rule_for_pattern_group(failure_type, patterns)
            if rule and rule.confidence >= self.confidence_threshold:
                new_rules.append(rule)
                self.adaptive_rules.append(rule)
        
        logger.info(f"Created {len(new_rules)} new adaptive rules")
        self._save_adaptive_data()
        return new_rules
    
    async def _create_rule_for_pattern_group(self, failure_type: str, patterns: List[TestFailurePattern]) -> Optional[AdaptiveRule]:
        """Create adaptive rule for a group of similar patterns."""
        # Calculate confidence based on pattern frequency and consistency
        total_frequency = sum(p.frequency for p in patterns)
        avg_frequency = total_frequency / len(patterns)
        confidence = min(avg_frequency / 10, 1.0)  # Max confidence of 1.0
        
        # Generate rule based on failure type
        rule_id = f"{failure_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        if failure_type == "timing_issue":
            suggested_fix = self._create_timing_fix_suggestion(patterns)
        elif failure_type == "element_selector":
            suggested_fix = self._create_selector_fix_suggestion(patterns)
        elif failure_type == "network_issue":
            suggested_fix = "Add network retry logic and longer timeouts for network requests"
        elif failure_type == "assertion_failure":
            suggested_fix = await self._create_assertion_fix_suggestion(patterns)
        else:
            suggested_fix = f"Generic fix for {failure_type}: Review test logic and add error handling"
        
        return AdaptiveRule(
            rule_id=rule_id,
            pattern=failure_type,
            suggested_fix=suggested_fix,
            confidence=confidence,
            success_rate=0.0,  # Will be updated as rule is applied
            created_at=datetime.now()
        )
    
    def _create_timing_fix_suggestion(self, patterns: List[TestFailurePattern]) -> str:
        """Create timing fix suggestion."""
        common_selectors = [p.element_selector for p in patterns if p.element_selector]
        if common_selectors:
            selector = Counter(common_selectors).most_common(1)[0][0]
            return f"Add explicit wait for element '{selector}' with increased timeout (30s+)"
        else:
            return "Add explicit waits and increase default timeout values"
    
    def _create_selector_fix_suggestion(self, patterns: List[TestFailurePattern]) -> str:
        """Create selector fix suggestion."""
        selectors = [p.element_selector for p in patterns if p.element_selector]
        if selectors:
            # Suggest more robust selector strategies
            return f"Update selectors to use more robust locators (data-testid, role-based). Problem selectors: {', '.join(set(selectors[:3]))}"
        else:
            return "Review element selectors and use more stable locator strategies"
    
    async def _create_assertion_fix_suggestion(self, patterns: List[TestFailurePattern]) -> str:
        """Create assertion fix suggestion using AI."""
        # Use MCP client to analyze assertion failures
        try:
            async with MCPClient() as client:
                analysis_data = {
                    "failure_patterns": [asdict(p) for p in patterns[:5]],
                    "failure_type": "assertion_failure"
                }
                result = await client.analyze_test_failures(analysis_data)
                return result.get("suggested_fix", "Review assertion logic and expected values")
        except Exception as e:
            logger.warning(f"Could not get AI suggestion for assertions: {e}")
            return "Review assertion logic, expected values, and test data"
    
    async def apply_adaptive_improvements(self, test_file_path: str) -> Dict[str, Any]:
        """Apply adaptive improvements to a test file."""
        improvements_applied = []
        
        try:
            # Read test file
            with open(test_file_path, 'r', encoding='utf-8') as f:
                test_content = f.read()
            
            original_content = test_content
            
            # Apply applicable rules
            for rule in self.adaptive_rules:
                if rule.confidence >= self.confidence_threshold:
                    modified_content, applied = self._apply_rule_to_content(test_content, rule)
                    if applied:
                        test_content = modified_content
                        improvements_applied.append({
                            "rule_id": rule.rule_id,
                            "pattern": rule.pattern,
                            "fix": rule.suggested_fix
                        })
                        rule.last_applied = datetime.now()
            
            # Write back if changes were made
            if improvements_applied:
                # Create backup
                backup_path = Path(test_file_path).with_suffix('.py.backup')
                with open(backup_path, 'w', encoding='utf-8') as f:
                    f.write(original_content)
                
                # Write improved version
                with open(test_file_path, 'w', encoding='utf-8') as f:
                    f.write(test_content)
                
                logger.info(f"Applied {len(improvements_applied)} adaptive improvements to {test_file_path}")
        
        except Exception as e:
            logger.error(f"Failed to apply adaptive improvements: {e}")
        
        return {
            "file_path": test_file_path,
            "improvements_applied": improvements_applied,
            "backup_created": str(backup_path) if improvements_applied else None
        }
    
    def _apply_rule_to_content(self, content: str, rule: AdaptiveRule) -> Tuple[str, bool]:
        """Apply adaptive rule to test content."""
        modified = False
        
        if rule.pattern == "timing_issue":
            # Add explicit waits
            if "page.wait_for_selector" not in content and "click(" in content:
                content = content.replace(
                    "page.click(",
                    "page.wait_for_selector(selector, timeout=30000)\n        page.click("
                )
                modified = True
        
        elif rule.pattern == "element_selector":
            # Suggest data-testid usage
            if 'data-testid' not in content and '"#' in content:
                content = f"# ADAPTIVE SUGGESTION: Consider using data-testid selectors for better stability\n{content}"
                modified = True
        
        elif rule.pattern == "network_issue":
            # Add retry logic
            if "requests." in content and "retry" not in content.lower():
                retry_import = "import time\nfrom requests.adapters import HTTPAdapter\nfrom urllib3.util.retry import Retry\n"
                if retry_import.strip() not in content:
                    content = f"{retry_import}\n{content}"
                    modified = True
        
        return content, modified
    
    async def generate_predictive_tests(self, component: str) -> List[str]:
        """Generate predictive tests based on failure patterns."""
        predictive_tests = []
        
        # Analyze patterns for the component
        component_patterns = [p for p in self.failure_patterns 
                            if component.lower() in p.test_name.lower() or 
                            component.lower() in str(p.context).lower()]
        
        if not component_patterns:
            return predictive_tests
        
        # Group patterns and generate preventive tests
        pattern_groups = defaultdict(list)
        for pattern in component_patterns:
            pattern_groups[pattern.failure_type].append(pattern)
        
        generator = AITestGenerator("predictive_tests")
        
        for failure_type, patterns in pattern_groups.items():
            # Create user story for predictive test
            user_story = f"As a tester, I want to prevent {failure_type} issues in {component}"
            
            try:
                async with MCPClient() as client:
                    request = TestGenerationRequest(
                        user_story=user_story,
                        test_type="e2e",
                        component_context=component,
                        business_rules=[f"Prevent {failure_type} failures based on historical data"]
                    )
                    
                    result = await client.generate_tests(request)
                    test_file = generator._create_test_file(result, user_story, "predictive")
                    predictive_tests.append(test_file)
            
            except Exception as e:
                logger.error(f"Failed to generate predictive test for {failure_type}: {e}")
        
        return predictive_tests
    
    def get_adaptation_insights(self) -> Dict[str, Any]:
        """Get insights about adaptation and learning."""
        recent_patterns = [p for p in self.failure_patterns 
                         if p.timestamp > datetime.now() - self.learning_window]
        
        # Calculate metrics
        pattern_stats = Counter(p.failure_type for p in recent_patterns)
        
        # Rule effectiveness
        effective_rules = [r for r in self.adaptive_rules if r.success_rate > 0.5]
        
        # Trend analysis
        daily_failures = defaultdict(int)
        for pattern in recent_patterns:
            day = pattern.timestamp.date()
            daily_failures[day] += pattern.frequency
        
        return {
            "total_patterns_learned": len(self.failure_patterns),
            "recent_patterns": len(recent_patterns),
            "pattern_types": dict(pattern_stats),
            "active_rules": len(self.adaptive_rules),
            "effective_rules": len(effective_rules),
            "learning_window_days": self.learning_window.days,
            "daily_failure_trend": dict(daily_failures),
            "top_failure_types": pattern_stats.most_common(5),
            "avg_rule_confidence": statistics.mean([r.confidence for r in self.adaptive_rules]) if self.adaptive_rules else 0
        }
    
    def _load_adaptive_data(self):
        """Load adaptive data from disk."""
        try:
            patterns_file = self.data_dir / "failure_patterns.pkl"
            if patterns_file.exists():
                with open(patterns_file, 'rb') as f:
                    self.failure_patterns = pickle.load(f)
            
            rules_file = self.data_dir / "adaptive_rules.pkl"
            if rules_file.exists():
                with open(rules_file, 'rb') as f:
                    self.adaptive_rules = pickle.load(f)
            
            logger.info(f"Loaded {len(self.failure_patterns)} patterns and {len(self.adaptive_rules)} rules")
        
        except Exception as e:
            logger.warning(f"Could not load adaptive data: {e}")
    
    def _save_adaptive_data(self):
        """Save adaptive data to disk."""
        try:
            with open(self.data_dir / "failure_patterns.pkl", 'wb') as f:
                pickle.dump(self.failure_patterns, f)
            
            with open(self.data_dir / "adaptive_rules.pkl", 'wb') as f:
                pickle.dump(self.adaptive_rules, f)
        
        except Exception as e:
            logger.error(f"Could not save adaptive data: {e}")


async def main():
    """Example usage of adaptive testing engine."""
    engine = AdaptiveTestingEngine()
    
    # Simulate some test failures
    test_failures = [
        {
            "test_name": "test_product_search",
            "status": "failed",
            "error_message": "Timeout waiting for selector '#search-results'",
            "browser": "chromium",
            "duration": 30000
        },
        {
            "test_name": "test_add_to_cart",
            "status": "failed", 
            "error_message": "Element not found: '.add-to-cart-btn'",
            "browser": "firefox",
            "duration": 15000
        }
    ]
    
    # Record failures
    for failure in test_failures:
        engine.record_test_failure(failure)
    
    # Analyze and create rules
    new_rules = await engine.analyze_patterns_and_create_rules()
    print(f"Created {len(new_rules)} adaptive rules")
    
    # Get insights
    insights = engine.get_adaptation_insights()
    print(f"Adaptation insights: {json.dumps(insights, indent=2, default=str)}")
    
    # Generate predictive tests
    predictive_tests = await engine.generate_predictive_tests("product_search")
    print(f"Generated {len(predictive_tests)} predictive tests")


if __name__ == "__main__":
    asyncio.run(main())