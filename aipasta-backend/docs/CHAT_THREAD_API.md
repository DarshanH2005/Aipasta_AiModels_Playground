# Chat Thread API Documentation

## Overview
The Chat Thread API provides endpoints for creating, managing, and interacting with chat sessions (threads) and messages in the AI Pasta backend.

## Endpoints

### 1. Create New Chat Thread
**POST** `/api/chat/sessions`

Creates a new chat thread/session.

**Request Body:**
```json
{
  "title": "My Chat Thread",           // Optional: Thread title (max 200 chars)
  "modelId": "gpt-3.5-turbo"          // Optional: Initial model to use
}
```

**Response:** `201 Created`
```json
{
  "status": "success",
  "message": "Chat thread created successfully",
  "data": {
    "session": {
      "_id": "65f1234567890abcdef12345",
      "sessionId": "chat_1703123456789_abc123def",
      "title": "My Chat Thread",
      "isActive": true,
      "messageCount": 0,
      "totalTokens": 0,
      "totalCost": 0,
      "models": [
        {
          "id": "gpt-3.5-turbo",
          "name": "GPT-3.5 Turbo",
          "provider": "OpenRouter",
          "usageCount": 0
        }
      ],
      "lastMessageAt": "2023-12-21T10:30:00.000Z",
      "createdAt": "2023-12-21T10:30:00.000Z"
    }
  }
}
```

### 2. Send Chat Message
**POST** `/api/chat`

Sends a message to a chat thread and receives AI response.

**Request Body:**
```json
{
  "message": "Hello, how are you?",
  "modelId": "gpt-3.5-turbo",
  "sessionId": "65f1234567890abcdef12345",  // Required: Use session._id from create thread
  "options": {                              // Optional
    "temperature": 0.7,
    "max_tokens": 1000,
    "top_p": 0.9
  }
}
```

**Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "userMessage": {
      "_id": "65f1234567890abcdef12346",
      "messageId": "msg_1703123456890_def456ghi",
      "role": "user",
      "content": "Hello, how are you?",
      "sessionId": "65f1234567890abcdef12345",
      "createdAt": "2023-12-21T10:31:00.000Z"
    },
    "aiMessage": {
      "_id": "65f1234567890abcdef12347",
      "messageId": "msg_1703123456891_ghi789jkl",
      "role": "assistant",
      "content": "Hello! I'm doing well, thank you for asking. How can I help you today?",
      "sessionId": "65f1234567890abcdef12345",
      "usage": {
        "inputTokens": 15,
        "outputTokens": 25,
        "totalTokens": 40
      },
      "cost": {
        "inputCost": 0.015,
        "outputCost": 0.05,
        "totalCost": 0.065,
        "currency": "USD"
      },
      "responseTime": 1250,
      "status": "completed",
      "createdAt": "2023-12-21T10:31:01.250Z"
    },
    "session": {
      "messageCount": 2,
      "totalTokens": 40,
      "totalCost": 0.065
    }
  }
}
```

### 3. Get Chat Sessions
**GET** `/api/chat/sessions`

Retrieves user's chat sessions with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:** `200 OK`
```json
{
  "status": "success",
  "results": 2,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  },
  "data": {
    "sessions": [
      {
        "_id": "65f1234567890abcdef12345",
        "sessionId": "chat_1703123456789_abc123def",
        "title": "My Chat Thread",
        "isActive": true,
        "messageCount": 2,
        "totalTokens": 40,
        "totalCost": 0.065,
        "lastMessageAt": "2023-12-21T10:31:01.250Z",
        "createdAt": "2023-12-21T10:30:00.000Z"
      }
    ]
  }
}
```

### 4. Get Specific Chat Session
**GET** `/api/chat/sessions/{sessionId}`

Retrieves a specific chat session with its messages.

**Path Parameters:**
- `sessionId`: MongoDB ObjectId of the session

**Query Parameters:**
- `page` (optional): Page number for messages (default: 1)
- `limit` (optional): Messages per page (default: 50)

**Response:** `200 OK`
```json
{
  "status": "success",
  "data": {
    "session": {
      "_id": "65f1234567890abcdef12345",
      "sessionId": "chat_1703123456789_abc123def",
      "title": "My Chat Thread",
      "messageCount": 2,
      "totalTokens": 40,
      "totalCost": 0.065
    },
    "messages": [
      {
        "_id": "65f1234567890abcdef12346",
        "messageId": "msg_1703123456890_def456ghi",
        "role": "user",
        "content": "Hello, how are you?",
        "createdAt": "2023-12-21T10:31:00.000Z"
      },
      {
        "_id": "65f1234567890abcdef12347",
        "messageId": "msg_1703123456891_ghi789jkl",
        "role": "assistant",
        "content": "Hello! I'm doing well, thank you for asking. How can I help you today?",
        "usage": {
          "inputTokens": 15,
          "outputTokens": 25,
          "totalTokens": 40
        },
        "cost": {
          "totalCost": 0.065,
          "currency": "USD"
        },
        "createdAt": "2023-12-21T10:31:01.250Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 2,
      "totalPages": 1
    }
  }
}
```

## Authentication

All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer your-jwt-token-here
```

## Error Responses

All endpoints may return these error responses:

**400 Bad Request**
```json
{
  "status": "error",
  "message": "Validation failed: Title must be between 1 and 200 characters"
}
```

**401 Unauthorized**
```json
{
  "status": "error",
  "message": "Access denied. No token provided"
}
```

**404 Not Found**
```json
{
  "status": "error",
  "message": "Chat session not found"
}
```

**429 Too Many Requests**
```json
{
  "status": "error",
  "message": "Daily request limit exceeded"
}
```

**500 Internal Server Error**
```json
{
  "status": "error",
  "message": "Failed to generate AI response"
}
```

## Usage Examples

### JavaScript/Node.js Example
```javascript
const API_BASE = 'http://localhost:5000';
const token = 'your-jwt-token';

// Create new chat thread
const createThread = async () => {
  const response = await fetch(`${API_BASE}/api/chat/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      title: 'My AI Chat',
      modelId: 'gpt-3.5-turbo'
    })
  });
  
  const data = await response.json();
  return data.data.session;
};

