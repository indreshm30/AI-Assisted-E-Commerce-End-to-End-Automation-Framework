# Local AI Model Setup Guide

This guide helps you set up local AI models as a cost-effective alternative to expensive API services.

## Why Use Local AI?

- **Cost Effective**: No per-token charges, unlimited usage
- **Privacy**: Your code stays on your machine
- **Offline Capable**: Works without internet connection
- **Small Models**: Under 1GB downloads for decent coding assistance

## Option 1: Ollama (Recommended)

### Installation
1. Download Ollama from https://ollama.ai
2. Install and start the service
3. Download a coding model:

```bash
# Small coding model (~900MB)
ollama pull qwen2.5-coder:1.5b

# Larger model for better performance (~1.9GB)  
ollama pull qwen2.5:3b

# Alternative coding models
ollama pull codellama:7b-code
ollama pull deepseek-coder:1.3b
```

### Verify Installation
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Test model
ollama run qwen2.5-coder:1.5b "Write a hello world function in Python"
```

## Option 2: LM Studio (GUI Alternative)

### Installation
1. Download LM Studio from https://lmstudio.ai
2. Launch the application
3. Go to "Discover" tab and search for:
   - `Qwen2.5-Coder-1.5B-Instruct-GGUF`
   - `Qwen2.5-3B-Instruct-GGUF`
   - `CodeLlama-7B-Instruct-GGUF`

### Start Local Server
1. Go to "Local Server" tab in LM Studio
2. Load your preferred model
3. Start server on port 1234
4. Enable OpenAI compatibility

## Configuration

The MCP server will automatically detect and use local models. Configuration in `.env`:

```env
ENABLE_LOCAL_AI=true
OLLAMA_BASE_URL=http://localhost:11434
LM_STUDIO_BASE_URL=http://localhost:1234
LOCAL_AI_MODELS=qwen2.5-coder:1.5b,qwen2.5:3b,codellama:7b
```

## Model Recommendations

| Model | Size | Best For | Download Command |
|-------|------|----------|-----------------|
| Qwen2.5-Coder-1.5B | ~900MB | Code generation, fast responses | `ollama pull qwen2.5-coder:1.5b` |
| Qwen2.5-3B | ~1.9GB | Better reasoning, coding | `ollama pull qwen2.5:3b` |
| CodeLlama-7B | ~3.8GB | Advanced coding tasks | `ollama pull codellama:7b` |
| Phi-3-Mini | ~2.3GB | Microsoft model, good balance | `ollama pull phi3:mini` |

## Testing Your Setup

After installation, test the integration:

```bash
# Start the MCP server
cd mcp_server
npm start

# Check logs for local AI detection
# Should see: "Local AI service initialized with Ollama/LM Studio"
```

## Troubleshooting

### Ollama Not Starting
- Check if port 11434 is available
- Restart Ollama service
- Verify installation: `ollama --version`

### LM Studio Connection Issues
- Ensure server is started in LM Studio
- Check port 1234 is not blocked
- Enable OpenAI compatibility in settings

### Model Not Found
- List available models: `ollama list`
- Pull missing models: `ollama pull <model-name>`
- Check model names match configuration

## Performance Tips

1. **Start with smaller models** (1.5B parameters) for testing
2. **Use SSD storage** for faster model loading
3. **Allocate sufficient RAM** (4GB+ recommended)
4. **GPU acceleration** available with CUDA/Metal support

## Fallback Behavior

The MCP server uses intelligent fallback:
1. Try local AI (Ollama/LM Studio)
2. Fallback to OpenAI API (if configured)
3. Fallback to Anthropic API (if configured)
4. Use mock responses (for development)

This ensures your automation always works, even without internet!