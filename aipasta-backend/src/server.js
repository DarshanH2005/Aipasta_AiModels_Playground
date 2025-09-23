const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const modelsRoutes = require('./routes/models');
const chatRoutes = require('./routes/chat');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const planRoutes = require('./routes/plans');
const webhookRoutes = require('./routes/webhooks');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken, optionalAuth } = require('./middleware/auth');

// Create Express app
const app = express();

// Trust proxy for Render deployment
app.set('trust proxy', true);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      // Allow Google Identity scripts (accounts.google.com) which are used by GSI
      scriptSrc: ["'self'", 'https://accounts.google.com'],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com", "https://api-inference.huggingface.co"],
      // Allow Google Identity iframe resources
      frameSrc: ["'self'", 'https://accounts.google.com'],
      childSrc: ["'self'", 'https://accounts.google.com']
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, 'http://localhost:3000'] || ['http://localhost:3000']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip trust proxy validation in production (Render handles this)
  trustProxy: process.env.NODE_ENV === 'production',
  keyGenerator: (req) => {
    // Use X-Forwarded-For header in production, fallback to IP
    return process.env.NODE_ENV === 'production' 
      ? req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip
      : req.ip;
  }
});

app.use(limiter);

// More strict rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 10 : 100, // More lenient in development
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  // Skip trust proxy validation in production (Render handles this)
  trustProxy: process.env.NODE_ENV === 'production',
  keyGenerator: (req) => {
    // Use X-Forwarded-For header in production, fallback to IP
    return process.env.NODE_ENV === 'production' 
      ? req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip
      : req.ip;
  }
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Temporary IP check endpoint for MongoDB whitelist
app.get('/api/check-ip', async (req, res) => {
  try {
    const fetch = require('node-fetch');
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    console.log('🌐 Render Server IP:', data.ip);
    res.json({
      message: 'Add this IP to MongoDB Atlas whitelist',
      serverIP: data.ip,
      instructions: 'Go to MongoDB Atlas → Security → Network Access → Add IP Address'
    });
  } catch (error) {
    console.error('❌ Error getting IP:', error);
    res.json({
      message: 'Could not fetch IP',
      error: error.message,
      fallback: 'Use 0.0.0.0/0 to allow all IPs temporarily'
    });
  }
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/models', optionalAuth, modelsRoutes);
app.use('/api/chat', authenticateToken, chatRoutes);
app.use('/api/user', authenticateToken, userRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/plans', planRoutes); // Plans route (some endpoints require auth, handled in route)
app.use('/api/webhooks', webhookRoutes); // Webhook routes for payment providers

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'AI Pasta Backend',
    version: '1.0.0',
    description: 'Backend API for AI Pasta - Multi-provider AI model playground',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      models: '/api/models',
      chat: '/api/chat',
      user: '/api/user',
      admin: '/api/admin'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    availableEndpoints: ['/health', '/api/auth', '/api/models', '/api/chat', '/api/user', '/api/admin']
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Database connection
const connectDB = async () => {
  try {
    const mongoOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    };

    // Optional: enable insecure TLS for debugging only. Set MONGODB_TLS_INSECURE=true
    // to allow connecting when there's TLS interception or invalid certs. Do NOT
    // enable in production.
    if (process.env.MONGODB_TLS_INSECURE === 'true') {
      mongoOptions.tls = true;
      mongoOptions.tlsAllowInvalidCertificates = true;
      mongoOptions.tlsAllowInvalidHostnames = true;
      console.warn('⚠️  MONGODB_TLS_INSECURE enabled - accepting invalid TLS certificates (development only)');
    }

    await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
    
    console.log('✅ MongoDB connected successfully');
    
    // Log database info
    const dbName = mongoose.connection.db.databaseName;
    console.log(`📦 Connected to database: ${dbName}`);
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('\n🔄 Received shutdown signal, closing server gracefully...');
  
  try {
    await mongoose.connection.close();
    console.log('📦 MongoDB connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📡 API Base URL: http://localhost:${PORT}`);
      console.log('\n📋 Available endpoints:');
      console.log(`   GET  /health - Health check`);
      console.log(`   POST /api/auth/register - User registration`);
      console.log(`   POST /api/auth/login - User login`);
      console.log(`   GET  /api/models - List available models`);
      console.log(`   POST /api/chat - Send chat message`);
      console.log(`   GET  /api/user/profile - Get user profile`);
      console.log(`   GET  /api/admin/stats - Admin statistics`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Only start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;