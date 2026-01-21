# AI Models Setup Guide for Noted
## A Complete Beginner's Guide to Running AI Locally and in the Cloud

**For:** Developers new to AI/LLM integration
**Time Required:** 15-30 minutes for basic setup
**Last Updated:** January 21, 2026

---

## Table of Contents

1. [Understanding AI Models (5 min read)](#1-understanding-ai-models)
2. [Choosing Your Setup](#2-choosing-your-setup)
3. [Option A: Ollama (Recommended for Beginners)](#3-option-a-ollama-local---recommended)
4. [Option B: Groq Cloud (Free, No GPU Required)](#4-option-b-groq-cloud-free)
5. [Option C: OpenAI/Anthropic (Paid Cloud)](#5-option-c-openai--anthropic-paid)
6. [Option D: LM Studio (GUI for Beginners)](#6-option-d-lm-studio-desktop-gui)
7. [Testing Your Setup](#7-testing-your-setup)
8. [Integrating with Noted](#8-integrating-with-noted)
9. [Troubleshooting](#9-troubleshooting)
10. [Cost Comparison](#10-cost-comparison)

---

## 1. Understanding AI Models

### What is an LLM?
A **Large Language Model (LLM)** is an AI that understands and generates text. Think of it like a very smart autocomplete that can:
- Answer questions about your notes
- Summarize long documents
- Expand bullet points into paragraphs
- Translate text between languages

### Key Terms You'll See

| Term | Simple Explanation |
|------|-------------------|
| **Model** | The AI "brain" - like GPT-4, Llama, Mistral |
| **Parameters** | Model size (7B = 7 billion). Bigger = smarter but slower |
| **Tokens** | Units of text (~4 characters). "Hello world" = ~2-3 tokens |
| **Context Window** | How much text the AI can "see" at once (8K, 32K, 128K tokens) |
| **Inference** | The AI generating a response |
| **Streaming** | Getting the response word-by-word (like ChatGPT typing) |
| **API** | A way for your app to talk to the AI |
| **Local** | Running on your own computer |
| **Cloud** | Running on someone else's servers |

### Local vs Cloud - What's the Difference?

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LOCAL vs CLOUD AI                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  LOCAL (Ollama, LM Studio)          CLOUD (OpenAI, Groq, Anthropic)    │
│  ─────────────────────────          ────────────────────────────────    │
│                                                                         │
│  ✅ Free after setup                 ✅ No GPU required                  │
│  ✅ Data stays on your PC            ✅ Best quality models              │
│  ✅ No internet needed               ✅ Works on any device              │
│  ✅ No usage limits                  ✅ Easy to set up                   │
│                                                                         │
│  ❌ Needs decent GPU (6GB+ VRAM)     ❌ Costs money (usually)            │
│  ❌ Slower than cloud                ❌ Data sent to third party         │
│  ❌ Uses your electricity            ❌ Rate limits                      │
│  ❌ Limited model sizes              ❌ Internet required                │
│                                                                         │
│  Best for:                          Best for:                           │
│  • Privacy-focused users            • Quick start                       │
│  • Unlimited usage                  • Best quality output               │
│  • Developers with good GPUs        • Users without GPUs                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Choosing Your Setup

### Quick Decision Guide

**Answer these questions:**

1. **Do you have a dedicated GPU with 6GB+ VRAM?**
   - Yes → Go to [Option A: Ollama](#3-option-a-ollama-local---recommended)
   - No → Continue to question 2

2. **Do you want to pay for AI?**
   - No, free only → Go to [Option B: Groq](#4-option-b-groq-cloud-free)
   - Yes, best quality → Go to [Option C: OpenAI/Anthropic](#5-option-c-openai--anthropic-paid)

3. **Are you uncomfortable with command line?**
   - Yes → Go to [Option D: LM Studio](#6-option-d-lm-studio-desktop-gui)

### Check Your GPU (Windows)

```powershell
# Open PowerShell and run:
nvidia-smi
```

If you see output with "NVIDIA" and memory info, you have an NVIDIA GPU.

**Minimum Requirements for Local AI:**
| Model Size | Minimum VRAM | Example GPUs |
|------------|--------------|--------------|
| 7B models | 6GB | RTX 3060, RTX 4060 |
| 13B models | 10GB | RTX 3080, RTX 4070 |
| 70B models | 40GB+ | RTX 4090 x2, A100 |

**No GPU?** Use cloud options (Groq is free!) or CPU mode (very slow).

---

## 3. Option A: Ollama (Local) - RECOMMENDED

### What is Ollama?
Ollama is a simple tool that lets you run AI models on your own computer. It's like Docker but for AI models.

### Step 1: Install Ollama

#### Windows
1. Go to https://ollama.com/download
2. Download the Windows installer
3. Run the installer (double-click)
4. Follow the prompts (Next → Next → Install)

#### Mac
```bash
# Option 1: Download from website
# Go to https://ollama.com/download

# Option 2: Using Homebrew
brew install ollama
```

#### Linux
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Step 2: Verify Installation

Open a terminal/PowerShell and run:
```bash
ollama --version
```

You should see something like: `ollama version 0.3.x`

### Step 3: Download Your First Model

```bash
# Start with the small, fast model (4.7GB download)
ollama pull llama3.1:8b

# This will take a few minutes depending on your internet
```

**What's happening?**
- Ollama downloads the model file (~4.7GB)
- Stores it in `~/.ollama/models/` (Mac/Linux) or `C:\Users\<you>\.ollama\models\` (Windows)
- Ready to use!

### Step 4: Test the Model

```bash
# Chat with the model directly
ollama run llama3.1:8b

# Type a message and press Enter
>>> Hello! Can you summarize what AI is in one sentence?
```

Press `Ctrl+D` or type `/bye` to exit.

### Step 5: Start the API Server

For Noted to use Ollama, the server must be running:

```bash
# Start the server (runs in background)
ollama serve
```

**On Windows:** Ollama usually starts automatically as a service.

### Step 6: Test the API

Open a new terminal and run:
```bash
curl http://localhost:11434/api/tags
```

You should see a list of your installed models.

### Recommended Models to Download

```bash
# General purpose (start here)
ollama pull llama3.1:8b          # 4.7GB - Good balance

# If you have more VRAM (12GB+)
ollama pull llama3.1:70b         # 40GB - Best quality

# Fast and light
ollama pull mistral:7b           # 4.1GB - Very fast

# For code-related tasks
ollama pull codellama:7b         # 3.8GB - Code focused

# For multilingual (Chinese, Japanese, etc.)
ollama pull qwen2.5:7b           # 4.4GB - 29 languages

# For embeddings (relationship detection)
ollama pull nomic-embed-text     # 274MB - Required for AI relationships
```

### Ollama Commands Cheat Sheet

```bash
# List installed models
ollama list

# Remove a model
ollama rm llama3.1:8b

# Show model info
ollama show llama3.1:8b

# Update a model
ollama pull llama3.1:8b

# Run with specific options
ollama run llama3.1:8b --verbose

# Check if server is running
curl http://localhost:11434/
```

---

## 4. Option B: Groq Cloud (Free)

### What is Groq?
Groq is a cloud AI provider that offers **free access** to popular open-source models. They use custom chips (LPUs) that are incredibly fast - 10x faster than OpenAI!

### Why Groq?
- **Free tier** - No credit card required
- **Fast** - ~500 tokens/second
- **Open-source models** - Llama, Mistral, Mixtral
- **Easy setup** - Just get an API key

### Step 1: Create an Account

1. Go to https://console.groq.com
2. Click "Sign Up"
3. Sign in with Google/GitHub or create an account
4. Verify your email

### Step 2: Get Your API Key

1. Go to https://console.groq.com/keys
2. Click "Create API Key"
3. Name it (e.g., "Noted App")
4. Copy the key (starts with `gsk_`)
5. **Save it somewhere safe - you won't see it again!**

### Step 3: Test Your Key

```bash
# Windows PowerShell
$env:GROQ_API_KEY="gsk_your_key_here"

curl https://api.groq.com/openai/v1/chat/completions `
  -H "Authorization: Bearer $env:GROQ_API_KEY" `
  -H "Content-Type: application/json" `
  -d '{
    "model": "llama-3.1-8b-instant",
    "messages": [{"role": "user", "content": "Say hello!"}]
  }'
```

```bash
# Mac/Linux
export GROQ_API_KEY="gsk_your_key_here"

curl https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.1-8b-instant",
    "messages": [{"role": "user", "content": "Say hello!"}]
  }'
```

### Available Models on Groq (Free)

| Model | Best For | Speed |
|-------|----------|-------|
| `llama-3.1-8b-instant` | Fast responses | Fastest |
| `llama-3.1-70b-versatile` | Best quality | Fast |
| `mixtral-8x7b-32768` | Long context | Fast |
| `gemma2-9b-it` | Balanced | Fast |

### Rate Limits (Free Tier)

| Limit | Value |
|-------|-------|
| Requests per minute | 30 |
| Requests per day | 14,400 |
| Tokens per minute | 6,000 |

These limits are generous for personal use!

---

## 5. Option C: OpenAI / Anthropic (Paid)

### OpenAI (GPT-4, ChatGPT maker)

#### Step 1: Create Account
1. Go to https://platform.openai.com
2. Sign up or log in
3. Add payment method (Settings → Billing)

#### Step 2: Get API Key
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy and save the key (starts with `sk-`)

#### Step 3: Add Credits
1. Go to Settings → Billing
2. Add at least $5 to start
3. Set usage limits to avoid surprises!

#### Pricing (as of 2026)
| Model | Input | Output | Best For |
|-------|-------|--------|----------|
| gpt-4o-mini | $0.15/1M | $0.60/1M | Daily use, cheap |
| gpt-4o | $5/1M | $15/1M | Complex tasks |

**$5 gets you roughly:**
- ~33,000 gpt-4o-mini responses (short)
- ~1,000 gpt-4o responses (short)

### Anthropic (Claude)

#### Step 1: Create Account
1. Go to https://console.anthropic.com
2. Sign up
3. Add payment method

#### Step 2: Get API Key
1. Go to https://console.anthropic.com/settings/keys
2. Create a new key
3. Copy and save (starts with `sk-ant-`)

#### Pricing
| Model | Input | Output | Best For |
|-------|-------|--------|----------|
| claude-3-haiku | $0.25/1M | $1.25/1M | Fast, cheap |
| claude-3.5-sonnet | $3/1M | $15/1M | Best balance |

---

## 6. Option D: LM Studio (Desktop GUI)

### What is LM Studio?
LM Studio is a desktop app with a visual interface for running AI models. Perfect if you're not comfortable with command line!

### Step 1: Download & Install

1. Go to https://lmstudio.ai
2. Download for your OS (Windows/Mac/Linux)
3. Install (drag to Applications on Mac, run installer on Windows)
4. Open LM Studio

### Step 2: Download a Model

1. Click the **Search** icon (magnifying glass) in the left sidebar
2. Search for "llama 3.1 8b"
3. Look for "Q4_K_M" version (good quality/size balance)
4. Click **Download**

**Recommended search terms:**
- "llama 3.1 8b q4" - General use
- "mistral 7b q4" - Fast
- "codellama 7b" - Coding

### Step 3: Chat with the Model

1. Click the **Chat** icon in the left sidebar
2. Select your downloaded model from the dropdown
3. Type a message and press Enter!

### Step 4: Enable API Server

1. Click the **Local Server** icon (looks like `<->`)
2. Select your model
3. Click **Start Server**
4. Note the URL: `http://localhost:1234/v1`

Now Noted can connect to it!

### LM Studio Tips

- **Q4_K_M** = Best balance of quality and size
- **Q8_0** = Higher quality, needs more RAM
- **Q2_K** = Smallest, fastest, lower quality
- Start with smaller models if you have limited RAM

---

## 7. Testing Your Setup

### Test Script for All Providers

Create a file `test-ai.js`:

```javascript
// test-ai.js - Test your AI setup
// Run with: node test-ai.js

const provider = process.env.AI_PROVIDER || 'ollama';

async function testOllama() {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.1:8b',
      prompt: 'Say "Ollama is working!" and nothing else.',
      stream: false
    })
  });
  const data = await response.json();
  console.log('Ollama:', data.response);
}

async function testGroq() {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: 'Say "Groq is working!" and nothing else.' }]
    })
  });
  const data = await response.json();
  console.log('Groq:', data.choices[0].message.content);
}

async function testOpenAI() {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say "OpenAI is working!" and nothing else.' }]
    })
  });
  const data = await response.json();
  console.log('OpenAI:', data.choices[0].message.content);
}

async function testLMStudio() {
  const response = await fetch('http://localhost:1234/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'local-model',
      messages: [{ role: 'user', content: 'Say "LM Studio is working!" and nothing else.' }]
    })
  });
  const data = await response.json();
  console.log('LM Studio:', data.choices[0].message.content);
}

// Run the appropriate test
const tests = {
  ollama: testOllama,
  groq: testGroq,
  openai: testOpenAI,
  lmstudio: testLMStudio
};

console.log(`Testing ${provider}...`);
tests[provider]().catch(err => console.error('Error:', err.message));
```

Run it:
```bash
# Test Ollama
node test-ai.js

# Test Groq
AI_PROVIDER=groq GROQ_API_KEY=gsk_xxx node test-ai.js

# Test OpenAI
AI_PROVIDER=openai OPENAI_API_KEY=sk-xxx node test-ai.js
```

---

## 8. Integrating with Noted

### Step 1: Update Your .env File

Copy `.env.example` to `.env` and update:

```bash
# For Ollama (Local)
AI_PROVIDER=ollama
AI_DEFAULT_MODEL=llama3.1:8b
OLLAMA_BASE_URL=http://localhost:11434

# OR for Groq (Free Cloud)
AI_PROVIDER=groq
AI_DEFAULT_MODEL=llama-3.1-8b-instant
GROQ_API_KEY=gsk_your_key_here

# OR for OpenAI (Paid)
AI_PROVIDER=openai
AI_DEFAULT_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-your_key_here

# Embeddings (for AI relationship detection)
EMBEDDING_PROVIDER=ollama
EMBEDDING_MODEL=nomic-embed-text

# Enable features
ENABLE_AI_FEATURES=true
ENABLE_AI_RELATIONSHIPS=true
```

### Step 2: Install Dependencies

```bash
cd d:\noted
npm install openai ollama ai @ai-sdk/openai
```

### Step 3: Restart the App

```bash
npm run dev
```

### Step 4: Verify AI is Working

1. Open Noted in your browser
2. Create a new note
3. Look for the AI assistant button (usually a sparkle icon)
4. Try asking it to summarize your note

---

## 9. Troubleshooting

### Common Issues

#### "Connection refused" to Ollama
```bash
# Make sure Ollama is running
ollama serve

# Check if it's running
curl http://localhost:11434/
```

#### "Model not found"
```bash
# List installed models
ollama list

# Pull the model if missing
ollama pull llama3.1:8b
```

#### Ollama is slow
- Check GPU is being used: `nvidia-smi` (should show ollama process)
- Use a smaller model: `mistral:7b` instead of `llama3.1:70b`
- Close other GPU-heavy applications

#### Groq returns 401 Unauthorized
- Check your API key is correct
- Make sure it starts with `gsk_`
- Try regenerating the key

#### OpenAI returns "insufficient quota"
- Add more credits to your account
- Check your usage limits

#### LM Studio server not responding
- Make sure the server is started (green indicator)
- Check the correct model is loaded
- Try restarting LM Studio

### Getting Help

1. **Ollama Issues:** https://github.com/ollama/ollama/issues
2. **Groq Issues:** https://console.groq.com/docs
3. **OpenAI Issues:** https://help.openai.com
4. **LM Studio Issues:** https://github.com/lmstudio-ai/lmstudio/issues

---

## 10. Cost Comparison

### Monthly Cost Estimates (Moderate Use: ~1000 AI requests/month)

| Provider | Cost | Quality | Speed | Privacy |
|----------|------|---------|-------|---------|
| **Ollama** | $0 (electricity) | Good | Medium | Excellent |
| **Groq** | $0 | Good | Excellent | Medium |
| **OpenAI (mini)** | ~$1-5 | Very Good | Good | Low |
| **OpenAI (4o)** | ~$20-50 | Excellent | Good | Low |
| **Anthropic** | ~$5-30 | Excellent | Good | Low |
| **LM Studio** | $0 (electricity) | Good | Medium | Excellent |

### Recommendation by Use Case

| Your Situation | Recommended Setup |
|----------------|-------------------|
| Privacy is critical | Ollama + llama3.1:8b |
| No GPU, want free | Groq + llama-3.1-8b-instant |
| Best quality, have budget | OpenAI + gpt-4o |
| Learning/experimenting | Groq (free) or LM Studio (visual) |
| Production app | Groq (free tier) → OpenAI (scale) |

---

## Quick Start Checklist

### Ollama Setup (5 minutes)
- [ ] Download Ollama from https://ollama.com
- [ ] Install it
- [ ] Run `ollama pull llama3.1:8b`
- [ ] Run `ollama serve`
- [ ] Update `.env` with Ollama settings
- [ ] Restart Noted

### Groq Setup (3 minutes)
- [ ] Create account at https://console.groq.com
- [ ] Create API key
- [ ] Update `.env` with `GROQ_API_KEY`
- [ ] Restart Noted

---

## Next Steps

1. **Start simple** - Get one provider working first
2. **Test it** - Use the test script to verify
3. **Integrate** - Update your .env file
4. **Experiment** - Try different models for different tasks

**Questions?** Check the main PRD document: [PRD_AI_FEATURES.md](./PRD_AI_FEATURES.md)

---

**Happy AI-ing!**
