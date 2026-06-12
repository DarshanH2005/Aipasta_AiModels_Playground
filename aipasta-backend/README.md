# AI Pasta Backend

This is the Express.js backend for AI Pasta, serving as the core API for authentication, chat sessions, AI model integration, and payment processing.

## ?? Tech Stack

- **Framework**: Express.js (Node.js)
- **Database**: MongoDB (via Mongoose)
- **Authentication**: Custom JWT with Google OAuth integration
- **Payments**: Razorpay Gateway
- **AI Providers**: OpenRouter & HuggingFace integrations

## ?? Features

- **Robust Authentication**: JWT-based auth, Google Sign-In, password resets.
- **AI Model Router**: Centralized API to communicate with various AI providers (OpenRouter/HuggingFace) with fallback logic.
- **Token System**: Token-based usage accounting instead of rate-limits, supporting free tiers and paid top-ups.
- **Payment Processing**: Full Razorpay integration with secure webhook handling for subscriptions and token top-ups.
- **Chat Management**: Stores chat histories, sessions, and messages securely in MongoDB.
- **Security**: Helmet, CORS, Express Rate Limit, and strict input validation.

## ??? Setup Instructions

1. **Install dependencies**:
   `ash
   npm install
   `

2. **Environment Variables**:
   Copy the example config and fill in your keys:
   `ash
   cp .env.example .env
   `
   **Required Keys**:
   - \MONGODB_URI\
   - \JWT_SECRET\
   - \OPENROUTER_API_KEY\
   - \RAZORPAY_KEY_ID\ & \RAZORPAY_KEY_SECRET\

3. **Start the server**:
   `ash
   npm run dev
   `

## ?? API Documentation
For detailed API documentation, please see the docs/ folder.
- [Chat Thread API](./docs/CHAT_THREAD_API.md)
- [Security Guide](./SECURITY_GUIDE.md)
