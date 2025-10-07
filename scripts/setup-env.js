#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up AI-Enhanced E-Commerce Automation Framework...\n');

// Check prerequisites
console.log('📋 Checking prerequisites...');

try {
  // Check Node.js version
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  console.log(`✅ Node.js: ${nodeVersion}`);
  
  // Check npm version
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`✅ npm: ${npmVersion}`);
  
  // Check if Python is available
  try {
    const pythonVersion = execSync('python --version', { encoding: 'utf8' }).trim();
    console.log(`✅ Python: ${pythonVersion}`);
  } catch (error) {
    try {
      const python3Version = execSync('python3 --version', { encoding: 'utf8' }).trim();
      console.log(`✅ Python: ${python3Version}`);
    } catch (error) {
      console.log('⚠️  Python not found. Please install Python 3.11+');
    }
  }
  
  // Check Docker
  try {
    const dockerVersion = execSync('docker --version', { encoding: 'utf8' }).trim();
    console.log(`✅ Docker: ${dockerVersion}`);
  } catch (error) {
    console.log('⚠️  Docker not found. Install Docker for containerization features.');
  }
  
} catch (error) {
  console.error('❌ Error checking prerequisites:', error.message);
  process.exit(1);
}

console.log('\n📦 Creating environment files...');

// Create environment files for each service
const envFiles = [
  {
    path: 'platform/frontend/.env.local',
    content: `# Frontend Environment Variables
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_MCP_URL=http://localhost:3003
NEXT_PUBLIC_APP_NAME=AI-Enhanced E-Commerce
NEXT_PUBLIC_VERSION=1.0.0
`
  },
  {
    path: 'platform/backend/.env',
    content: `# Backend Environment Variables
NODE_ENV=development
PORT=3001
DATABASE_URL="file:./dev.db"
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
CORS_ORIGIN=http://localhost:3002
REDIS_URL=redis://localhost:6379

# AI Service Configuration
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Email Configuration (Optional)
EMAIL_FROM=noreply@your-domain.com
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
`
  },
  {
    path: 'platform/mcp_server/.env',
    content: `# MCP Server Environment Variables
NODE_ENV=development
PORT=3003
DATABASE_URL="file:./data/mcp_server.db"

# AI Configuration
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
AI_PROVIDER=openai
AI_MODEL=gpt-4

# Local AI (Optional)
OLLAMA_URL=http://localhost:11434
LOCAL_AI_MODEL=llama2

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/mcp-server.log
`
  },
  {
    path: 'ai_testing/config.env',
    content: `# AI Testing Framework Configuration
PYTHON_ENV=development
PLAYWRIGHT_BROWSERS_PATH=0

# AI Configuration
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
AI_PROVIDER=openai

# Test Configuration
BASE_URL=http://localhost:3002
API_URL=http://localhost:3001
MCP_URL=http://localhost:3003
TEST_TIMEOUT=30000
HEADLESS=true
SLOW_MO=0

# Screenshot and Video
SCREENSHOT_ON_FAILURE=true
VIDEO_ON_FAILURE=true
TRACE_ON_FAILURE=true

# Reporting
REPORT_DIR=reports
ANALYTICS_ENABLED=true
DASHBOARD_ENABLED=true
`
  }
];

envFiles.forEach(({ path: filePath, content }) => {
  const fullPath = path.join(process.cwd(), filePath);
  const dir = path.dirname(fullPath);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Create file if it doesn't exist
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Created ${filePath}`);
  } else {
    console.log(`⚠️  ${filePath} already exists, skipping...`);
  }
});

console.log('\n📁 Creating necessary directories...');

const directories = [
  'logs',
  'platform/frontend/public/uploads',
  'platform/backend/uploads',
  'platform/backend/logs',
  'platform/mcp_server/logs',
  'ai_testing/reports',
  'ai_testing/screenshots',
  'ai_testing/videos',
  'deployment/secrets'
];

directories.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

console.log('\n🎯 Setup complete!');
console.log('\n📚 Next steps:');
console.log('1. Update environment variables in the .env files with your actual values');
console.log('2. Run `npm run install:all` to install all dependencies');
console.log('3. Run `npm run dev` to start the development environment');
console.log('4. Run `npm run test` to run the AI-enhanced test suite');
console.log('\n📖 For detailed setup instructions, see:');
console.log('   - README.md for overview');
console.log('   - docs/ folder for detailed documentation');
console.log('   - deployment/README.md for production setup');
console.log('\n🚀 Happy coding with AI-Enhanced E-Commerce Automation!');