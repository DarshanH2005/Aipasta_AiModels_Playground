# 🍝 AI Pasta - Complete Developer Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Project Structure](#project-structure)
4. [Authentication System](#authentication-system)
5. [AI Provider Integration](#ai-provider-integration)
6. [Chat System Workflow](#chat-system-workflow)
7. [API Reference](#api-reference)
8. [Database Schema](#database-schema)
9. [Environment Setup](#environment-setup)
10. [Development Workflow](#development-workflow)
11. [Deployment Guide](#deployment-guide)
12. [Troubleshooting](#troubleshooting)

---

## Project Overview

**AI Pasta** is a comprehensive AI model playground that provides seamless access to multiple AI providers (OpenRouter, Hugging Face) through a unified interface. The platform requires user authentication and provides all users with 2 free starting credits.

### Key Features
- **Multi-Provider Support**: Full OpenRouter integration (327+ models), Hugging Face support
- **Authenticated Access**: Secure JWT-based authentication required for all features
- **Token-Based System**: 10,000 free tokens per user with intelligent usage tracking
- **Smart Model Selection**: Free models prioritized, intelligent default selection
- **Comprehensive Error Handling**: User-friendly error messages with actionable guidance
- **Real-time Chat**: Streaming responses with session management
- **Model Management**: Complete OpenRouter catalog with smart sorting and caching
- **Admin Panel**: User management, analytics, content moderation
- **Performance Optimized**: 15-minute model caching, efficient API usage

---

## Current development status

The project is actively in development. Recent notable updates include:

- Tokens & Wallet
  - Migrated from legacy credits to a token-based wallet. New users are seeded with 10,000 tokens on account creation.
  - Wallet supports free-vs-paid semantics (freeTokens vs purchased tokens). Server does conservative pre-checks and deducts actual usage on completion.
  - Wallet UI moved into the glassmorphic Settings modal on `/chat`; the UI now displays the authoritative server balance (not a local demo value). The demo "Reset Wallet" flow was removed and a production-style "Upgrade Plans" CTA now opens the Plans modal.

- Authentication
  - Google OAuth added while preserving existing email/password + JWT flows. The `loginWithToken` flow accepts provider JWTs and optional user payloads.

- Chat streaming and reliability
  - Fixed duplicated final-chunk in streaming responses by removing redundant completion calls in the frontend streaming flow.
  - Backend now returns minimal user snapshots in both success and error responses (e.g., for insufficient tokens) and the frontend dispatches a global `aiPasta:userUpdated` event. `AuthContext` was hardened to accept multiple payload shapes including minimal `{ tokens }` or `{ credits }` summaries.

- Tests & smoke checks
  - Performed a smoke test reproducing an INSufficient-tokens (402) flow and verified the Wallet UI updates immediately from the server snapshot.

If you want this written into CHANGELOG.md or release notes, I can draft a short changelog entry and an ops migration note next.

### Payments & Plans (Razorpay)

- New backend endpoints for plans and payments:
  - GET  /api/plans — list available plans
  - POST /api/plans/:id/create-order — create a Razorpay order (server-side)
  - POST /api/plans/:id/verify-payment — verify payment signature and credit tokens
  - POST /api/plans/webhook — Razorpay webhook receiver (verifies signature and credits tokens)

- Environment variables required for Razorpay integration (set on backend only):
  - RAZORPAY_KEY_ID — Razorpay key id (public)
  - RAZORPAY_KEY_SECRET — Razorpay key secret (private)
  - RAZORPAY_WEBHOOK_SECRET — (optional) explicit webhook secret; if omitted, RAZORPAY_KEY_SECRET is used

- Notes:
  - Order creation and webhook verification must remain server-side to avoid exposing secrets.
  - The frontend Plans modal uses POST /api/plans/:id/create-order to obtain an order id and the public key, opens Razorpay Checkout, and then calls POST /api/plans/:id/verify-payment to finalize and obtain an updated user snapshot.
  - Seed scripts include default plans; run `npm run seed:plans` in `aipasta-backend` to populate the DB.

### Architecture Philosophy
- **Security First**: JWT authentication required for all functionality
- **Token-Based Usage**: Fair usage through intelligent token management system
- **Error Resilience**: Comprehensive error handling with graceful degradation
- **Performance Optimized**: Caching, smart defaults, and efficient API usage
- **User Experience**: Clear feedback, helpful error messages, and intuitive interface
- **Microservice Ready**: Separated frontend/backend for scalability

---

## Architecture & Tech Stack

### Frontend Stack
```
Framework: Next.js 15.5.3 (React 19.1.0)
Styling: Tailwind CSS 4.x
State Management: React Context + SWR
Icons: Tabler Icons
Markdown: React-markdown with syntax highlighting
Build Tool: Turbopack
```

### Backend Stack
```
Framework: Express.js 4.18.2
Database: MongoDB 8.0.3 with Mongoose ODM
Authentication: JWT with bcryptjs
Security: Helmet, CORS, rate limiting
Validation: Express-validator
Logging: Morgan
Process Management: Nodemon (dev)
```

### External Services
```
AI Providers: OpenRouter API, Hugging Face API
Database: MongoDB Atlas
Deployment: Vercel (frontend), Railway/Heroku (backend)
```

---

## Project Structure

```
aipasta/
├── .github/
│   └── copilot-instructions.md      # GitHub Copilot configuration
├── aipasta-backend/                 # Express.js API Server
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          # MongoDB connection
│   │   ├── middleware/
│   │   │   ├── auth.js              # Authentication middleware
│   │   │   ├── errorHandler.js      # Global error handling
│   │   │   └── validation.js        # Input validation
│   │   ├── models/
│   │   │   ├── User.js              # User schema
│   │   │   ├── AIModel.js           # AI model schema
│   │   │   ├── ChatSession.js       # Chat session schema
│   │   │   └── ChatMessage.js       # Chat message schema
│   │   ├── routes/
│   │   │   ├── auth.js              # Authentication routes
│   │   │   ├── chat.js              # Chat functionality
│   │   │   ├── models.js            # Model management
│   │   │   ├── user.js              # User management
│   │   │   └── admin.js             # Admin functionality
│   │   ├── services/
│   │   │   ├── openRouterService.js # OpenRouter API integration
│   │   │   └── huggingFaceService.js# HuggingFace API integration
│   │   └── server.js                # Express app entry point
│   ├── scripts/
│   │   ├── seedModels.js            # Database seeding with OpenRouter models
│   │   ├── upgradeUserTokens.js     # User token upgrade utility
│   │   ├── testChatThreads.js       # Chat functionality testing
│   │   └── resetDatabase.js         # Database reset utility
│   └── package.json
├── aipasta-frontend/                # Next.js Frontend Application
│   └── my-app/
│       ├── src/
│       │   ├── app/                 # Next.js App Router
│       │   │   ├── layout.js        # Root layout
│       │   │   ├── page.tsx         # Home page
│       │   │   └── globals.css      # Global styles
│       │   ├── pages/               # Additional pages
│       │   │   └── chat.js          # Chat interface
│       │   ├── components/          # React components
│       │   │   ├── ui/              # Base UI components
│       │   │   ├── auth/            # Authentication components
│       │   │   ├── chat/            # Chat components
│       │   │   └── layout/          # Layout components
│       │   ├── lib/                 # Utility libraries
│       │   │   ├── api-client.js    # Backend API client
│       │   │   ├── openrouter-direct.js # Direct OpenRouter calls
│       │   │   └── error-logger.js  # Error logging utility
│       │   ├── hooks/               # Custom React hooks
│       │   │   ├── useAuth.js       # Authentication hook
│       │   │   └── useChat.js       # Chat functionality hook
│       │   └── context/             # React contexts
│       │       ├── AuthContext.js   # Authentication state
│       │       └── ThemeContext.js  # Theme management
│       └── package.json
├── PROJECT_PLAN.md                  # Detailed project plan
├── CHAT_IMPROVEMENTS.md             # Chat feature improvements
└── DEVELOPER_GUIDE.md               # This file
```

---

## Authentication System

### Authentication Flow Architecture

The AI Pasta authentication system requires user authentication for all functionality:

#### **Authenticated Users** (Full Platform Access)
- JWT token-based authentication required
- Full database persistence
- Credit system starting with 2 free credits
- Session history and management
- Rate limiting and security features
- Access to all AI models and features

### Authentication Middleware

#### `authenticateToken` Middleware
```javascript
// Requires valid JWT token for all chat and model routes
app.use('/api/chat', authenticateToken, chatRoutes);
app.use('/api/models', authenticateToken, modelsRoutes);
app.use('/api/user', authenticateToken, userRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
```

### JWT Token Structure
```javascript
{
  id: "user_mongodb_id",
  email: "user@example.com",
  role: "user|admin",
  iat: 1700000000,  // issued at
  exp: 1700086400   // expires (24h later)
}
```

### Frontend Authentication States
```javascript
// AuthContext.js
const authStates = {
  LOADING: 'loading',           // Checking token validity
  AUTHENTICATED: 'authenticated', // Valid token, full features
  UNAUTHENTICATED: 'unauthenticated', // No token, requires login
  ERROR: 'error'                // Token invalid/expired
};
```

### Authentication Flow Diagram
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│    New User     │───▶│   Registration   │───▶│  Authenticated  │
│                 │    │   /Login         │    │     User        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │ Full Platform   │
                                               │   Access        │
                                               │ • 5,000 tokens  │
                                               │ • All features  │
                                               │ • Chat history  │
                                               └─────────────────┘
```

## Token Management System

### Token Architecture

AI Pasta uses an intelligent token-based system for fair usage and enhanced user experience:

#### Token Structure
```javascript
// User token system
{
  tokens: {
    balance: 5000,        // Current token balance
    freeTokens: 5000,     // Free tokens allocated
    purchasedTokens: 0,   // Additional purchased tokens
    usedTokens: 0,        // Total tokens consumed
    lastResetDate: Date   // Last free token reset
  },
  credits: 5000           // Legacy credit system (synchronized)
}
```

#### Token Management Features
- **5,000 Free Tokens**: All users start with generous token allowance
- **Pre-validation**: Token checks before request processing
- **Graceful Degradation**: Intelligent handling of insufficient tokens
- **Real-time Updates**: Live token balance updates in UI
- **Usage Tracking**: Comprehensive token consumption analytics
- **Smart Estimation**: Accurate token usage prediction

### Token Usage Flow
```
User Request → Token Pre-check → Estimate Usage → 
Process if Sufficient → Deduct Actual Usage → Update Balance → 
Return Updated Balance to Frontend
```

#### Token Validation Middleware
```javascript
// Pre-check validation in chat.js
const estimatedTokens = estimateTokenUsage(message, modelId);
if (user.tokens.balance < estimatedTokens) {
  return res.status(400).json({
    status: 'error',
    message: 'Insufficient tokens for this request',
    data: {
      required: estimatedTokens,
      available: user.tokens.balance,
      suggestion: 'Try a shorter message or upgrade your plan'
    }
  });
}
```

#### Error Handling with Token Context
```javascript
// Enhanced error messages with token information
const tokenErrorHandling = {
  INSUFFICIENT_TOKENS: {
    message: '🪙 Not enough tokens for this request',
    action: 'Try a shorter message or upgrade your plan',
    showBalance: true
  },
  TOKEN_ESTIMATION_FAILED: {
    message: '⚠️ Unable to estimate token usage',
    action: 'Please try again or contact support',
    showBalance: false
  }
};
```

---

## AI Provider Integration

### Multi-Provider Architecture

AI Pasta uses **backend proxy integration** for all authenticated users:

1. **Backend Proxy** (for all users)
   - Centralized API management
   - Usage tracking and billing
   - Rate limiting and security
   - Model availability management

### Provider Services

#### OpenRouter Service (`openRouterService.js`)
```javascript
class OpenRouterService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://openrouter.ai/api/v1';
    this.modelCache = new Map();
    this.cacheExpiry = 15 * 60 * 1000; // 15 minutes
  }

  async sendMessage(message, model, options = {}) {
    // Enhanced streaming response handling
    // Comprehensive error handling with user-friendly messages
    // Token usage tracking and estimation
    // Support for all OpenRouter model capabilities
  }

  async getModels() {
    // Smart caching system (15-minute cache)
    // Complete OpenRouter catalog (327+ models)
    // Intelligent sorting prioritizing free models
    // Performance optimization with minimal API calls
    return this.getCachedModels() || await this.fetchAndCacheModels();
  }

  getPreferredModels() {
    // Smart default selection algorithm
    return [
      'meta-llama/llama-3.1-405b-instruct:free',
      'deepseek/deepseek-r1:free',
      'agentica/deepcoder:free',
      'arliai/qwq-32b-preview:free'
    ];
  }

  async getCachedModels() {
    const cached = this.modelCache.get('models');
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }
}
```

#### Hugging Face Service (`huggingFaceService.js`)
```javascript
class HuggingFaceService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api-inference.huggingface.co';
  }

  async generateText(input, model) {
    // Text generation
    // Custom model support
  }
}
```

### Direct Frontend Integration
*Removed in current version - all functionality requires authentication*

### Provider Selection Logic
```javascript
// Enhanced api-client.js with comprehensive error handling
export async function sendChatMessage(message, modelId, sessionId) {
  try {
    // Pre-validate token availability
    const user = getCurrentUser();
    const estimatedTokens = estimateTokenUsage(message, modelId);
    
    if (user.tokens.balance < estimatedTokens) {
      throw new Error(`🪙 Not enough tokens (need ${estimatedTokens}, have ${user.tokens.balance})`);
    }

    // Send to backend with enhanced error handling
    const response = await fetch('/api/chat', {
      headers: getAuthHeaders(),
      body: JSON.stringify({ message, modelId, sessionId })
    });

    if (response.ok) {
      const result = await response.json();
      // Update user token balance from response
      updateUserTokens(result.data.user?.tokens);
      return result;
    }

    // Enhanced error handling with specific messages
    if (response.status === 401) {
      throw new Error('🔐 Please log in to continue chatting');
    }
    
    if (response.status === 429) {
      throw new Error('⚡ Too many requests. Please wait a moment');
    }
    
    if (response.status === 403) {
      throw new Error('🚫 Access denied. Check your subscription');
    }

    throw new Error(`❌ Request failed (${response.status}). Please try again`);
  } catch (error) {
    // Enhanced error logging and user feedback
    console.error('Chat API Error:', error);
    throw error;
  }
}

// Smart model selection with free model prioritization
export async function getDefaultModel() {
  try {
    const models = await getModels({ limit: 10, search: 'free' });
    
    // Prioritize high-quality free models
    const preferred = [
      'meta-llama/llama-3.1-405b-instruct:free',
      'deepseek/deepseek-r1:free',
      'agentica/deepcoder:free'
    ];
    
    for (const modelId of preferred) {
      const model = models.find(m => m.id === modelId);
      if (model) return model;
    }
    
    // Fallback to any free model
    return models.find(m => m.pricing?.prompt === 0) || models[0];
  } catch (error) {
    console.error('Default model selection failed:', error);
    return null;
  }
}
```

### Model Management Flow
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Request  │───▶│   Authentication │───▶│   Backend API   │
│   for Models    │    │     Check        │    │   /api/models   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                │ (unauthenticated)      ▼
                                ▼                ┌─────────────────┐
                       ┌─────────────────┐      │   Database      │
                       │ Authentication  │      │   AIModel       │
                       │   Required      │      │   Collection    │
                       └─────────────────┘      └─────────────────┘
```

---

## Chat System Workflow

### Chat Architecture Overview

The chat system operates with **authenticated users only**:

#### Authenticated User Chat Flow
```
User Input → Frontend Validation → Backend API → Database Storage → AI Provider → Response → Database → Frontend
```

### Session Management

#### Backend Sessions (All Users)
```javascript
// ChatSession Schema
{
  sessionId: "chat_1700000000_abc123",
  userId: ObjectId("..."),
  title: "New Chat",
  models: ["gpt-4", "claude-3"],
  messageCount: 5,
  totalTokens: 1250,
  totalCost: 0.05,
  lastMessageAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Message Flow Detailed

#### 1. Message Sending Process
```javascript
// chat.js (Frontend)
const sendMessage = async (message, modelId) => {
  // 1. Validate input
  if (!message.trim()) return;

  // 2. Add user message to UI immediately
  setMessages(prev => [...prev, { 
    role: 'user', 
    content: message, 
    timestamp: new Date() 
  }]);

  // 3. Show loading indicator
  setIsLoading(true);

  try {
    // 4. Call API (backend or direct)
    const response = await sendChatMessage({
      message,
      modelId,
      sessionId: currentSession?.id
    });

    // 5. Handle response
    if (response.success) {
      setMessages(prev => [...prev, response.data.message]);
    } else {
      // Handle error
      showError(response.error);
    }
  } catch (error) {
    showError('Failed to send message');
  } finally {
    setIsLoading(false);
  }
};
```

#### 2. Backend Processing (Authenticated Users)
```javascript
// routes/chat.js
const sendChatMessage = async (req, res, next) => {
  try {
    const { message, modelId, sessionId } = req.body;
    const userId = req.user._id;

    // 1. Validate user credits
    if (!req.user.hasCredits(1)) {
      return next(new AppError('Insufficient credits', 403));
    }

    // 2. Check daily limits
    const dailyUsage = await ChatMessage.countDocuments({
      userId,
      createdAt: { $gte: startOfDay }
    });

    if (dailyUsage >= req.user.subscription.limits.requestsPerDay) {
      return next(new AppError('Daily limit exceeded', 429));
    }

    // 3. Get or create session
    let session = await ChatSession.findOne({ sessionId, userId });
    if (!session) {
      session = await ChatSession.create({
        sessionId: sessionId || generateSessionId(),
        userId,
        title: message.substring(0, 50) + '...'
      });
    }

    // 4. Save user message
    const userMessage = await ChatMessage.create({
      sessionId: session.sessionId,
      userId,
      role: 'user',
      content: message,
      modelId
    });

    // 5. Call AI provider
    const aiResponse = await openRouterService.sendMessage(
      message,
      modelId,
      { maxTokens: 4000, temperature: 0.7 }
    );

    // 6. Save AI response
    const aiMessage = await ChatMessage.create({
      sessionId: session.sessionId,
      userId,
      role: 'assistant',
      content: aiResponse.content,
      modelId,
      usage: aiResponse.usage
    });

    // 7. Update session stats
    await session.updateOne({
      $inc: { messageCount: 2, totalTokens: aiResponse.usage.totalTokens },
      lastMessageAt: new Date()
    });

    // 8. Update user stats
    await req.user.updateOne({
      $inc: { 
        credits: -1,
        'usage.totalRequests': 1,
        'usage.totalTokens': aiResponse.usage.totalTokens,
        'usage.totalCost': aiResponse.cost || 0
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        message: aiMessage,
        session: session,
        usage: aiResponse.usage
      }
    });

  } catch (error) {
    next(error);
  }
};
```

### Session Persistence

#### Database Session Persistence (All Users)
- **Database Storage**: MongoDB with automatic timestamps
- **User Association**: Sessions linked to user ID
- **Cross-Device Sync**: Access sessions from any device
- **Message History**: Complete conversation history stored
- **Credit Tracking**: Usage tracked per user

---

## API Reference

### Authentication Endpoints

#### `POST /api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "credits": 2
    },
    "token": "jwt_token_here"
  }
}
```

#### `POST /api/auth/login`
Authenticate user and get JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "credits": 2
    },
    "token": "jwt_token_here"
  }
}
```

### Chat Endpoints

#### `POST /api/chat/sessions`
Create a new chat session.

**Authentication:** Required

**Request Body:**
```json
{
  "title": "New Chat Session",
  "modelId": "gpt-4"
}
```

**Response (Success):**
```json
{
  "status": "success",
  "data": {
    "session": {
      "sessionId": "chat_1700000000_abc123",
      "title": "New Chat Session",
      "userId": "user_id",
      "messageCount": 0,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### `GET /api/chat/sessions`
Get user's chat sessions.

**Authentication:** Required

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)

**Response:**
```json
{
  "status": "success",
  "results": 5,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  },
  "data": {
    "sessions": [
      {
        "sessionId": "chat_1700000000_abc123",
        "title": "Chat about AI",
        "messageCount": 10,
        "lastMessageAt": "2024-01-01T12:00:00.000Z"
      }
    ]
  }
}
```

#### `POST /api/chat`
Send a chat message.

**Authentication:** Required

**Request Body:**
```json
{
  "message": "Hello, how are you?",
  "modelId": "gpt-4",
  "sessionId": "chat_1700000000_abc123",
  "options": {
    "temperature": 0.7,
    "maxTokens": 4000
  }
}
```

**Response (Success):**
```json
{
  "status": "success",
  "data": {
    "message": {
      "id": "msg_id",
      "role": "assistant",
      "content": "Hello! I'm doing well, thank you for asking...",
      "modelId": "gpt-4",
      "createdAt": "2024-01-01T12:00:00.000Z"
    },
    "usage": {
      "promptTokens": 10,
      "completionTokens": 50,
      "totalTokens": 60
    }
  }
}
```

### Model Endpoints

#### `GET /api/models`
Get available AI models.

**Authentication:** Required

**Query Parameters:**
- `provider` (string): Filter by provider (openrouter, huggingface)
- `search` (string): Search model names
- `limit` (number): Maximum results (default: 100)
- `sort` (string): Sort order (name, price, popularity)

**Response:**
```json
{
  "status": "success",
  "data": {
    "models": [
      {
        "modelId": "gpt-4",
        "name": "GPT-4",
        "provider": "openrouter",
        "description": "Most capable GPT-4 model",
        "pricing": {
          "input": 0.03,
          "output": 0.06
        },
        "contextWindow": 128000,
        "capabilities": ["text", "reasoning"]
      }
    ]
  }
}
```

### User Management Endpoints

#### `GET /api/user/profile`
Get current user profile.

**Authentication:** Required

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user",
      "credits": 2,
      "subscription": {
        "plan": "free",
        "limits": {
          "requestsPerDay": 50,
          "tokensPerMonth": 10000
        }
      },
      "usage": {
        "totalRequests": 150,
        "totalTokens": 5000,
        "totalCost": 2.50
      }
    }
  }
}
```

#### `PUT /api/user/profile`
Update user profile.

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Jane Doe",
  "preferences": {
    "theme": "dark",
    "defaultModels": ["gpt-4", "claude-3"],
    "language": "en"
  }
}
```

### Error Handling

All endpoints return consistent error responses:

```json
{
  "status": "error",
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": "Additional error details"
}
```

**Common Error Codes:**
- `400`: Bad Request - Invalid input data
- `401`: Unauthorized - Authentication required
- `403`: Forbidden - Insufficient permissions/credits
- `404`: Not Found - Resource not found
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Server error

---

## Database Schema

### MongoDB Collections

#### Users Collection
```javascript
// models/User.js - Enhanced Token System
{
  _id: ObjectId,
  email: String (unique, required),
  password: String (hashed, required),
  passwordChangedAt: Date,
  name: String (required),
  avatar: String,
  role: Enum['user', 'admin'],
  isActive: Boolean,
  preferences: {
    theme: Enum['light', 'dark', 'auto'],
    defaultModels: [String],
    language: String
  },
  usage: {
    totalRequests: Number,
    totalTokens: Number,
    totalCost: Number
  },
  // Enhanced Token System
  tokens: {
    balance: Number,        // Current available tokens (default: 5000)
    freeTokens: Number,     // Free tokens allocated (default: 5000)
    purchasedTokens: Number, // Additional purchased tokens
    usedTokens: Number,     // Total tokens consumed
    lastResetDate: Date     // Last free token reset
  },
  credits: Number,          // Legacy system (synchronized with tokens)
  subscription: {
    plan: Enum['free', 'pro', 'enterprise'],
    expiresAt: Date,
    limits: {
      requestsPerDay: Number,
      tokensPerMonth: Number
    }
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### Chat Sessions Collection
```javascript
// models/ChatSession.js
{
  _id: ObjectId,
  sessionId: String (unique, required), // 'chat_timestamp_random'
  userId: ObjectId (ref: 'User', required),
  title: String,
  models: [String], // Array of model IDs used in session
  messageCount: Number,
  totalTokens: Number,
  totalCost: Number,
  lastMessageAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### Chat Messages Collection
```javascript
// models/ChatMessage.js
{
  _id: ObjectId,
  sessionId: String (required), // References ChatSession.sessionId
  userId: ObjectId (ref: 'User', required),
  role: Enum['user', 'assistant', 'system'],
  content: String (required),
  modelId: String, // AI model used for this message
  usage: {
    promptTokens: Number,
    completionTokens: Number,
    totalTokens: Number
  },
  cost: Number,
  attachments: [{
    type: String,
    url: String,
    name: String
  }],
  metadata: {
    temperature: Number,
    maxTokens: Number,
    topP: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### AI Models Collection
```javascript
// models/AIModel.js
{
  _id: ObjectId,
  modelId: String (unique, required), // 'gpt-4', 'claude-3-opus'
  name: String (required),
  provider: Enum['openrouter', 'huggingface', 'openai'],
  description: String,
  pricing: {
    input: Number, // Cost per 1K input tokens
    output: Number // Cost per 1K output tokens
  },
  contextWindow: Number,
  capabilities: [String], // ['text', 'image', 'code', 'reasoning']
  isAvailable: Boolean,
  lastChecked: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Database Relationships

```
Users (1) ──────── (Many) ChatSessions
  │                          │
  │                          │
  │                     sessionId
  │                          │
  └────────── (Many) ChatMessages
                     │
                     └─── modelId ──── (1) AIModels
```

### Indexes for Performance

```javascript
// User indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1, isActive: 1 });

// ChatSession indexes
db.chatsessions.createIndex({ sessionId: 1 }, { unique: true });
db.chatsessions.createIndex({ userId: 1, lastMessageAt: -1 });

// ChatMessage indexes
db.chatmessages.createIndex({ sessionId: 1, createdAt: 1 });
db.chatmessages.createIndex({ userId: 1, createdAt: -1 });

// AIModel indexes
db.aimodels.createIndex({ modelId: 1 }, { unique: true });
db.aimodels.createIndex({ provider: 1, isAvailable: 1 });
```

### Data Flow Examples

#### Creating a New Chat Message
```
1. User sends message → Frontend validation
2. API call to POST /api/chat
3. Backend validates authentication & credits
4. Create ChatMessage document with role: 'user'
5. Call AI provider API
6. Create ChatMessage document with role: 'assistant'
7. Update ChatSession with messageCount++, totalTokens
8. Update User usage stats and decrement credits
9. Return response to frontend
```

#### Session Management
```
1. User starts new chat → Frontend calls POST /api/chat/sessions
2. Backend creates ChatSession with unique sessionId
3. User sends messages → Messages link to session via sessionId
4. User requests session list → Backend queries by userId
5. User loads specific session → Query messages by sessionId
```

---

## Environment Setup

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **MongoDB**: Local instance or MongoDB Atlas account
- **API Keys**: OpenRouter and/or Hugging Face API keys
- **Git**: For version control

### Backend Environment Variables

Create `.env` file in `aipasta-backend/`:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/aipasta
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/aipasta

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=7d

# AI Provider API Keys (REQUIRED for full functionality)
OPENROUTER_API_KEY=your-openrouter-api-key  # Required for 327+ model access
HUGGINGFACE_API_KEY=your-huggingface-api-key

# CORS Settings
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Performance & Caching
MODEL_CACHE_DURATION=900000  # 15 minutes in milliseconds
MAX_TOKENS_PER_REQUEST=4000  # Maximum tokens per single request

# Email Configuration (optional)
EMAIL_FROM=noreply@aipasta.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password

# Error Monitoring (optional)
SENTRY_DSN=your-sentry-dsn
```

### Frontend Environment Variables

Create `.env.local` file in `aipasta-frontend/my-app/`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000

# OpenRouter (for direct integration)
NEXT_PUBLIC_OPENROUTER_API_KEY=your-openrouter-api-key

# App Configuration
NEXT_PUBLIC_APP_NAME=AI Pasta
NEXT_PUBLIC_APP_VERSION=1.0.0

# Development
NEXT_PUBLIC_DEBUG_MODE=true
```

### Installation & Setup

#### 1. Clone Repository
```bash
git clone <repository-url>
cd aipasta
```

#### 2. Backend Setup
```bash
cd aipasta-backend
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your configuration

# Seed database with models
npm run seed

# Start development server
npm run dev
```

#### 3. Frontend Setup
```bash
cd aipasta-frontend/my-app
npm install

# Copy environment template
cp .env.local.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

#### 4. Verify Setup
- Backend: http://localhost:5000/health
- Frontend: http://localhost:3000
- Test chat functionality with both authenticated and anonymous users

### Development Database Setup

#### Local MongoDB
```bash
# Install MongoDB Community Edition
# Start MongoDB service
mongod --dbpath /path/to/your/db

# Connect with MongoDB Compass or CLI
mongo mongodb://localhost:27017/aipasta
```

#### MongoDB Atlas (Recommended)
```bash
1. Create account at mongodb.com/atlas
2. Create new cluster
3. Add database user
4. Whitelist IP address (0.0.0.0/0 for development)
5. Get connection string
6. Update MONGODB_URI in .env
```

### API Key Configuration

#### OpenRouter API Key
```bash
1. Visit https://openrouter.ai/
2. Sign up/login
3. Go to Keys section
4. Create new API key
5. Add to both backend and frontend .env files
```

#### Hugging Face API Key
```bash
1. Visit https://huggingface.co/
2. Sign up/login
3. Go to Settings → Access Tokens
4. Create new token with 'read' permission
5. Add to backend .env file
```

---

## Development Workflow

### Git Workflow

#### Branch Structure
```
main                    # Production-ready code
├── develop            # Integration branch
├── feature/chat-ui    # Feature branches
├── feature/auth       # Feature branches
└── hotfix/urgent-fix  # Hotfix branches
```

#### Development Process
```bash
# 1. Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/new-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add new chat feature"

# 3. Push and create PR
git push origin feature/new-feature
# Create Pull Request to develop

# 4. After review and merge
git checkout develop
git pull origin develop
git branch -d feature/new-feature
```

### Code Standards

#### Backend Code Style
```javascript
// Use consistent error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Consistent API responses
const sendResponse = (res, statusCode, data, message) => {
  res.status(statusCode).json({
    status: statusCode < 400 ? 'success' : 'error',
    message,
    data
  });
};

// Input validation
const validateChatMessage = [
  body('message').notEmpty().withMessage('Message is required'),
  body('modelId').notEmpty().withMessage('Model ID is required')
];
```

#### Frontend Code Style
```javascript
// Use consistent component structure
const ChatMessage = ({ message, isUser }) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="message-bubble">
        {message.content}
      </div>
    </div>
  );
};

// Use custom hooks for logic
const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const sendMessage = useCallback(async (content, modelId) => {
    // Chat logic here
  }, []);
  
  return { messages, isLoading, sendMessage };
};
```

### Testing Strategy

#### Backend Testing
```javascript
// Unit tests with Jest
describe('Chat API', () => {
  test('should send chat message successfully', async () => {
    const response = await request(app)
      .post('/api/chat')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        message: 'Hello',
        modelId: 'gpt-4'
      });
      
    expect(response.status).toBe(200);
    expect(response.body.data.message).toBeDefined();
  });
});

// Integration tests
describe('Authentication Flow', () => {
  test('complete user registration and login', async () => {
    // Test user registration
    // Test user login
    // Test protected route access
  });
});
```

#### Frontend Testing
```javascript
// Component tests with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import ChatInterface from '../components/ChatInterface';

test('sends message when form is submitted', async () => {
  render(<ChatInterface />);
  
  const input = screen.getByPlaceholderText('Type your message...');
  const button = screen.getByText('Send');
  
  fireEvent.change(input, { target: { value: 'Test message' } });
  fireEvent.click(button);
  
  expect(screen.getByText('Test message')).toBeInTheDocument();
});
```

### Debugging Guide

#### Backend Debugging
```javascript
// Add debug middleware
const debugMiddleware = (req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    user: req.user?.id,
    timestamp: new Date().toISOString()
  });
  next();
};

// Use debug package
const debug = require('debug')('aipasta:chat');
debug('Processing chat message', { messageId, userId });
```

#### Frontend Debugging
```javascript
// React DevTools
// Redux DevTools (if using Redux)
// Console debugging
useEffect(() => {
  console.log('Chat state changed:', { 
    messages: messages.length, 
    isLoading, 
    currentSession 
  });
}, [messages, isLoading, currentSession]);

// Network debugging in browser DevTools
// Check API calls in Network tab
// Inspect localStorage for session data
```

---

## Deployment Guide

### Production Environment Setup

#### Backend Deployment (Railway/Heroku)

##### Railway Deployment
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and initialize
railway login
railway init

# 3. Set environment variables
railway variables set NODE_ENV=production
railway variables set MONGODB_URI=your-atlas-connection-string
railway variables set JWT_SECRET=your-production-jwt-secret
railway variables set OPENROUTER_API_KEY=your-api-key

# 4. Deploy
railway up
```

##### Heroku Deployment
```bash
# 1. Install Heroku CLI
npm install -g heroku

# 2. Create Heroku app
heroku create aipasta-backend

# 3. Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-atlas-connection-string
heroku config:set JWT_SECRET=your-production-jwt-secret

# 4. Deploy
git push heroku main
```

#### Frontend Deployment (Vercel)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Navigate to frontend directory
cd aipasta-frontend/my-app

# 3. Deploy
vercel --prod

# 4. Set environment variables in Vercel dashboard
# NEXT_PUBLIC_API_URL=https://your-backend-url.com
# NEXT_PUBLIC_OPENROUTER_API_KEY=your-api-key
```

### Production Checklist

#### Security
- [ ] JWT_SECRET is securely generated (32+ characters)
- [ ] MongoDB Atlas IP whitelist configured
- [ ] CORS origins restricted to your domain
- [ ] Rate limiting enabled
- [ ] Helmet security headers configured
- [ ] HTTPS enforced
- [ ] Environment variables secured

#### Performance
- [ ] Database indexes created
- [ ] Image optimization enabled
- [ ] Compression middleware enabled
- [ ] CDN configured for static assets
- [ ] Caching headers set appropriately

#### Monitoring
- [ ] Error tracking (Sentry, LogRocket)
- [ ] Performance monitoring
- [ ] Uptime monitoring
- [ ] Database monitoring
- [ ] Log aggregation

### Environment-Specific Configuration

#### Development
```javascript
// Verbose logging
// Hot reload enabled
// CORS allows localhost
// Detailed error messages
```

#### Staging
```javascript
// Production-like environment
// Limited logging
// Staging database
// Error tracking enabled
```

#### Production
```javascript
// Minimal logging
// Compressed responses
// Production database
// Full monitoring suite
```

---

## Troubleshooting

### Recent Fixes (Dev notes)

- Dev HMR guard: In development some Next.js HMR messages (ISR manifest updates) assume
  `window.next.router.components` exists; that caused a TypeError reading `components`.
  A small dev-only guard was added to `aipasta-frontend/my-app/src/pages/_app.js` which
  initializes `window.next.router.components = {}` early during client bootstrap to
  prevent the dev overlay from throwing when the HMR client receives `isrManifest`.

- PAYWALL structured errors: Backend chat route now returns a structured error object
  when access is denied for premium/paid models. The error includes `code: 'PAYWALL'`
  and `requiredPlan` so the frontend can present an upgrade CTA or auto-fallback to a
  free model. See `aipasta-backend/src/routes/chat.js` and frontend handling in
  `aipasta-frontend/my-app/src/lib/api-client.js` (sendChatMessage) for implementation.


### Common Issues & Solutions

#### Token System Issues

##### Insufficient Token Errors
```javascript
// Error: "🪙 Not enough tokens for this request"
// Solution: Comprehensive token management and user guidance

// Enhanced error handling in useStreamingResponses.js:
const handleTokenError = (error) => {
  if (error.message.includes('tokens') || error.message.includes('🪙')) {
    return {
      type: 'token_error',
      message: '🪙 Not enough tokens for this request',
      suggestion: 'Try a shorter message, use a free model, or upgrade your plan',
      showBalance: true,
      actionable: true
    };
  }
  return null;
};

// Token pre-validation in chat.js:
const estimatedTokens = estimateTokenUsage(message, modelId);
if (user.tokens.balance < estimatedTokens) {
  return res.status(400).json({
    status: 'error',
    message: 'Insufficient tokens for this request',
    data: {
      required: estimatedTokens,
      available: user.tokens.balance,
      suggestion: 'Try a shorter message or select a free model'
    }
  });
}
```

##### Token Upgrade Issues
```javascript
// Error: Users stuck with 500 tokens
// Solution: Use upgradeUserTokens.js script

// Run token upgrade:
cd aipasta-backend
node scripts/upgradeUserTokens.js

// Verify upgrade:
// 1. Check MongoDB directly
// 2. Test /api/user/profile endpoint
// 3. Verify frontend token display
```

##### Model Selection Issues
```javascript
// Error: Default paid models causing access issues
// Solution: Smart default selection prioritizing free models

// Enhanced model sorting in models.js:
const getDefaultSortedModels = (models) => {
  const freeModels = models.filter(m => m.pricing?.prompt === 0);
  const paidModels = models.filter(m => m.pricing?.prompt > 0);
  
  // Preferred free models first
  const preferred = [
    'meta-llama/llama-3.1-405b-instruct:free',
    'deepseek/deepseek-r1:free',
    'agentica/deepcoder:free'
  ];
  
  return [...sortByPreference(freeModels, preferred), ...paidModels];
};
```

#### Backend Issues

##### MongoDB Connection Issues
```javascript
// Error: MongooseError: Operation `users.find()` buffering timed out
// Solution: Check MongoDB URI and network connectivity

// Debugging steps:
1. Verify MONGODB_URI in .env
2. Check MongoDB Atlas IP whitelist
3. Test connection with MongoDB Compass
4. Check firewall settings

// Test connection:
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));
```

##### JWT Authentication Errors
```javascript
// Error: JsonWebTokenError: invalid signature
// Solution: Verify JWT_SECRET consistency

// Debugging steps:
1. Check JWT_SECRET in .env matches token generation
2. Verify token format in Authorization header
3. Check token expiration
4. Clear localStorage and re-authenticate

// Debug middleware:
const debugAuth = (req, res, next) => {
  console.log('Auth header:', req.headers.authorization);
  console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
  next();
};
```

##### OpenRouter API Issues
```javascript
// Error: 401 Unauthorized from OpenRouter
// Solution: Verify API key and request format

// Debugging steps:
1. Check OPENROUTER_API_KEY validity
2. Verify request headers and format
3. Check OpenRouter API status
4. Test with direct curl request

// Test API key:
curl -H "Authorization: Bearer your-api-key" \
     https://openrouter.ai/api/v1/models
```

##### Enhanced OpenRouter Integration
```javascript
// New Features: 327+ models, smart caching, error handling
// Solution: Comprehensive integration with performance optimization

// Model fetching with caching (openRouterService.js):
async getModels() {
  const cached = this.getCachedModels();
  if (cached) return cached;
  
  try {
    const response = await fetch(`${this.baseURL}/models`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    
    if (!response.ok) {
      throw new Error(`OpenRouter API failed: ${response.status}`);
    }
    
    const { data } = await response.json();
    
    // Enhanced model processing with smart sorting
    const processedModels = data.map(model => ({
      id: model.id,
      name: model.name,
      description: model.description,
      pricing: {
        prompt: parseFloat(model.pricing?.prompt || 0),
        completion: parseFloat(model.pricing?.completion || 0)
      },
      context_length: model.context_length,
      architecture: model.architecture
    }));
    
    // Cache models for 15 minutes
    this.cacheModels(processedModels);
    return this.sortModelsByPreference(processedModels);
    
  } catch (error) {
    console.error('Failed to fetch OpenRouter models:', error);
    // Return fallback models if available
    return this.getFallbackModels();
  }
}

// Smart model sorting prioritizing free models:
sortModelsByPreference(models) {
  const freeModels = models.filter(m => m.pricing.prompt === 0);
  const paidModels = models.filter(m => m.pricing.prompt > 0);
  
  const preferred = [
    'meta-llama/llama-3.1-405b-instruct:free',
    'deepseek/deepseek-r1:free',
    'agentica/deepcoder:free',
    'arliai/qwq-32b-preview:free'
  ];
  
  return [
    ...this.sortByPreference(freeModels, preferred),
    ...paidModels.sort((a, b) => a.pricing.prompt - b.pricing.prompt)
  ];
}
```

#### Frontend Issues

##### API Connection Issues
```javascript
// Error: Network request failed
// Solution: Check API_BASE configuration

// Debugging steps:
1. Verify NEXT_PUBLIC_API_URL in .env.local
2. Check backend server is running
3. Test API endpoints directly
4. Check browser console for CORS errors

// Debug API client:
console.log('API_BASE:', process.env.NEXT_PUBLIC_API_URL);
console.log('Auth token:', getAuthToken());
```

##### LocalStorage Issues
```javascript
// Error: Cannot read property of undefined
// Solution: Check localStorage availability

// Safe localStorage access:
const getStorageItem = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('localStorage error:', error);
    return null;
  }
};
```

##### Authentication State Issues
```javascript
// Error: User state not persisting
// Solution: Check AuthContext and token storage

// Debugging AuthContext:
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Auth state changed:', { user, loading });
    const token = getAuthToken();
    console.log('Token exists:', !!token);
    if (token) {
      // Verify token validity
      verifyToken(token);
    }
    setLoading(false);
  }, [user]);
};
```

### Performance Issues

#### Database Performance
```javascript
// Slow queries
// Solution: Add appropriate indexes

// Query performance analysis:
db.chatmessages.find({ userId: ObjectId("...") }).explain("executionStats");

// Add indexes:
db.chatmessages.createIndex({ userId: 1, createdAt: -1 });
db.chatsessions.createIndex({ userId: 1, lastMessageAt: -1 });
```

#### Frontend Performance
```javascript
// Slow rendering with many messages
// Solution: Implement virtualization

import { FixedSizeList as List } from 'react-window';

const ChatMessageList = ({ messages }) => {
  return (
    <List
      height={600}
      itemCount={messages.length}
      itemSize={60}
      itemData={messages}
    >
      {({ index, style, data }) => (
        <div style={style}>
          <ChatMessage message={data[index]} />
        </div>
      )}
    </List>
  );
};
```

### Debugging Tools

#### Backend Debugging
```bash
# Enable debug logging
DEBUG=aipasta:* npm run dev

# MongoDB debugging
DEBUG=mongoose:* npm run dev

# HTTP request debugging
DEBUG=express:* npm run dev
```

#### Frontend Debugging
```javascript
// React DevTools
// Install browser extension

// Network debugging
// Check Network tab in browser DevTools

// State debugging
useEffect(() => {
  console.log('Component state:', { 
    messages, 
    isLoading, 
    error,
    user: user?.id 
  });
}, [messages, isLoading, error, user]);
```

### Error Monitoring

#### Production Error Tracking
```javascript
// Sentry integration (backend)
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// Error handling middleware
app.use((error, req, res, next) => {
  Sentry.captureException(error);
  res.status(error.statusCode || 500).json({
    status: 'error',
    message: error.message
  });
});

// Frontend error tracking
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
});

// React error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    Sentry.captureException(error);
  }
}
```

---

## Summary

This comprehensive developer guide covers the complete AI Pasta project architecture, from token management systems to deployment strategies. The platform has evolved into a robust, user-friendly AI playground with intelligent error handling and extensive model support.

### Key Architectural Decisions

1. **Authenticated-Only System**: All users must register and log in to access features
2. **Token-Based System**: Generous 5,000 free tokens per user with smart usage tracking
3. **Comprehensive Error Handling**: User-friendly error messages with actionable guidance
4. **Smart Model Management**: 327+ OpenRouter models with free model prioritization
5. **Performance Optimized**: 15-minute caching, efficient API usage, minimal redundant calls
6. **Provider Abstraction**: Easy to add new AI providers with unified interface
7. **Microservice Architecture**: Separated frontend/backend for scalability
8. **Security First**: JWT authentication required for all chat and model access

### Recent Improvements

1. **Token System Upgrade**: All users upgraded from 500 to 5,000 tokens
2. **Enhanced Error Handling**: Comprehensive error messages with emoji indicators and actionable tips
3. **OpenRouter Integration**: Complete catalog of 327+ models with smart caching and sorting
4. **Smart Defaults**: Free models prioritized as defaults to improve user accessibility
5. **Performance Optimization**: Efficient API usage, model caching, and reduced redundant calls
6. **User Experience**: Real-time token balance updates and graceful error degradation

### Next Steps for Development

1. **Real-time Features**: WebSocket support for live chat notifications
2. **Enhanced Analytics**: Better usage tracking and model performance metrics
3. **Mobile App**: React Native version for mobile devices
4. **Advanced Model Features**: Image generation, code execution, and multi-modal support
5. **Team Collaboration**: Multi-user session support and sharing
6. **Subscription Tiers**: Premium plans with higher token limits and priority access

This guide serves as the complete reference for developers working on AI Pasta, providing both high-level architecture understanding and practical implementation details for the comprehensive token-based system with intelligent error handling and model management.