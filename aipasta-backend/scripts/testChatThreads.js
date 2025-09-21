// Test script for Chat Thread functionality
// Run this with: node scripts/testChatThreads.js

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../src/models/User');
const ChatSession = require('../src/models/ChatSession');
const ChatMessage = require('../src/models/ChatMessage');
const AIModel = require('../src/models/AIModel');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    console.log('✅ MongoDB connected for testing');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test functions
const testChatThreadCreation = async () => {
  console.log('\n🧪 Testing Chat Thread Creation...');
  
  try {
    // Create a test user if doesn't exist
    let testUser = await User.findOne({ email: 'test@aipasta.com' });
    if (!testUser) {
      testUser = await User.create({
        name: 'Test User',
        email: 'test@aipasta.com',
        password: 'hashedpassword123',
        role: 'user'
      });
      console.log('👤 Created test user:', testUser.email);
    }

    // Create a test model if doesn't exist
    let testModel = await AIModel.findOne({ modelId: 'test-model' });
    if (!testModel) {
      testModel = await AIModel.create({
        modelId: 'test-model',
        name: 'Test Model',
        provider: 'OpenRouter',
        description: 'A test model for development',
        pricing: { input: 0.001, output: 0.002 },
        isAvailable: true,
        capabilities: ['text'],
        contextLength: 4096,
        metadata: {
          popularity: { usage: 0, rating: 4.5 }
        }
      });
      console.log('🤖 Created test model:', testModel.name);
    }

    // Test 1: Create a new chat thread without model
    console.log('\n📝 Test 1: Creating chat thread without model...');
    const sessionId1 = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session1 = await ChatSession.create({
      sessionId: sessionId1,
      userId: testUser._id,
      title: 'Test Chat Thread 1',
      isActive: true,
      messageCount: 0,
      totalTokens: 0,
      totalCost: 0,
      models: [],
      metadata: {
        userAgent: 'Test Script',
        ipAddress: '127.0.0.1'
      },
      lastMessageAt: new Date()
    });
    
    console.log('✅ Created chat thread 1:', {
      sessionId: session1.sessionId,
      title: session1.title,
      _id: session1._id
    });

    // Test 2: Create a chat thread with model
    console.log('\n📝 Test 2: Creating chat thread with model...');
    const sessionId2 = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session2 = await ChatSession.create({
      sessionId: sessionId2,
      userId: testUser._id,
      title: 'Test Chat Thread 2 with Model',
      isActive: true,
      messageCount: 0,
      totalTokens: 0,
      totalCost: 0,
      models: [{
        id: testModel.modelId,
        name: testModel.name,
        provider: testModel.provider,
        usageCount: 0
      }],
      metadata: {
        userAgent: 'Test Script',
        ipAddress: '127.0.0.1'
      },
      lastMessageAt: new Date()
    });
    
    console.log('✅ Created chat thread 2:', {
      sessionId: session2.sessionId,
      title: session2.title,
      models: session2.models
    });

    // Test 3: Add messages to the chat thread
    console.log('\n💬 Test 3: Adding messages to chat thread...');
    
    // User message
    const userMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userMessage = await ChatMessage.create({
      sessionId: session2._id,
      userId: testUser._id,
      messageId: userMessageId,
      role: 'user',
      content: 'Hello! This is a test message.',
      model: {
        id: testModel.modelId,
        name: testModel.name,
        provider: testModel.provider
      },
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0
      },
      cost: {
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
        currency: 'USD'
      },
      status: 'completed',
      metadata: {
        userAgent: 'Test Script',
        ipAddress: '127.0.0.1'
      }
    });

    console.log('✅ Created user message:', {
      messageId: userMessage.messageId,
      role: userMessage.role,
      content: userMessage.content.substring(0, 50) + '...'
    });

    // AI response message
    const aiMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const aiMessage = await ChatMessage.create({
      sessionId: session2._id,
      userId: testUser._id,
      messageId: aiMessageId,
      role: 'assistant',
      content: 'Hello! Thank you for your test message. This is a simulated AI response.',
      model: {
        id: testModel.modelId,
        name: testModel.name,
        provider: testModel.provider
      },
      usage: {
        inputTokens: 10,
        outputTokens: 15,
        totalTokens: 25
      },
      cost: {
        inputCost: 0.01,
        outputCost: 0.03,
        totalCost: 0.04,
        currency: 'USD'
      },
      responseTime: 1250,
      status: 'completed',
      metadata: {
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        userAgent: 'Test Script',
        ipAddress: '127.0.0.1'
      }
    });

    console.log('✅ Created AI message:', {
      messageId: aiMessage.messageId,
      role: aiMessage.role,
      content: aiMessage.content.substring(0, 50) + '...',
      usage: aiMessage.usage,
      cost: aiMessage.cost
    });

    // Test 4: Update session stats
    console.log('\n📊 Test 4: Updating session stats...');
    session2.messageCount = 2;
    session2.totalTokens = 25;
    session2.totalCost = 0.04;
    session2.lastMessageAt = new Date();
    await session2.save();

    console.log('✅ Updated session stats:', {
      messageCount: session2.messageCount,
      totalTokens: session2.totalTokens,
      totalCost: session2.totalCost
    });

    // Test 5: Retrieve chat thread with messages
    console.log('\n🔍 Test 5: Retrieving chat thread with messages...');
    const retrievedSession = await ChatSession.findOne({ _id: session2._id });
    const messages = await ChatMessage.find({ sessionId: session2._id }).sort({ createdAt: 1 });

    console.log('✅ Retrieved session:', {
      sessionId: retrievedSession.sessionId,
      title: retrievedSession.title,
      messageCount: retrievedSession.messageCount,
      totalMessages: messages.length
    });

    console.log('✅ Messages in thread:');
    messages.forEach((msg, index) => {
      console.log(`   ${index + 1}. [${msg.role}] ${msg.content.substring(0, 80)}${msg.content.length > 80 ? '...' : ''}`);
    });

    return {
      success: true,
      createdSessions: [session1._id, session2._id],
      createdMessages: [userMessage._id, aiMessage._id]
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
};

// Cleanup function
const cleanup = async (testResults) => {
  if (testResults.success) {
    console.log('\n🧹 Cleaning up test data...');
    
    // Delete test messages
    await ChatMessage.deleteMany({ _id: { $in: testResults.createdMessages } });
    console.log('🗑️ Deleted test messages');
    
    // Delete test sessions
    await ChatSession.deleteMany({ _id: { $in: testResults.createdSessions } });
    console.log('🗑️ Deleted test sessions');
    
    // Note: We keep the test user and model for potential future tests
    console.log('✅ Cleanup completed (kept test user and model for future tests)');
  }
};

// Main test function
const runTests = async () => {
  console.log('🚀 Starting Chat Thread Functionality Tests...');
  console.log('='.repeat(60));
  
  await connectDB();
  
  const testResults = await testChatThreadCreation();
  
  if (testResults.success) {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 All tests passed successfully!');
    
    // Ask if user wants to keep test data
    console.log('\n📝 Test data created:');
    console.log('   - Chat sessions with proper IDs');
    console.log('   - Messages with proper structure');
    console.log('   - Usage and cost tracking');
    console.log('   - Proper model relationships');
  } else {
    console.log('\n' + '='.repeat(60));
    console.log('❌ Tests failed:', testResults.error);
  }
  
  // Uncomment the line below to auto-cleanup test data
  // await cleanup(testResults);
  
  await mongoose.connection.close();
  console.log('\n📦 Database connection closed');
  process.exit(testResults.success ? 0 : 1);
};

// Run tests
runTests().catch(error => {
  console.error('💥 Test execution failed:', error);
  process.exit(1);
});