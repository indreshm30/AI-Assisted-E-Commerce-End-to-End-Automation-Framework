# AI-Enhanced Testing Framework

🤖 **Intelligent test automation powered by AI and machine learning**

This framework extends traditional Playwright testing with AI capabilities including:
- 🧠 **AI-powered test generation** from user stories
- 📈 **Adaptive learning** from test failures
- 📊 **Advanced analytics** and predictive insights
- 🔄 **Automated test orchestration** with intelligent workflows

## 🌟 Features

### 🤖 AI Test Generation
- Generate Playwright tests from natural language user stories
- Support for E2E, integration, and unit tests
- Intelligent test naming and organization
- Business rule validation

### 📈 Adaptive Learning Engine
- Learns from test failure patterns
- Automatically suggests and applies fixes
- Creates preventive tests based on historical data
- Smart retry logic and element selector improvements

### 📊 Advanced Analytics Dashboard
- Real-time test execution insights
- Trend analysis and performance metrics
- AI-powered recommendations
- Flaky test detection and analysis

### 🔄 Intelligent Orchestration
- Automated test lifecycle management
- Parallel test execution
- Smart failure recovery
- Predictive test scheduling

## 🛠️ Installation

### Prerequisites
- Python 3.8+
- Node.js 16+ (for MCP server)
- Git

### Quick Setup
```bash
# Clone the repository (if not already done)
cd ai_enhanced_tests

# Run setup script
python setup.py

# Start MCP server (in another terminal)
cd ../mcp_server
npm start

# Run the AI framework
python orchestrator.py --mode interactive
```

### Manual Installation
```bash
# Install Python dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install

# Create directories
mkdir -p ai_generated_tests adaptive_data analytics_data reports
```

## 🚀 Quick Start

### 1. Interactive Mode
```bash
python orchestrator.py --mode interactive
```

This launches an interactive menu where you can:
- Generate tests from user stories
- Execute existing tests
- Run adaptive analysis
- View analytics dashboard
- Run full AI cycles

### 2. Automated Mode
```bash
# Generate and run tests automatically
python orchestrator.py --mode auto --stories \
  "As a customer, I want to search for products" \
  "As a user, I want to add items to cart" \
  "As a customer, I want to complete checkout"
```

### 3. Individual Components

#### AI Test Generation
```python
from ai_enhanced_tests.generators.ai_test_generator import AITestGenerator

generator = AITestGenerator()
user_stories = [
    "As a customer, I want to search for products",
    "As a user, I want to add products to cart"
]

# Generate E2E tests
test_files = await generator.generate_from_user_stories(user_stories, "e2e")
print(f"Generated {len(test_files)} test files")
```

#### Adaptive Learning
```python
from ai_enhanced_tests.adaptive.adaptive_testing_engine import AdaptiveTestingEngine

engine = AdaptiveTestingEngine()

# Record test failure
test_failure = {
    "test_name": "test_login",
    "status": "failed",
    "error_message": "Timeout waiting for selector '#login-button'"
}
engine.record_test_failure(test_failure)

# Generate adaptive rules
rules = await engine.analyze_patterns_and_create_rules()
```

#### Analytics Dashboard
```python
from ai_enhanced_tests.analytics.advanced_dashboard import AdvancedAnalyticsDashboard

dashboard = AdvancedAnalyticsDashboard()

# Record test run
test_results = {
    "total": 50, "passed": 45, "failed": 5,
    "duration": 1200, "tests": [...]
}
dashboard.record_test_run(test_results)

# Generate insights
insights = await dashboard.generate_comprehensive_insights()
```

## 📋 Configuration

The framework uses `ai_enhanced_config.json` for configuration:

```json
{
  "mcp_server_url": "http://localhost:3003",
  "test_execution": {
    "parallel_workers": 4,
    "timeout": 300,
    "retry_failed": true,
    "max_retries": 2
  },
  "ai_generation": {
    "confidence_threshold": 0.6,
    "max_tests_per_story": 5,
    "include_predictive": true
  },
  "adaptive_learning": {
    "auto_apply_fixes": true,
    "learning_window_days": 7,
    "min_pattern_frequency": 3
  },
  "analytics": {
    "generate_insights": true,
    "export_reports": true,
    "real_time_monitoring": false
  }
}
```

## 🏗️ Architecture

```
AI-Enhanced Testing Framework
├── 🤖 MCP Client (mcp_client.py)
│   ├── Connects to AI server
│   ├── Handles test generation requests
│   └── Provides fallback capabilities
├── 🧪 Test Generator (generators/)
│   ├── AI-powered test creation
│   ├── User story parsing
│   └── Template management
├── 📈 Adaptive Engine (adaptive/)
│   ├── Failure pattern analysis
│   ├── Rule generation
│   └── Predictive testing
├── 📊 Analytics Dashboard (analytics/)
│   ├── Performance metrics
│   ├── AI insights
│   └── Trend analysis
└── 🎭 Orchestrator (orchestrator.py)
    ├── Workflow coordination
    ├── Interactive mode
    └── Automated execution
```