// Send message to thread
const sendMessage = async (sessionId, message) => {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      message: message,
      modelId: 'gpt-3.5-turbo',
      sessionId: sessionId
    })
  });
  
  const data = await response.json();
  return data.data;
};

// Example usage
(async () => {
  const thread = await createThread();
  console.log('Created thread:', thread.sessionId);
  
  const chat = await sendMessage(thread._id, 'Hello AI!');
  console.log('AI Response:', chat.aiMessage.content);
})();
```

### cURL Examples
```bash
# Create new chat thread
curl -X POST http://localhost:5000/api/chat/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{"title": "Test Chat", "modelId": "gpt-3.5-turbo"}'

# Send message
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "message": "Hello, world!",
    "modelId": "gpt-3.5-turbo", 
    "sessionId": "65f1234567890abcdef12345"
  }'

# Get chat sessions
curl -X GET "http://localhost:5000/api/chat/sessions?page=1&limit=10" \
  -H "Authorization: Bearer your-jwt-token"
```

## Data Models

### ChatSession Schema
```javascript
{
  sessionId: String,         // Unique chat session identifier
  userId: ObjectId,          // Reference to User
  title: String,             // Chat thread title
  isActive: Boolean,         // Whether thread is active
  messageCount: Number,      // Total messages in thread
  totalTokens: Number,       // Total tokens used
  totalCost: Number,         // Total cost in USD
  models: [ModelUsage],      // Models used in this thread
  metadata: {
    userAgent: String,
    ipAddress: String,
    language: String
  },
  lastMessageAt: Date,       // Last message timestamp
  expiresAt: Date,          // Thread expiry (30 days)
  createdAt: Date,
  updatedAt: Date
}
```

### ChatMessage Schema
```javascript
{
  sessionId: String,         // Reference to ChatSession
  userId: ObjectId,          // Reference to User
  messageId: String,         // Unique message identifier
  role: String,              // 'user', 'assistant', or 'system'
  content: String,           // Message content
  model: {
    id: String,              // Model ID used
    name: String,            // Model name
    provider: String         // AI provider
  },
  usage: {
    inputTokens: Number,
    outputTokens: Number,
    totalTokens: Number
  },
  cost: {
    inputCost: Number,
    outputCost: Number,
    totalCost: Number,
    currency: String
  },
  responseTime: Number,      // Response time in ms
  status: String,            // 'pending', 'completed', 'failed'
  metadata: Object,          // Additional metadata
  createdAt: Date,
  updatedAt: Date
}
```