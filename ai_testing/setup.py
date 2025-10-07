#!/usr/bin/env python3
"""
Setup script for AI-Enhanced Testing Framework
Installs dependencies and initializes the framework.
"""

import subprocess
import sys
import os
from pathlib import Path
import json


def run_command(command, description=""):
    """Run a shell command and handle errors."""
    print(f"🔄 {description}" if description else f"🔄 Running: {command}")
    
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ Success: {description}" if description else "✅ Command completed")
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {description if description else 'Command failed'}")
        print(f"   Command: {command}")
        print(f"   Error: {e.stderr}")
        return None


def install_dependencies():
    """Install Python dependencies."""
    requirements_file = Path(__file__).parent / "requirements.txt"
    
    if not requirements_file.exists():
        print("❌ requirements.txt not found")
        return False
    
    # Install dependencies
    success = run_command(
        f"pip install -r {requirements_file}",
        "Installing AI-enhanced testing dependencies"
    )
    
    return success is not None


def setup_playwright():
    """Setup Playwright browsers if not already installed."""
    print("🔄 Checking Playwright installation...")
    
    # Check if Playwright browsers are installed
    result = subprocess.run("playwright --version", shell=True, capture_output=True, text=True)
    
    if result.returncode != 0:
        print("🔄 Installing Playwright...")
        run_command("pip install playwright", "Installing Playwright")
    
    # Install browsers
    run_command("playwright install", "Installing Playwright browsers")


def create_config_file():
    """Create default configuration file."""
    config = {
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
    
    config_file = Path("ai_enhanced_config.json")
    with open(config_file, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"✅ Created configuration file: {config_file}")


def create_directories():
    """Create necessary directories."""
    directories = [
        "ai_generated_tests",
        "adaptive_data", 
        "analytics_data",
        "predictive_tests",
        "reports"
    ]
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"✅ Created directory: {directory}")


def create_example_user_stories():
    """Create example user stories file."""
    user_stories = [
        "As a customer, I want to search for products so that I can find items I need",
        "As a user, I want to register an account so that I can save my preferences", 
        "As a customer, I want to add products to my cart so that I can purchase multiple items",
        "As a user, I want to view my cart so that I can see what I'm about to purchase",
        "As a customer, I want to proceed to checkout so that I can complete my purchase",
        "As a user, I want to enter payment information so that I can pay for my order",
        "As a customer, I want to receive order confirmation so that I know my purchase was successful",
        "As a user, I want to view my order history so that I can track my past purchases",
        "As a customer, I want to add products to wishlist so that I can save items for later",
        "As a user, I want to write product reviews so that I can share my experience with others"
    ]
    
    stories_file = Path("example_user_stories.json")
    with open(stories_file, 'w') as f:
        json.dump({"user_stories": user_stories}, f, indent=2)
    
    print(f"✅ Created example user stories: {stories_file}")


def check_mcp_server():
    """Check if MCP server is accessible."""
    try:
        import requests
        response = requests.get("http://localhost:3003/health", timeout=5)
        if response.status_code == 200:
            print("✅ MCP server is running and accessible")
            return True
        else:
            print(f"⚠️ MCP server responded with status {response.status_code}")
            return False
    except Exception as e:
        print(f"⚠️ MCP server not accessible: {e}")
        print("   Make sure to start the MCP server before using AI features")
        return False


def main():
    """Main setup function."""
    print("🚀 AI-Enhanced Testing Framework Setup")
    print("=" * 40)
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ is required")
        return False
    
    print(f"✅ Python version: {sys.version.split()[0]}")
    
    # Install dependencies
    if not install_dependencies():
        print("❌ Failed to install dependencies")
        return False
    
    # Setup Playwright
    setup_playwright()
    
    # Create directories
    create_directories()
    
    # Create configuration
    create_config_file()
    
    # Create example files
    create_example_user_stories()
    
    # Check MCP server
    check_mcp_server()
    
    print("\n🎉 Setup completed successfully!")
    print("\nNext steps:")
    print("1. Start your MCP server: cd ../mcp_server && npm start")
    print("2. Run the AI framework: python orchestrator.py --mode interactive")
    print("3. Or run automated: python orchestrator.py --mode auto")
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)