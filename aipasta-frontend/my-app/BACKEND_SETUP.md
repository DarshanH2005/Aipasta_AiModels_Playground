# AI Pasta Backend Setup Guide

## Overview
This backend provides a unified API for accessing multiple AI providers (OpenRouter and Hugging Face) with chat streaming, model management, and persistent storage using MongoDB.

## Architecture
```
Frontend (Next.js) → API Routes → AI Providers (OpenRouter/HuggingFace)
                  → MongoDB (Caching, Chat History, Users)
```

## Quick Setup

### 1. Install Dependencies
```bash
cd aipasta-frontend/my-app
npm install mongodb node-fetch
```

### 2. Environment Configuration
Copy `.env.local.example` to `.env.local` and fill in your API keys:

```env
# Required: AI Provider API Keys
OPENROUTER_API_KEY=your_openrouter_api_key_here
HUGGINGFACE_API_KEY=your_huggingface_api_key_here

# Required: MongoDB Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/aipasta?retryWrites=true&w=majority

# Required: NextAuth Configuration
NEXTAUTH_SECRET=your_random_secret_here
NEXTAUTH_URL=http://localhost:3000
```

### 3. Get API Keys

#### OpenRouter API Key
1. Visit [OpenRouter.ai](https://openrouter.ai)
2. Sign up/Login to your account
3. Go to "Keys" section
4. Create a new API key
5. Copy the key to your `.env.local`

#### Hugging Face API Key
1. Visit [HuggingFace.co](https://huggingface.co)
2. Sign up/Login to your account
3. Go to Settings → Access Tokens
4. Create a new token with "Read" permissions
5. Copy the token to your `.env.local`

#### MongoDB Setup
1. Visit [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Create a database user
4. Get the connection string
5. Replace `<password>` and update the URI in `.env.local`

### 4. Test the Backend
```bash
npm run dev
```

Visit these endpoints to test:
- `http://localhost:3000/api/health` - Health check
- `http://localhost:3000/api/models` - Available models

## API Endpoints

### `/api/models` (GET)
Fetches and combines models from OpenRouter and Hugging Face.

**Response:**
```json
{
  "success": true,
  "cached": false,
  "models": {
    "all": [...],
    "multimodal": [...],
    "textOnly": [...],
    "free": [...],
    "paid": [...],
    "byProvider": {
      "openrouter": [...],
      "huggingface": [...]
    }
  },
  "stats": {
    "total": 150,
    "multimodal": 25,
    "free": 30,
    "paid": 120
  }
}
```

### `/api/chat` (POST)
Sends messages to AI models with streaming support.

**Request:**
```json
{
  "model": "anthropic/claude-3-sonnet",
  "messages": [
    {
      "role": "user",
      "content": "Hello!"
    }
  ],
  "stream": true,
  "options": {
    "temperature": 0.7,
    "max_tokens": 1000
  }
}
```

**Non-streaming Response:**
```json
{
  "choices": [{
    "message": {
      "role": "assistant", 
      "content": "Hello! How can I help you?"
    }
  }],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 15,
    "total_tokens": 25
  },
  "cost": {
    "inputCost": 0.000030,
    "outputCost": 0.000375,
    "totalCost": 0.000405
  }
}
```

**Streaming Response:**
Server-Sent Events with `data:` prefixed JSON chunks.

### `/api/chat-history` (GET/POST)
Manages chat history and sessions.

**Save Message (POST):**
```json
{
  "userId": "user123",
  "sessionId": "session-abc",
  "message": {
    "content": "Hello",
    "isUser": true,
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

**Get History (GET):**
`/api/chat-history?sessionId=session-abc&limit=50`

**Get Sessions (GET):**
`/api/chat-history?userId=user123&sessions=true&limit=20`

### `/api/health` (GET)
System health check.

```json
{
  "status": "ok",
  "services": {
    "database": "connected",
    "openrouter": "configured", 
    "huggingface": "configured"
  }
}
```

## Model Providers

### OpenRouter
- **Features:** Premium models, streaming, accurate pricing
- **Models:** GPT-4, Claude, Gemini, Llama, etc.
- **Pricing:** Pay-per-token (varies by model)
- **Rate Limits:** Based on your plan

### Hugging Face
- **Features:** Free inference, open-source models
- **Models:** Llama, Mistral, CodeLlama, FLAN-T5, etc.
- **Pricing:** Free (with rate limits)
- **Rate Limits:** ~30 requests/minute per model

## Database Schema

### Models Collection
```javascript
{
  models: {
    all: [...],
    multimodal: [...],
    // ... categorized models
  },
  stats: {...},
  cachedAt: Date,
  expiresAt: Date
}
```

### Chat History Collection
```javascript
{
  userId: String,
  sessionId: String,
  content: String,
  isUser: Boolean,
  timestamp: String,
  attachments: Array,
  cost: Number,
  modelCount: Number,
  createdAt: Date
}
```

## Rate Limiting
- **Default:** 30 requests per minute per IP
- **Applies to:** All API endpoints
- **Response:** 429 status with retry information

## Error Handling
All endpoints return consistent error format:
```json
{
  "success": false,
  "error": "Error description",
  "details": "Detailed error message"
}
```

## Caching Strategy
- **Models:** Cached in MongoDB for 30 minutes
- **Responses:** Not cached (real-time)
- **Sessions:** Persistent in database

## Security Features
- Rate limiting per IP
- API key validation
- Input sanitization
- MongoDB injection protection

## Monitoring
Monitor these metrics:
- API response times
- Model provider availability
- Database connection health
- Cache hit rates
- Error rates by endpoint

## Troubleshooting

### Common Issues

**"Models API returns empty"**
- Check API keys in `.env.local`
- Verify network connectivity
- Check rate limits

**"Database connection failed"** 
- Verify MongoDB URI
- Check database user permissions
- Ensure network access (whitelist IP)

**"Streaming not working"**
- Verify model supports streaming
- Check for network proxy issues
- Ensure proper error handling

### Debug Mode
Set `NODE_ENV=development` for detailed logs.

## Performance Tips
1. Use MongoDB caching for models
2. Implement request batching for multiple models
3. Use connection pooling for database
4. Add CDN for static assets
5. Enable gzip compression

## Deployment
For production deployment:
1. Set up MongoDB Atlas production cluster
2. Configure environment variables
3. Enable MongoDB connection pooling
4. Set up monitoring and alerts
5. Configure proper CORS settings

## Next Steps
1. Add user authentication (NextAuth.js)
2. Implement usage tracking and billing
3. Add model performance analytics
4. Create admin dashboard
5. Add webhook support for external integrations