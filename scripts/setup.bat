@echo off
echo 🚀 AI-Enhanced E-Commerce Automation Framework Setup
echo ================================================

echo.
echo 📋 Checking prerequisites...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)
echo ✅ Node.js found

npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found. Please install npm
    pause
    exit /b 1
)
echo ✅ npm found

python --version >nul 2>&1
if %errorlevel% neq 0 (
    python3 --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ⚠️ Python not found. Some AI testing features may not work.
    ) else (
        echo ✅ Python3 found
    )
) else (
    echo ✅ Python found
)

echo.
echo 📦 Installing root dependencies...
call npm install

echo.
echo 🛠️ Setting up environment...
call npm run setup:env

echo.
echo 📥 Installing all service dependencies...
call npm run install:all

echo.
echo ✅ Setup complete!
echo.
echo 📚 Next steps:
echo 1. Update .env files with your API keys and configuration
echo 2. Run "npm run dev" to start development environment  
echo 3. Run "npm run test" to run AI-enhanced tests
echo.
echo 📖 See README.md for detailed documentation
echo 🚀 Happy coding!

pause