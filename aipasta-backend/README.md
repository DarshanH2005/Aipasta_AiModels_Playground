# AI Pasta Backend

A powerful Express.js backend for the AI Pasta multi-provider AI model playground. This backend provides authentication, chat management, model integration, and admin functionality with MongoDB Atlas integration.

## 🚀 Features

- **Multi-Provider AI Integration**: OpenRouter (premium models) and Hugging Face (free models)
- **User Authentication**: JWT-based auth with password hashing and session management
- **Chat Management**: Full conversation history, session management, and usage tracking
- **Model Management**: Dynamic model fetching, categorization, and statistics
- **Usage Tracking**: Token counting, cost calculation (USD/INR), and usage limits
- **Admin Dashboard**: User management, system stats, and model administration
- **API Key Management**: Generate and manage API keys for programmatic access
- **Rate Limiting**: Per-user and global rate limiting with customizable limits
- **Security**: Helmet, CORS, input validation, and comprehensive error handling

## 🛠 Tech Stack

- **Framework**: Express.js with TypeScript support
- **Database**: MongoDB Atlas with Mongoose ODM
- **Authentication**: JWT tokens with bcrypt password hashing
- **AI Providers**: OpenRouter API, Hugging Face Inference API
- **Security**: Helmet, CORS, express-rate-limit, input validation
- **Documentation**: Comprehensive API documentation and error handling

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account or local MongoDB instance
- OpenRouter API key (for premium models)
- Hugging Face API key (for free models)

### Setup Instructions

1. **Clone and navigate to backend directory:**
```bash
git clone <repository-url>
cd aipasta/aipasta-backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Environment Configuration:**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/aipasta?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRES_IN=7

# AI Provider API Keys
OPENROUTER_API_KEY=your-openrouter-api-key
HUGGINGFACE_API_KEY=your-huggingface-api-key

# CORS Configuration (comma-separated URLs)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

4. **Start the server:**

Development mode with auto-reload:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## 🗂 Project Structure

```
aipasta-backend/
├── src/
│   ├── models/           # MongoDB schemas
│   │   ├── User.js           # User model with auth & preferences
│   │   ├── ChatSession.js    # Chat session management
│   │   ├── ChatMessage.js    # Individual chat messages
│   │   └── AIModel.js        # AI model metadata
│   ├── routes/           # API route handlers
│   │   ├── auth.js           # Authentication routes
│   │   ├── models.js         # Model listing and info
│   │   ├── chat.js           # Chat and messaging
│   │   ├── user.js           # User profile and preferences
│   │   └── admin.js          # Admin dashboard and management
│   ├── services/         # AI provider integrations
│   │   ├── openRouterService.js  # OpenRouter API client
│   │   └── huggingFaceService.js # Hugging Face API client
│   ├── middleware/       # Express middleware
│   │   ├── auth.js           # JWT authentication
│   │   ├── errorHandler.js   # Global error handling
│   │   └── validation.js     # Input validation rules
│   └── server.js         # Express server setup
├── .env.example          # Environment template
├── .gitignore           # Git ignore rules
├── package.json         # Dependencies and scripts
└── README.md           # This documentation
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info
- `PATCH /api/auth/password` - Update password
- `POST /api/auth/forgot-password` - Request password reset
- `PATCH /api/auth/reset-password/:token` - Reset password
- `GET /api/auth/verify` - Verify JWT token
- `POST /api/auth/refresh` - Refresh JWT token

### Models
- `GET /api/models` - List all available models (with filtering)
- `GET /api/models/:modelId` - Get specific model details
- `GET /api/models/category/:category` - Get models by category
- `GET /api/models/providers` - List AI providers with stats
- `GET /api/models/categories` - List categories with stats
- `POST /api/models/sync` - Sync models from providers (Admin)

### Chat
- `POST /api/chat` - Send chat message
- `GET /api/chat/sessions` - List user's chat sessions
- `GET /api/chat/sessions/:sessionId` - Get session with messages
- `PATCH /api/chat/sessions/:sessionId` - Update session (title, settings)
- `DELETE /api/chat/sessions/:sessionId` - Delete chat session
- `DELETE /api/chat/messages/:messageId` - Delete specific message
- `GET /api/chat/stats` - Get chat usage statistics

