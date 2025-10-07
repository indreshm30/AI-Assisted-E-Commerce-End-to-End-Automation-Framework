"""
AI-Enhanced Test Orchestrator
Main orchestration system that coordinates AI test generation, adaptive learning, 
analytics, and test execution with our MCP server.
"""

import asyncio
import argparse
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import sys
import subprocess

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from ai_enhanced_tests.mcp_client import MCPClient, TestGenerationRequest
from ai_enhanced_tests.generators.ai_test_generator import AITestGenerator
from ai_enhanced_tests.adaptive.adaptive_testing_engine import AdaptiveTestingEngine
from ai_enhanced_tests.analytics.advanced_dashboard import AdvancedAnalyticsDashboard

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ai_enhanced_testing.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class AIEnhancedTestOrchestrator:
    """Main orchestrator for AI-enhanced testing framework."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or self._load_default_config()
        
        # Initialize components
        self.mcp_client = MCPClient()
        self.test_generator = AITestGenerator(self.config.get("generated_tests_dir", "ai_generated_tests"))
        self.adaptive_engine = AdaptiveTestingEngine(self.config.get("adaptive_data_dir", "adaptive_data"))
        self.analytics_dashboard = AdvancedAnalyticsDashboard(self.config.get("analytics_data_dir", "analytics_data"))
        
        # State tracking
        self.current_session = {
            "session_id": f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "start_time": datetime.now(),
            "tests_generated": 0,
            "tests_executed": 0,
            "adaptations_applied": 0,
            "insights_generated": 0
        }
    
    def _load_default_config(self) -> Dict[str, Any]:
        """Load default configuration."""
        return {
            "mcp_server_url": "http://localhost:3003",
            "generated_tests_dir": "ai_generated_tests",
            "adaptive_data_dir": "adaptive_data", 
            "analytics_data_dir": "analytics_data",
            "test_execution": {
                "parallel_workers": 4,
                "timeout": 300,
                "retry_failed": True,
                "max_retries": 2
            },
            "ai_generation": {
                "confidence_threshold": 0.6,
                "max_tests_per_story": 5,
                "include_predictive": True
            },
            "adaptive_learning": {
                "auto_apply_fixes": True,
                "learning_window_days": 7,
                "min_pattern_frequency": 3
            },
            "analytics": {
                "generate_insights": True,
                "export_reports": True,
                "real_time_monitoring": False
            }
        }
    
    async def run_full_ai_cycle(self, user_stories: List[str] = None, test_type: str = "e2e") -> Dict[str, Any]:
        """Run full AI-enhanced testing cycle."""
        logger.info("Starting AI-enhanced testing cycle")
        
        try:
            # Phase 1: Generate tests from user stories
            if user_stories:
                await self._phase_generate_tests(user_stories, test_type)
            
            # Phase 2: Execute tests and collect results
            test_results = await self._phase_execute_tests()
            
            # Phase 3: Learn from failures and adapt
            await self._phase_adaptive_learning(test_results)
            
            # Phase 4: Generate analytics and insights
            insights = await self._phase_generate_insights(test_results)
            
            # Phase 5: Generate predictive tests
            await self._phase_predictive_testing()
            
            # Compile final results
            return self._compile_session_results(test_results, insights)
        
        except Exception as e:
            logger.error(f"AI cycle failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def _phase_generate_tests(self, user_stories: List[str], test_type: str):
        """Phase 1: AI-powered test generation."""
        logger.info(f"Phase 1: Generating {test_type} tests from {len(user_stories)} user stories")
        
        try:
            generated_files = await self.test_generator.generate_from_user_stories(user_stories, test_type)
            self.current_session["tests_generated"] = len(generated_files)
            
            logger.info(f"Generated {len(generated_files)} test files")
            
            # Generate summary
            summary = self.test_generator.generate_test_summary()
            logger.info(f"Generation Summary:\n{summary}")
        
        except Exception as e:
            logger.error(f"Test generation failed: {e}")
            raise
    
    async def _phase_execute_tests(self) -> Dict[str, Any]:
        """Phase 2: Execute tests and collect results."""
        logger.info("Phase 2: Executing tests")
        
        try:
            # Find all available test files
            test_files = self._discover_test_files()
            
            if not test_files:
                logger.warning("No test files found for execution")
                return {"total": 0, "passed": 0, "failed": 0, "tests": []}
            
            # Execute tests using pytest
            results = await self._execute_pytest_tests(test_files)
            
            self.current_session["tests_executed"] = results.get("total", 0)
            
            # Record results in analytics
            self.analytics_dashboard.record_test_run(results)
            
            logger.info(f"Executed {results.get('total', 0)} tests: "
                       f"{results.get('passed', 0)} passed, {results.get('failed', 0)} failed")
            
            return results
        
        except Exception as e:
            logger.error(f"Test execution failed: {e}")
            return {"total": 0, "passed": 0, "failed": 0, "tests": [], "error": str(e)}
    
    async def _phase_adaptive_learning(self, test_results: Dict[str, Any]):
        """Phase 3: Learn from failures and adapt."""
        logger.info("Phase 3: Adaptive learning from test results")
        
        try:
            # Record failures for learning
            for test in test_results.get("tests", []):
                if test.get("status") == "failed":
                    self.adaptive_engine.record_test_failure(test)
            
            # Analyze patterns and create rules
            new_rules = await self.adaptive_engine.analyze_patterns_and_create_rules()
            logger.info(f"Created {len(new_rules)} new adaptive rules")
            
            # Apply improvements to test files if enabled
            if self.config.get("adaptive_learning", {}).get("auto_apply_fixes", True):
                test_files = self._discover_test_files()
                improvements_applied = 0
                
                for test_file in test_files:
                    try:
                        result = await self.adaptive_engine.apply_adaptive_improvements(str(test_file))
                        if result.get("improvements_applied"):
                            improvements_applied += len(result["improvements_applied"])
                    except Exception as e:
                        logger.warning(f"Could not apply improvements to {test_file}: {e}")
                
                self.current_session["adaptations_applied"] = improvements_applied
                logger.info(f"Applied {improvements_applied} adaptive improvements")
        
        except Exception as e:
            logger.error(f"Adaptive learning failed: {e}")
    
    async def _phase_generate_insights(self, test_results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Phase 4: Generate analytics and insights."""
        logger.info("Phase 4: Generating analytics and insights")
        
        try:
            # Generate comprehensive insights
            insights = await self.analytics_dashboard.generate_comprehensive_insights()
            self.current_session["insights_generated"] = len(insights)
            
            logger.info(f"Generated {len(insights)} AI insights")
            
            # Export reports if enabled
            if self.config.get("analytics", {}).get("export_reports", True):
                report_path = self.analytics_dashboard.export_insights_report()
                logger.info(f"Exported insights report: {report_path}")
            
            return [{"title": i.title, "description": i.description, 
                    "severity": i.severity, "confidence": i.confidence} for i in insights]
        
        except Exception as e:
            logger.error(f"Insights generation failed: {e}")
            return []
    
    async def _phase_predictive_testing(self):
        """Phase 5: Generate predictive tests."""
        logger.info("Phase 5: Generating predictive tests")
        
        try:
            if self.config.get("ai_generation", {}).get("include_predictive", True):
                # Generate predictive tests for key components
                components = ["authentication", "checkout", "product_search", "cart"]
                
                total_predictive = 0
                for component in components:
                    predictive_tests = await self.adaptive_engine.generate_predictive_tests(component)
                    total_predictive += len(predictive_tests)
                    logger.info(f"Generated {len(predictive_tests)} predictive tests for {component}")
                
                logger.info(f"Total predictive tests generated: {total_predictive}")
        
        except Exception as e:
            logger.error(f"Predictive testing failed: {e}")
    
    def _discover_test_files(self) -> List[Path]:
        """Discover test files in the project."""
        test_files = []
        
        # Look in standard test directories
        test_dirs = ["tests", "ai_generated_tests", "predictive_tests"]
        
        for test_dir in test_dirs:
            test_path = Path(test_dir)
            if test_path.exists():
                # Find Python test files
                test_files.extend(test_path.glob("test_*.py"))
                test_files.extend(test_path.glob("*_test.py"))
        
        return test_files
    
    async def _execute_pytest_tests(self, test_files: List[Path]) -> Dict[str, Any]:
        """Execute tests using pytest."""
        if not test_files:
            return {"total": 0, "passed": 0, "failed": 0, "tests": []}
        
        try:
            # Build pytest command
            cmd = [
                "python", "-m", "pytest",
                "--json-report", "--json-report-file=test_results.json",
                "-v"
            ] + [str(f) for f in test_files]
            
            # Execute pytest
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=".")
            
            # Parse JSON results if available
            results_file = Path("test_results.json")
            if results_file.exists():
                try:
                    with open(results_file, 'r') as f:
                        pytest_results = json.load(f)
                    
                    # Convert to our format
                    return self._convert_pytest_results(pytest_results)
                
                except Exception as e:
                    logger.warning(f"Could not parse pytest JSON results: {e}")
            
            # Fallback: parse text output
            return self._parse_pytest_text_output(result.stdout, result.stderr, result.returncode)
        
        except Exception as e:
            logger.error(f"Pytest execution failed: {e}")
            return {"total": 0, "passed": 0, "failed": 0, "tests": [], "error": str(e)}
    
    def _convert_pytest_results(self, pytest_results: Dict[str, Any]) -> Dict[str, Any]:
        """Convert pytest JSON results to our format."""
        summary = pytest_results.get("summary", {})
        tests = pytest_results.get("tests", [])
        
        converted_tests = []
        for test in tests:
            converted_tests.append({
                "name": test.get("nodeid", ""),
                "status": "passed" if test.get("outcome") == "passed" else "failed",
                "duration": test.get("call", {}).get("duration", 0),
                "error": test.get("call", {}).get("longrepr", "") if test.get("outcome") == "failed" else ""
            })
        
        return {
            "run_id": f"pytest_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "total": summary.get("total", 0),
            "passed": summary.get("passed", 0),
            "failed": summary.get("failed", 0),
            "skipped": summary.get("skipped", 0),
            "duration": pytest_results.get("duration", 0),
            "tests": converted_tests,
            "environment": {"executor": "pytest", "timestamp": datetime.now().isoformat()}
        }
    
    def _parse_pytest_text_output(self, stdout: str, stderr: str, returncode: int) -> Dict[str, Any]:
        """Parse pytest text output as fallback."""
        # Simple parsing - this is a fallback method
        total = stdout.count("PASSED") + stdout.count("FAILED") + stdout.count("SKIPPED")
        passed = stdout.count("PASSED")
        failed = stdout.count("FAILED")
        skipped = stdout.count("SKIPPED")
        
        return {
            "run_id": f"pytest_text_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "total": total,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "duration": 0,  # Cannot extract from text easily
            "tests": [],  # Cannot extract detailed test info
            "environment": {"executor": "pytest_text", "returncode": returncode}
        }
    
    def _compile_session_results(self, test_results: Dict[str, Any], insights: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Compile final session results."""
        session_duration = datetime.now() - self.current_session["start_time"]
        
        return {
            "success": True,
            "session": self.current_session,
            "duration_seconds": session_duration.total_seconds(),
            "test_execution": test_results,
            "ai_insights": insights,
            "adaptive_insights": self.adaptive_engine.get_adaptation_insights(),
            "dashboard_data": self.analytics_dashboard.generate_dashboard_data(),
            "summary": {
                "tests_generated": self.current_session["tests_generated"],
                "tests_executed": self.current_session["tests_executed"],
                "adaptations_applied": self.current_session["adaptations_applied"],
                "insights_generated": self.current_session["insights_generated"],
                "pass_rate": test_results.get("passed", 0) / max(test_results.get("total", 1), 1) * 100
            }
        }
    
    async def interactive_mode(self):
        """Run in interactive mode for manual control."""
        print("AI-Enhanced Testing Framework - Interactive Mode")
        print("=" * 50)
        
        while True:
            print("\nAvailable Commands:")
            print("1. Generate tests from user stories")
            print("2. Execute existing tests")
            print("3. Run adaptive analysis")
            print("4. Generate insights")
            print("5. Run full AI cycle")
            print("6. View dashboard")
            print("7. Exit")
            
            choice = input("\nEnter your choice (1-7): ").strip()
            
            try:
                if choice == "1":
                    await self._interactive_generate_tests()
                elif choice == "2":
                    await self._interactive_execute_tests()
                elif choice == "3":
                    await self._interactive_adaptive_analysis()
                elif choice == "4":
                    await self._interactive_generate_insights()
                elif choice == "5":
                    await self._interactive_full_cycle()
                elif choice == "6":
                    self._interactive_view_dashboard()
                elif choice == "7":
                    print("Goodbye!")
                    break
                else:
                    print("Invalid choice. Please try again.")
            
            except KeyboardInterrupt:
                print("\nOperation cancelled.")
            except Exception as e:
                print(f"Error: {e}")
    
    async def _interactive_generate_tests(self):
        """Interactive test generation."""
        print("\nTest Generation")
        print("-" * 15)
        
        stories = []
        print("Enter user stories (press Enter twice to finish):")
        while True:
            story = input("Story: ").strip()
            if not story:
                break
            stories.append(story)
        
        if not stories:
            print("No user stories provided.")
            return
        
        test_type = input("Test type (e2e/integration/unit) [e2e]: ").strip() or "e2e"
        
        print(f"\nGenerating {test_type} tests for {len(stories)} user stories...")
        await self._phase_generate_tests(stories, test_type)
        print("Test generation completed!")
    
    async def _interactive_execute_tests(self):
        """Interactive test execution."""
        print("\nTest Execution")
        print("-" * 14)
        
        test_files = self._discover_test_files()
        print(f"Found {len(test_files)} test files")
        
        if test_files:
            print("Executing tests...")
            results = await self._phase_execute_tests()
            print(f"Results: {results.get('passed', 0)}/{results.get('total', 0)} tests passed")
        else:
            print("No test files found.")
    
    async def _interactive_adaptive_analysis(self):
        """Interactive adaptive analysis."""
        print("\nAdaptive Analysis")
        print("-" * 16)
        
        # Mock some test results for demonstration
        sample_results = {
            "tests": [
                {"status": "failed", "name": "test_example", "error": "timeout waiting for selector"}
            ]
        }
        
        await self._phase_adaptive_learning(sample_results)
        insights = self.adaptive_engine.get_adaptation_insights()
        print(f"Adaptive insights: {json.dumps(insights, indent=2)}")
    
    async def _interactive_generate_insights(self):
        """Interactive insights generation."""
        print("\nGenerating AI Insights")
        print("-" * 20)
        
        insights = await self._phase_generate_insights({})
        print(f"Generated {len(insights)} insights")
        
        for i, insight in enumerate(insights[:3], 1):
            print(f"\n{i}. {insight['title']} ({insight['severity']})")
            print(f"   {insight['description']}")
    
    async def _interactive_full_cycle(self):
        """Interactive full cycle execution."""
        print("\nFull AI Cycle")
        print("-" * 13)
        
        # Use sample user stories
        sample_stories = [
            "As a customer, I want to search for products",
            "As a user, I want to add items to cart",
            "As a customer, I want to complete checkout"
        ]
        
        print("Running full AI-enhanced testing cycle...")
        results = await self.run_full_ai_cycle(sample_stories)
        
        if results.get("success"):
            summary = results.get("summary", {})
            print(f"\nCycle completed successfully!")
            print(f"Tests generated: {summary.get('tests_generated', 0)}")
            print(f"Tests executed: {summary.get('tests_executed', 0)}")
            print(f"Pass rate: {summary.get('pass_rate', 0):.1f}%")
            print(f"Insights: {summary.get('insights_generated', 0)}")
        else:
            print(f"Cycle failed: {results.get('error', 'Unknown error')}")
    
    def _interactive_view_dashboard(self):
        """Interactive dashboard view."""
        print("\nDashboard Data")
        print("-" * 14)
        
        dashboard_data = self.analytics_dashboard.generate_dashboard_data()
        
        if "summary" in dashboard_data:
            summary = dashboard_data["summary"]
            print(f"Total runs: {summary.get('total_runs', 0)}")
            print(f"Average pass rate: {summary.get('avg_pass_rate', 0):.1f}%")
            print(f"Average duration: {summary.get('avg_duration', 0):.1f}s")
            print(f"Insights count: {summary.get('insights_count', 0)}")
        else:
            print("No dashboard data available.")


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="AI-Enhanced Testing Framework")
    parser.add_argument("--mode", choices=["auto", "interactive"], default="interactive",
                       help="Execution mode")
    parser.add_argument("--config", help="Configuration file path")
    parser.add_argument("--stories", nargs="+", help="User stories for test generation")
    parser.add_argument("--test-type", choices=["e2e", "integration", "unit"], default="e2e",
                       help="Type of tests to generate")
    
    args = parser.parse_args()
    
    # Load config if provided
    config = None
    if args.config and Path(args.config).exists():
        with open(args.config, 'r') as f:
            config = json.load(f)
    
    # Initialize orchestrator
    orchestrator = AIEnhancedTestOrchestrator(config)
    
    if args.mode == "interactive":
        await orchestrator.interactive_mode()
    else:
        # Auto mode
        user_stories = args.stories or [
            "As a customer, I want to search for products so I can find what I need",
            "As a user, I want to add products to my cart so I can purchase them",
            "As a customer, I want to complete checkout so I can finalize my order"
        ]
        
        print("Running AI-Enhanced Testing Framework in automatic mode")
        results = await orchestrator.run_full_ai_cycle(user_stories, args.test_type)
        
        if results.get("success"):
            print(f"\nTest cycle completed successfully!")
            print(f"Summary: {json.dumps(results.get('summary', {}), indent=2)}")
        else:
            print(f"Test cycle failed: {results.get('error', 'Unknown error')}")


if __name__ == "__main__":
    asyncio.run(main())