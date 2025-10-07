"""
AI-Powered Test Generator
Automatically generates Playwright tests from user stories using our MCP server.
"""

import asyncio
import os
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
import json
import logging
from datetime import datetime
import re

# Add parent directory for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from ai_enhanced_tests.mcp_client import MCPClient, TestGenerationRequest, TestGenerationResult

logger = logging.getLogger(__name__)


class AITestGenerator:
    """AI-powered test generator using MCP server."""
    
    def __init__(self, output_dir: str = "ai_generated_tests"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.generated_tests = []
        self.templates_dir = Path(__file__).parent / "templates"
        self.templates_dir.mkdir(exist_ok=True)
        
    def create_test_templates(self):
        """Create test templates for different types."""
        # E2E Test Template
        e2e_template = '''"""
Generated E2E Test: {test_name}
Generated on: {timestamp}
User Story: {user_story}
"""

import pytest
import asyncio
from pathlib import Path
import sys

# Add automation modules to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
from automation import ECommerceAutomation


@pytest.mark.e2e
class Test{class_name}:
    """AI-generated E2E test class for {user_story}"""
    
    {test_methods}
    
    def test_cleanup(self, automation: ECommerceAutomation):
        """Clean up after tests."""
        # Add any necessary cleanup
        pass
'''
        
        # Unit Test Template
        unit_template = '''"""
Generated Unit Test: {test_name}
Generated on: {timestamp}
User Story: {user_story}
"""

import pytest
import unittest.mock as mock
from pathlib import Path
import sys

# Add source modules to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))


@pytest.mark.unit
class Test{class_name}:
    """AI-generated unit test class for {user_story}"""
    
    {test_methods}
'''
        
        # Integration Test Template  
        integration_template = '''"""
Generated Integration Test: {test_name}
Generated on: {timestamp}
User Story: {user_story}
"""

import pytest
import requests
from pathlib import Path
import sys

# Add automation modules to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))


@pytest.mark.integration
class Test{class_name}:
    """AI-generated integration test class for {user_story}"""
    
    def setup_method(self):
        """Set up test environment."""
        self.base_url = "http://localhost:3002"  # Frontend URL
        self.api_url = "http://localhost:3001"   # Backend API URL
    
    {test_methods}
'''
        
        # Save templates
        templates = {
            "e2e_template.py": e2e_template,
            "unit_template.py": unit_template,
            "integration_template.py": integration_template
        }
        
        for filename, content in templates.items():
            template_path = self.templates_dir / filename
            with open(template_path, 'w', encoding='utf-8') as f:
                f.write(content)
    
    async def generate_from_user_stories(self, user_stories: List[str], test_type: str = "e2e") -> List[str]:
        """Generate tests from multiple user stories."""
        generated_files = []
        
        async with MCPClient() as client:
            for story in user_stories:
                try:
                    file_path = await self._generate_single_test(client, story, test_type)
                    if file_path:
                        generated_files.append(file_path)
                        logger.info(f"Generated test: {file_path}")
                except Exception as e:
                    logger.error(f"Failed to generate test for story '{story}': {e}")
        
        return generated_files
    
    async def _generate_single_test(self, client: MCPClient, user_story: str, test_type: str) -> Optional[str]:
        """Generate a single test file from user story."""
        # Extract component context from user story
        component_context = self._extract_context_from_story(user_story)
        
        # Create generation request
        request = TestGenerationRequest(
            user_story=user_story,
            test_type=test_type,
            component_context=component_context,
            existing_tests=self._get_existing_tests(),
            business_rules=self._get_business_rules()
        )
        
        # Generate test using AI
        result = await client.generate_tests(request)
        
        if result.confidence_score < 0.3:
            logger.warning(f"Low confidence score ({result.confidence_score}) for story: {user_story}")
        
        # Create test file
        return self._create_test_file(result, user_story, test_type)
    
    def _extract_context_from_story(self, user_story: str) -> str:
        """Extract component context from user story."""
        story_lower = user_story.lower()
        contexts = []
        
        # Map keywords to contexts
        context_map = {
            "login": "authentication",
            "register": "authentication", 
            "sign": "authentication",
            "cart": "shopping_cart",
            "checkout": "checkout_flow",
            "payment": "payment_processing",
            "product": "product_catalog",
            "search": "product_search",
            "review": "user_reviews",
            "wishlist": "wishlist_management",
            "order": "order_management",
            "profile": "user_profile"
        }
        
        for keyword, context in context_map.items():
            if keyword in story_lower:
                contexts.append(context)
        
        return ", ".join(contexts) if contexts else "general_ecommerce"
    
    def _get_existing_tests(self) -> List[str]:
        """Get list of existing test names to avoid duplicates."""
        existing_tests = []
        tests_dir = Path("tests")
        
        if tests_dir.exists():
            for test_file in tests_dir.glob("test_*.py"):
                try:
                    with open(test_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                        # Extract test function names
                        test_functions = re.findall(r'def (test_\w+)', content)
                        existing_tests.extend(test_functions)
                except Exception as e:
                    logger.warning(f"Could not read test file {test_file}: {e}")
        
        return existing_tests
    
    def _get_business_rules(self) -> List[str]:
        """Get business rules for validation."""
        return [
            "Users must be authenticated for checkout",
            "Cart total must be positive",
            "Product quantities must be valid integers",
            "Email addresses must be valid format",
            "Passwords must meet security requirements",
            "Payment methods must be supported",
            "Shipping addresses must be complete"
        ]
    
    def _create_test_file(self, result: TestGenerationResult, user_story: str, test_type: str) -> str:
        """Create test file from generation result."""
        # Generate class name from user story
        class_name = self._story_to_class_name(user_story)
        
        # Load appropriate template
        template_file = f"{test_type}_template.py"
        template_path = self.templates_dir / template_file
        
        if not template_path.exists():
            self.create_test_templates()
        
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                template = f.read()
        except Exception:
            # Fallback template
            template = '''"""
Generated {test_type} Test: {test_name}
"""

import pytest

class Test{class_name}:
    {test_methods}
'''
        
        # Format template
        formatted_content = template.format(
            test_name=result.test_name,
            class_name=class_name,
            user_story=user_story,
            test_methods=result.test_code,
            timestamp=datetime.now().isoformat(),
            test_type=test_type
        )
        
        # Create file path
        safe_name = re.sub(r'[^\w\-_.]', '_', result.test_name)
        file_path = self.output_dir / f"{safe_name}_{test_type}.py"
        
        # Write file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(formatted_content)
        
        # Add metadata
        self.generated_tests.append({
            "file_path": str(file_path),
            "test_name": result.test_name,
            "user_story": user_story,
            "test_type": test_type,
            "confidence_score": result.confidence_score,
            "suggestions": result.suggested_improvements,
            "dependencies": result.dependencies,
            "generated_at": datetime.now().isoformat()
        })
        
        return str(file_path)
    
    def _story_to_class_name(self, user_story: str) -> str:
        """Convert user story to PascalCase class name."""
        # Extract key words from story
        words = re.findall(r'\b\w+\b', user_story.lower())
        
        # Filter out common words
        stop_words = {'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'as', 'i', 'want', 'can', 'so', 'that'}
        meaningful_words = [word for word in words if word not in stop_words]
        
        # Take first 3-4 meaningful words
        key_words = meaningful_words[:4]
        
        # Convert to PascalCase
        class_name = ''.join(word.capitalize() for word in key_words)
        
        return class_name or "GeneratedTest"
    
    def generate_test_summary(self) -> str:
        """Generate summary of generated tests."""
        if not self.generated_tests:
            return "No tests generated."
        
        summary = {
            "total_tests": len(self.generated_tests),
            "test_types": {},
            "avg_confidence": 0.0,
            "files_generated": [test["file_path"] for test in self.generated_tests],
            "suggestions": []
        }
        
        # Calculate statistics
        total_confidence = 0
        for test in self.generated_tests:
            test_type = test["test_type"]
            summary["test_types"][test_type] = summary["test_types"].get(test_type, 0) + 1
            total_confidence += test["confidence_score"]
            summary["suggestions"].extend(test["suggestions"])
        
        summary["avg_confidence"] = total_confidence / len(self.generated_tests)
        
        # Create formatted summary
        report = f"""
AI Test Generation Summary
=========================
Generated: {summary['total_tests']} tests
Average Confidence: {summary['avg_confidence']:.2f}

Test Types:
{chr(10).join(f"  - {ttype}: {count}" for ttype, count in summary['test_types'].items())}

Files Generated:
{chr(10).join(f"  - {file}" for file in summary['files_generated'])}

Common Suggestions:
{chr(10).join(f"  - {suggestion}" for suggestion in set(summary['suggestions'][:10]))}
"""
        
        return report
    
    def save_generation_metadata(self) -> str:
        """Save generation metadata to JSON file."""
        metadata_file = self.output_dir / f"generation_metadata_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(self.generated_tests, f, indent=2, ensure_ascii=False)
        
        return str(metadata_file)


async def main():
    """Example usage of AI test generator."""
    generator = AITestGenerator()
    
    # Sample user stories
    user_stories = [
        "As a customer, I want to search for products so that I can find items I need",
        "As a user, I want to add products to my cart so that I can purchase them later",
        "As a customer, I want to checkout and pay for my order so that I can complete my purchase",
        "As a user, I want to create an account so that I can save my preferences",
        "As a customer, I want to view my order history so that I can track my purchases"
    ]
    
    print("Generating AI-powered tests from user stories...")
    
    # Generate E2E tests
    e2e_files = await generator.generate_from_user_stories(user_stories, "e2e")
    
    # Generate some integration tests
    integration_stories = user_stories[:2]
    integration_files = await generator.generate_from_user_stories(integration_stories, "integration")
    
    # Print summary
    print(generator.generate_test_summary())
    
    # Save metadata
    metadata_file = generator.save_generation_metadata()
    print(f"Generation metadata saved to: {metadata_file}")


if __name__ == "__main__":
    asyncio.run(main())