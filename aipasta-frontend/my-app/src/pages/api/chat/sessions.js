// API endpoint for managing chat sessions
import { getDatabase } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await handleGetSessions(req, res);
      case 'POST':
        return await handleCreateSession(req, res);
      case 'PUT':
        return await handleUpdateSession(req, res);
      case 'DELETE':
        return await handleDeleteSession(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Chat sessions API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function handleGetSessions(req, res) {
  const { userId, limit = 20 } = req.query;
  
  try {
    const db = await getDatabase();
    const chatHistory = db.collection('chat_history');
    
    // Get all sessions for user (or anonymous sessions)
    const pipeline = [
      ...(userId ? [{ $match: { userId: userId || null } }] : [{ $match: { userId: null } }]),
      {
        $group: {
          _id: '$sessionId',
          title: { $first: '$sessionTitle' },
          firstMessage: { $first: '$content' },
          lastMessage: { $last: '$content' },
          lastActivity: { $max: '$createdAt' },
          messageCount: { $sum: 1 },
          models: { $addToSet: '$model' }
        }
      },
      { $sort: { lastActivity: -1 } },
      { $limit: parseInt(limit) }
    ];
    
    const sessions = await chatHistory.aggregate(pipeline).toArray();
    
    // Format sessions for frontend
    const formattedSessions = sessions.map(session => ({
      id: session._id,
      title: session.title || generateSessionTitle(session.firstMessage),
      preview: truncateText(session.lastMessage, 100),
      lastActivity: session.lastActivity,
      messageCount: session.messageCount,
      models: session.models.filter(Boolean)
    }));

    res.status(200).json({
      success: true,
      sessions: formattedSessions
    });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
}

async function handleCreateSession(req, res) {
  const { userId, title, models = [] } = req.body;
  
  try {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionTitle = title || `New Chat ${new Date().toLocaleDateString()}`;
    
    // Create session metadata (we'll store this with the first message)
    const sessionData = {
      sessionId,
      sessionTitle,
      userId: userId || null,
      models,
      createdAt: new Date()
    };

    res.status(201).json({
      success: true,
      session: {
        id: sessionId,
        title: sessionTitle,
        models,
        createdAt: sessionData.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating chat session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
}

async function handleUpdateSession(req, res) {
  const { sessionId, title } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }
  
  try {
    const db = await getDatabase();
    const chatHistory = db.collection('chat_history');
    
    // Update session title for all messages in this session
    const result = await chatHistory.updateMany(
      { sessionId },
      { 
        $set: { 
          sessionTitle: title,
          updatedAt: new Date()
        }
      }
    );
    
    res.status(200).json({
      success: true,
      updated: result.modifiedCount
    });
  } catch (error) {
    console.error('Error updating chat session:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
}

async function handleDeleteSession(req, res) {
  const { sessionId } = req.query;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }
  
  try {
    const db = await getDatabase();
    const chatHistory = db.collection('chat_history');
    
    // Delete all messages for this session
    const result = await chatHistory.deleteMany({ sessionId });
    
    res.status(200).json({
      success: true,
      deleted: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
}

// Utility functions
function generateSessionTitle(firstMessage) {
  if (!firstMessage) return 'New Chat';
  const words = firstMessage.split(' ').slice(0, 4);
  return words.join(' ') + (firstMessage.length > words.join(' ').length ? '...' : '');
}

function truncateText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}