# Ollama Setup Guide for Noted

This guide walks you through activating local AI models using Ollama. With Ollama, you can run AI features completely offline and for free.

## Why Use Ollama?

- **Free**: No API costs, run unlimited requests
- **Private**: Your data never leaves your machine
- **Offline**: Works without internet connection
- **Fast**: No network latency for local models

## Prerequisites

- 8GB RAM minimum (16GB recommended for larger models)
- 10GB free disk space
- Windows 10/11, macOS, or Linux

---

## Step 1: Install Ollama

### Windows
1. Download from [ollama.com/download](https://ollama.com/download)
2. Run the installer
3. Ollama will run in the background automatically

### macOS
```bash
# Using Homebrew
brew install ollama

# Or download from ollama.com/download
```

### Linux
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

---

## Step 2: Download AI Models

Open your terminal and download the models:

```bash
# Recommended: Llama 3.1 8B (4.7GB) - Best balance of speed and quality
ollama pull llama3.1:8b

# Alternative: Mistral 7B (4.1GB) - Faster, good for quick tasks
ollama pull mistral:7b

# Optional: Llama 3.1 70B (40GB) - Best quality, requires 32GB+ RAM
ollama pull llama3.1:70b
```

### Verify Installation
```bash
# List downloaded models
ollama list

# Test a model
ollama run llama3.1:8b "Hello, how are you?"
```

---

## Step 3: Start Ollama Server

Ollama needs to be running for Noted to connect:

```bash
# Start Ollama server (runs on port 11434)
ollama serve
```

> **Note**: On Windows, Ollama typically runs automatically as a background service after installation.

### Verify Server is Running
```bash
# Should return a list of models
curl http://localhost:11434/api/tags
```

---

## Step 4: Configure Noted

### Update Your Environment Variables

Edit your `.env` file:

```env
# Enable Ollama
ENABLE_OLLAMA=true

# Optional: Change base URL if running Ollama on different host
OLLAMA_BASE_URL=http://localhost:11434

# Optional: Switch default provider to Ollama
AI_PROVIDER=ollama
```

### Restart Your Development Server

```bash
# Stop and restart
npm run dev
```

---

## Step 5: Verify Integration

1. Open Noted in your browser
2. Create or open a page
3. Type `/` to open the slash menu
4. Select any AI command (Ask AI, Summarize, etc.)
5. In the AI panel, you should see local models in the dropdown

---

## Using Both Groq and Ollama

You can keep both providers enabled and switch between them:

```env
# Keep Groq as default (fast, cloud-based)
AI_PROVIDER=groq
GROQ_API_KEY=your-key-here

# Also enable Ollama (local, offline)
ENABLE_OLLAMA=true
```

In the AI panel, you can select which model to use:
- **Groq models**: Fast responses via cloud
- **Ollama models**: Local, private, works offline

---

## Recommended Model Selection

| Use Case | Recommended Model | Why |
|----------|------------------|-----|
| Quick tasks | `mistral:7b` | Fast responses, lower memory |
| General use | `llama3.1:8b` | Good balance of speed/quality |
| Complex tasks | `llama3.1:70b` | Best quality (needs 32GB RAM) |
| Coding help | `codellama:7b` | Optimized for code |

---

## Troubleshooting

### "Connection refused" error
```bash
# Make sure Ollama is running
ollama serve

# Check if it's listening
curl http://localhost:11434/api/tags
```

### "Model not found" error
```bash
# Download the model first
ollama pull llama3.1:8b

# Verify it's downloaded
ollama list
```

### Slow responses
- Try a smaller model (`mistral:7b` instead of `llama3.1:70b`)
- Close other memory-intensive applications
- Check available RAM with Task Manager / Activity Monitor

### Models not appearing in Noted
1. Verify `ENABLE_OLLAMA=true` in your `.env`
2. Restart the development server
3. Check browser console for errors

### Running Ollama on a Different Machine

If you want to run Ollama on a separate server:

```env
# Point to your Ollama server
OLLAMA_BASE_URL=http://192.168.1.100:11434
```

Make sure the Ollama server allows external connections:
```bash
# Start with host binding
OLLAMA_HOST=0.0.0.0 ollama serve
```

---

## Advanced: GPU Acceleration

Ollama automatically uses GPU if available:

### NVIDIA GPU (CUDA)
- Install [NVIDIA drivers](https://www.nvidia.com/drivers)
- Ollama will automatically detect and use CUDA

### AMD GPU (ROCm) - Linux only
```bash
# Install ROCm
# See: https://rocm.docs.amd.com/

# Ollama will auto-detect ROCm
```

### Apple Silicon (M1/M2/M3)
- GPU acceleration works automatically on Apple Silicon

### Verify GPU is being used
```bash
# Check GPU usage while running a model
nvidia-smi  # NVIDIA
rocm-smi    # AMD
```

---

## Model Storage Location

Models are stored in:
- **Windows**: `C:\Users\<username>\.ollama\models`
- **macOS**: `~/.ollama/models`
- **Linux**: `~/.ollama/models`

To free disk space, remove unused models:
```bash
ollama rm model-name
```

---

## Quick Reference

```bash
# Essential commands
ollama serve          # Start server
ollama list           # List downloaded models
ollama pull <model>   # Download a model
ollama rm <model>     # Remove a model
ollama run <model>    # Test a model interactively

# Noted environment variables
ENABLE_OLLAMA=true              # Enable Ollama integration
OLLAMA_BASE_URL=http://...      # Ollama server URL
AI_PROVIDER=ollama              # Set Ollama as default provider
```

---

## Need Help?

- [Ollama Documentation](https://ollama.com/docs)
- [Ollama GitHub](https://github.com/ollama/ollama)
- [Model Library](https://ollama.com/library)
