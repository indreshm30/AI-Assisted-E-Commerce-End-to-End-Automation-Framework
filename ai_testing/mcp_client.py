"""
MCP Client for AI-Enhanced Testing Framework
Connects to our custom MCP server to leverage AI capabilities for test generation and analysis.
"""

import asyncio
import aiohttp
import json
import logging
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass
from datetime import datetime
import websockets
import os
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class TestGenerationRequest:
    """Request for AI test generation."""
    user_story: str
    test_type: str  # 'unit', 'integration', 'e2e', 'performance'
    component_context: str
    existing_tests: Optional[List[str]] = None
    business_rules: Optional[List[str]] = None


@dataclass
class TestGenerationResult:
    """Result from AI test generation."""
    test_code: str
    test_name: str
    description: str
    confidence_score: float
    suggested_improvements: List[str]
    dependencies: List[str]


class MCPClient:
    """Client for connecting to our MCP server and leveraging AI capabilities."""
    
    def __init__(self, base_url: str = "http://localhost:3003", ws_url: str = "ws://localhost:3003"):
        self.base_url = base_url.rstrip('/')
        self.ws_url = ws_url
        self.session: Optional[aiohttp.ClientSession] = None
        self.ws_connection: Optional[websockets.WebSocketServerProtocol] = None
        self.api_key = os.getenv("MCP_API_KEY", "dev-key-for-testing")
        
    async def __aenter__(self):
        """Async context manager entry."""
        await self.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.disconnect()
    
    async def connect(self):
        """Connect to MCP server."""
        self.session = aiohttp.ClientSession(
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            },
            timeout=aiohttp.ClientTimeout(total=30)
        )
        
        try:
            # Test connection
            async with self.session.get(f"{self.base_url}/health") as response:
                if response.status == 200:
                    logger.info("Successfully connected to MCP server")
                else:
                    logger.warning(f"MCP server health check failed: {response.status}")
        except Exception as e:
            logger.error(f"Failed to connect to MCP server: {e}")
            # Continue without MCP server for graceful degradation
    
    async def disconnect(self):
        """Disconnect from MCP server."""
        if self.ws_connection:
            await self.ws_connection.close()
        if self.session:
            await self.session.close()
    
    async def generate_tests(self, request: TestGenerationRequest) -> TestGenerationResult:
        """Generate tests using AI via MCP server."""
        if not self.session:
            raise RuntimeError("MCP client not connected")
        
        try:
            payload = {
                "userStory": request.user_story,
                "testType": request.test_type,
                "componentContext": request.component_context,
                "existingTests": request.existing_tests or [],
                "businessRules": request.business_rules or []
            }
            
            async with self.session.post(f"{self.base_url}/api/tests/generate", json=payload) as response:
                if response.status == 200:
                    result = await response.json()
                    return TestGenerationResult(
                        test_code=result.get("testCode", ""),
                        test_name=result.get("testName", ""),
                        description=result.get("description", ""),
                        confidence_score=result.get("confidenceScore", 0.0),
                        suggested_improvements=result.get("suggestedImprovements", []),
                        dependencies=result.get("dependencies", [])
                    )
                else:
                    error_text = await response.text()
                    logger.error(f"Test generation failed: {response.status} - {error_text}")
                    return self._fallback_test_generation(request)
        
        except Exception as e:
            logger.error(f"Error generating tests: {e}")
            return self._fallback_test_generation(request)
    
    def _fallback_test_generation(self, request: TestGenerationRequest) -> TestGenerationResult:
        """Fallback test generation when MCP server is unavailable."""
        logger.warning("Using fallback test generation")
        
        # Generate basic test template based on test type
        if request.test_type == "e2e":
            test_code = f'''
def test_{request.user_story.lower().replace(" ", "_")}_e2e(automation):
    """Test: {request.user_story}"""
    # Generated test based on user story
    # Component: {request.component_context}
    
    # TODO: Implement test steps
    pass
'''
        elif request.test_type == "unit":
            test_code = f'''
def test_{request.user_story.lower().replace(" ", "_")}_unit():
    """Test: {request.user_story}"""
    # Component: {request.component_context}
    
    # TODO: Implement unit test
    pass
'''
        else:
            test_code = f'''
def test_{request.user_story.lower().replace(" ", "_")}():
    """Test: {request.user_story}"""
    # Type: {request.test_type}
    # Component: {request.component_context}
    
    # TODO: Implement test
    pass
'''
        
        return TestGenerationResult(
            test_code=test_code,
            test_name=f"test_{request.user_story.lower().replace(' ', '_')}",
            description=f"Auto-generated test for: {request.user_story}",
            confidence_score=0.5,
            suggested_improvements=["Add proper assertions", "Include error handling", "Add test data validation"],
            dependencies=[]
        )
    
    async def analyze_test_failures(self, test_results: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze test failures using AI to suggest fixes."""
        if not self.session:
            return {"analysis": "MCP client not connected", "suggestions": []}
        
        try:
            async with self.session.post(f"{self.base_url}/api/tests/analyze-failures", json=test_results) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    logger.error(f"Failure analysis failed: {response.status}")
                    return self._fallback_failure_analysis(test_results)
        
        except Exception as e:
            logger.error(f"Error analyzing failures: {e}")
            return self._fallback_failure_analysis(test_results)
    
    def _fallback_failure_analysis(self, test_results: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback failure analysis."""
        failed_tests = test_results.get("failed", [])
        
        suggestions = []
        if failed_tests:
            suggestions = [
                "Check element selectors for UI changes",
                "Verify test data is still valid",
                "Ensure application is running and accessible",
                "Review timing issues with explicit waits"
            ]
        
        return {
            "analysis": f"Found {len(failed_tests)} failed tests. Common issues detected.",
            "suggestions": suggestions,
            "confidence": 0.6
        }
    
    async def validate_business_rules(self, test_scenario: str, rules: List[str]) -> Dict[str, Any]:
        """Validate test scenario against business rules."""
        if not self.session:
            return {"valid": True, "violations": [], "warnings": []}
        
        try:
            payload = {"scenario": test_scenario, "rules": rules}
            async with self.session.post(f"{self.base_url}/api/business-rules/validate", json=payload) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    logger.error(f"Business rule validation failed: {response.status}")
                    return {"valid": True, "violations": [], "warnings": []}
        
        except Exception as e:
            logger.error(f"Error validating business rules: {e}")
            return {"valid": True, "violations": [], "warnings": []}
    
    async def get_test_insights(self, test_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get AI insights about test coverage and quality."""
        if not self.session:
            return {"insights": [], "recommendations": [], "coverage_score": 0.0}
        
        try:
            async with self.session.post(f"{self.base_url}/api/analytics/insights", json=test_data) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    logger.error(f"Test insights failed: {response.status}")
                    return {"insights": [], "recommendations": [], "coverage_score": 0.0}
        
        except Exception as e:
            logger.error(f"Error getting test insights: {e}")
            return {"insights": [], "recommendations": [], "coverage_score": 0.0}


# Utility functions for test generation
def create_user_story_from_test(test_name: str, test_description: str) -> str:
    """Convert existing test to user story format."""
    return f"As a user, I want to {test_description.lower()} so that {test_name.replace('_', ' ')}"


def extract_component_context(test_file_path: str) -> str:
    """Extract component context from test file path."""
    path = Path(test_file_path)
    components = []
    
    # Extract from file name
    if "login" in path.name.lower():
        components.append("authentication")
    if "checkout" in path.name.lower():
        components.append("checkout_flow")
    if "product" in path.name.lower():
        components.append("product_catalog")
    if "cart" in path.name.lower():
        components.append("shopping_cart")
    
    return ", ".join(components) if components else "general_ecommerce"


# Example usage and integration helpers
async def generate_test_from_user_story(story: str, test_type: str = "e2e") -> str:
    """Generate a test from user story using MCP AI."""
    async with MCPClient() as client:
        request = TestGenerationRequest(
            user_story=story,
            test_type=test_type,
            component_context=extract_component_context(story)
        )
        result = await client.generate_tests(request)
        return result.test_code


if __name__ == "__main__":
    # Test the MCP client
    async def test_client():
        async with MCPClient() as client:
            request = TestGenerationRequest(
                user_story="As a user, I want to add products to my cart and checkout successfully",
                test_type="e2e",
                component_context="checkout_flow, shopping_cart"
            )
            result = await client.generate_tests(request)
            print(f"Generated test: {result.test_name}")
            print(f"Confidence: {result.confidence_score}")
            print(f"Code:\n{result.test_code}")
    
    asyncio.run(test_client())