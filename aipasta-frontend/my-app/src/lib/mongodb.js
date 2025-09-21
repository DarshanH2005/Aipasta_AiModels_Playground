// MongoDB connection and database utilities
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

let client;
let clientPromise;

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (hot module replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

// Database utilities
export async function getDatabase() {
  const client = await clientPromise;
  return client.db('aipasta');
}

// Collections
export async function getModelsCollection() {
  const db = await getDatabase();
  return db.collection('models');
}

export async function getChatHistoryCollection() {
  const db = await getDatabase();
  return db.collection('chat_history');
}

export async function getUsersCollection() {
  const db = await getDatabase();
  return db.collection('users');
}

// Model caching utilities
export async function cacheModels(models) {
  try {
    const collection = await getModelsCollection();
    
    // Clear existing cache
    await collection.deleteMany({});
    
    // Insert new models with timestamp
    const modelsWithTimestamp = {
      models: models,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    };
    
    await collection.insertOne(modelsWithTimestamp);
    return true;
  } catch (error) {
    console.error('Error caching models:', error);
    return false;
  }
}

export async function getCachedModels() {
  try {
    const collection = await getModelsCollection();
    const cached = await collection.findOne(
      { expiresAt: { $gt: new Date() } },
      { sort: { cachedAt: -1 } }
    );
    
    return cached ? cached.models : null;
  } catch (error) {
    console.error('Error getting cached models:', error);
    return null;
  }
}

// Chat history utilities
export async function saveChatMessage(userId, sessionId, message) {
  try {
    const collection = await getChatHistoryCollection();
    
    const chatMessage = {
      userId: userId || null,
      sessionId,
      ...message,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await collection.insertOne(chatMessage);
    return result.insertedId;
  } catch (error) {
    console.error('Error saving chat message:', error);
    throw error;
  }
}

export async function getChatHistory(userId, sessionId, limit = 50) {
  try {
    const collection = await getChatHistoryCollection();
    
    const query = { sessionId };
    if (userId) {
      query.userId = userId;
    }
    
    const messages = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    
    return messages.reverse(); // Return in chronological order
  } catch (error) {
    console.error('Error getting chat history:', error);
    return [];
  }
}

export async function getUserChatSessions(userId, limit = 20) {
  try {
    const collection = await getChatHistoryCollection();
    
    const sessions = await collection.aggregate([
      { $match: { userId } },
      { 
        $group: {
          _id: '$sessionId',
          lastMessage: { $last: '$$ROOT' },
          messageCount: { $sum: 1 },
          lastActivity: { $max: '$createdAt' }
        }
      },
      { $sort: { lastActivity: -1 } },
      { $limit: limit }
    ]).toArray();
    
    return sessions.map(session => ({
      sessionId: session._id,
      preview: session.lastMessage.isUser 
        ? session.lastMessage.content.substring(0, 100)
        : 'AI Response',
      messageCount: session.messageCount,
      lastActivity: session.lastActivity
    }));
  } catch (error) {
    console.error('Error getting user chat sessions:', error);
    return [];
  }
}

// Initialize database indexes
export async function initializeDatabase() {
  try {
    const db = await getDatabase();
    
    // Models collection indexes
    const modelsCollection = db.collection('models');
    await modelsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    
    // Chat history collection indexes
    const chatCollection = db.collection('chat_history');
    await chatCollection.createIndex({ userId: 1, sessionId: 1 });
    await chatCollection.createIndex({ sessionId: 1, createdAt: 1 });
    await chatCollection.createIndex({ createdAt: 1 });
    
    // Users collection indexes
    const usersCollection = db.collection('users');
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ createdAt: 1 });
    
    console.log('Database indexes initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}