### User Management
- `GET /api/user/profile` - Get user profile
- `PATCH /api/user/profile` - Update user profile
- `GET /api/user/stats` - Get detailed usage statistics
- `POST /api/user/favorites/:modelId` - Toggle favorite model
- `GET /api/user/favorites` - Get favorite models
- `POST /api/user/api-keys` - Generate API key
- `GET /api/user/api-keys` - List API keys
- `DELETE /api/user/api-keys/:keyId` - Revoke API key
- `GET /api/user/export` - Export user data
- `DELETE /api/user/account` - Delete user account

### Admin Dashboard
- `GET /api/admin/stats` - Admin dashboard statistics
- `GET /api/admin/users` - List all users (with filtering)
- `GET /api/admin/users/:userId` - Get user details
- `PATCH /api/admin/users/:userId` - Update user (role, limits)
- `DELETE /api/admin/users/:userId` - Delete user
- `GET /api/admin/system` - System health metrics
- `PATCH /api/admin/models/:modelId` - Update model settings

### System
- `GET /health` - Health check endpoint
- `GET /` - API information and available endpoints

## 🔧 Configuration

### User Roles & Permissions
- **User**: Basic access, free models only, limited requests
- **Premium**: Access to paid models, higher limits
- **Admin**: Full system access, user management, model administration

### Rate Limiting
- **Global**: 100 requests per 15 minutes (production)
- **Auth Routes**: 10 requests per 15 minutes
- **Chat Routes**: 50 requests per 15 minutes per user
- **User-specific**: Configurable daily/monthly limits

### Usage Limits (Default)
```javascript
// Default user limits
dailyRequests: 50,
monthlyRequests: 1000,
monthlyTokens: 100000

// Premium user limits
dailyRequests: 200,
monthlyRequests: 5000,
monthlyTokens: 500000
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Multiple layers of rate limiting
- **CORS Protection**: Configurable origin restrictions
- **Helmet Security**: HTTP security headers
- **API Key Management**: Secure API key generation and management
- **Error Handling**: Secure error responses without data leaks

## 🗄 Database Schema

### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: ['user', 'premium', 'admin'],
  isActive: Boolean,
  bio: String,
  preferences: {
    theme: ['light', 'dark', 'auto'],
    language: String,
    favoriteModels: [String],
    notifications: Object
  },
  usageLimits: {
    dailyRequests: Number,
    monthlyRequests: Number,
    monthlyTokens: Number
  },
  stats: {
    messagesGenerated: Number,
    tokensUsed: Number,
    totalCost: { usd: Number, inr: Number },
    lastActive: Date,
    loginCount: Number
  },
  apiKeys: [ApiKeySchema],
  createdAt: Date,
  updatedAt: Date
}
```

### ChatSession Model
```javascript
{
  userId: ObjectId,
  modelId: String,
  title: String,
  messageCount: Number,
  lastActivity: Date,
  totalTokensUsed: Number,
  totalCost: { usd: Number, inr: Number },
  settings: {
    temperature: Number,
    maxTokens: Number,
    topP: Number
  },
  metadata: Object,
  expiresAt: Date
}
```

### ChatMessage Model
```javascript
{
  sessionId: ObjectId,
  userId: ObjectId,
  modelId: String,
  role: ['user', 'assistant', 'system'],
  content: String,
  attachments: [AttachmentSchema],
  usage: {
    promptTokens: Number,
    completionTokens: Number,
    totalTokens: Number
  },
  cost: { usd: Number, inr: Number },
  metadata: Object
}
```

## 🚀 Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure MongoDB Atlas connection
3. Set secure JWT secrets
4. Configure CORS origins for production domains
5. Set appropriate rate limits for production load

### Docker Deployment (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
EXPOSE 5000
CMD ["npm", "start"]
```

### Vercel Deployment
1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy with automatic builds on push

## 🧪 Testing

Run tests (when implemented):
```bash
npm test
```

## 📊 Monitoring & Logging

- **Health Check**: `/health` endpoint for monitoring
- **Request Logging**: Morgan logger in development
- **Error Tracking**: Comprehensive error logging
- **Usage Metrics**: Built-in usage tracking and statistics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request with clear description

## 📄 License

This project is licensed under the MIT License.

## 🔗 Related Projects

- [AI Pasta Frontend](../aipasta-frontend/) - Next.js frontend application
- [Project Documentation](../docs/) - Complete API documentation

---

For support or questions, please refer to the main project documentation or create an issue in the repository.