## 🎯 Use Cases

### 1. Sprint Planning Test Generation
```bash
# Generate tests for new features from user stories
python orchestrator.py --mode auto --test-type e2e --stories \
  "As a customer, I want to filter products by price range" \
  "As a user, I want to sort products by rating"
```

### 2. Regression Analysis
The adaptive engine automatically identifies patterns in test failures and suggests improvements:
- Timeout issues → Increased wait times
- Selector problems → More robust locators
- Network issues → Retry logic

### 3. Performance Monitoring
The analytics dashboard tracks:
- Test execution trends
- Pass rate changes
- Performance regressions
- Flaky test identification

### 4. Predictive Testing
Based on failure patterns, the framework generates preventive tests:
- Edge case scenarios
- Error condition testing
- Performance boundary tests

## 📊 Analytics & Reporting

### Dashboard Insights
- **Quality Metrics**: Pass rates, failure trends, flaky tests
- **Performance**: Execution times, bottlenecks, optimization opportunities
- **Coverage**: Component testing distribution, gap analysis
- **Reliability**: Stability patterns, improvement suggestions

### Export Formats
- JSON reports for CI/CD integration
- HTML dashboards for stakeholders
- CSV data for custom analysis
- Automated Slack/email notifications

## 🔧 Integration

### CI/CD Pipeline Integration
```yaml
# GitHub Actions example
- name: Run AI-Enhanced Tests
  run: |
    python ai_enhanced_tests/orchestrator.py --mode auto
    # Process results and generate reports
```

### Slack Integration
```python
# Send insights to Slack
insights = await dashboard.generate_comprehensive_insights()
slack_webhook.send(format_insights_for_slack(insights))
```

### Jira Integration
```python
# Create tickets for high-severity issues
for insight in insights:
    if insight.severity == "high":
        jira.create_issue(insight.title, insight.description)
```

## 🤝 Contributing

### Development Setup
```bash
# Install development dependencies
pip install -r requirements.txt
pip install black flake8 mypy

# Format code
black .

# Lint
flake8 .

# Type check
mypy .
```

### Adding New Features
1. **Test Generators**: Add new templates in `generators/templates/`
2. **Adaptive Rules**: Extend `adaptive_testing_engine.py`
3. **Analytics**: Add new insights in `advanced_dashboard.py`
4. **Orchestration**: Extend workflow in `orchestrator.py`

## 🐛 Troubleshooting

### Common Issues

**MCP Server Not Accessible**
```bash
# Check if server is running
curl http://localhost:3003/health

# Start MCP server
cd mcp_server && npm start
```

**Test Generation Fails**
- Verify MCP server is running
- Check API key configuration
- Review user story format

**Adaptive Learning Not Working**
- Ensure test failures are being recorded
- Check minimum pattern frequency settings
- Verify data directory permissions

**Poor Test Quality**
- Increase confidence threshold
- Provide more context in user stories
- Review and refine business rules

### Debug Mode
```bash
# Enable detailed logging
export LOG_LEVEL=DEBUG
python orchestrator.py --mode interactive
```

### Performance Optimization
- Increase `parallel_workers` for faster execution
- Reduce `confidence_threshold` for more test generation
- Enable `real_time_monitoring` for immediate insights

## 📈 Roadmap

### Upcoming Features
- 🌐 **Multi-browser testing** with cross-browser insights
- 🔍 **Visual regression testing** with AI-powered comparison
- 🎯 **Smart test prioritization** based on change impact
- 📱 **Mobile testing** with device-specific optimizations
- 🔄 **Continuous learning** with model fine-tuning
- ☁️ **Cloud integration** with AWS/Azure test execution

### Experimental Features
- 🧠 **Natural language test debugging**
- 🤖 **Auto-healing tests** that fix themselves
- 📊 **Predictive failure detection**
- 🎭 **Behavior-driven test generation**

## 📞 Support

### Documentation
- 📚 [API Documentation](docs/api.md)
- 🎓 [Tutorial Videos](docs/tutorials/)
- 💡 [Best Practices](docs/best-practices.md)

### Community
- 💬 [Discord Server](https://discord.gg/ai-testing)
- 🐛 [Issue Tracker](https://github.com/your-repo/issues)
- 📧 [Mailing List](mailto:ai-testing@example.com)

---

**Built with ❤️ for the testing community**

Transform your testing workflow with AI-powered intelligence and adaptive automation!