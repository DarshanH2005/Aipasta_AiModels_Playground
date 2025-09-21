// API endpoint for managing chat history
import { getChatHistory, saveChatMessage, getUserChatSessions } from '../../lib/mongodb';
import { rateLimiter } from '../../lib/api-providers';

export default async function handler(req, res) {
  // Rate limiting
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  if (!rateLimiter.isAllowed(clientIp)) {
    return res.status(429).json({ 
      error: 'Too many requests', 
      retryAfter: 60 
    });
  }

  const { method } = req;
  const { userId, sessionId } = req.query;

  try {
    switch (method) {
      case 'GET':
        return await handleGetHistory(req, res, userId, sessionId);
      case 'POST':
        return await handleSaveMessage(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Chat history API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function handleGetHistory(req, res, userId, sessionId) {
  const { limit = 50, sessions = false } = req.query;

  if (sessions === 'true' && userId) {
    // Get user's chat sessions
    const sessions = await getUserChatSessions(userId, parseInt(limit));
    return res.status(200).json({
      success: true,
      sessions
    });
  } else if (sessionId) {
    // Get messages for specific session
    const messages = await getChatHistory(userId, sessionId, parseInt(limit));
    return res.status(200).json({
      success: true,
      messages,
      sessionId
    });
  } else {
    return res.status(400).json({
      error: 'Either sessionId or sessions=true with userId is required'
    });
  }
}

async function handleSaveMessage(req, res) {
  const { userId, sessionId, message } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({
      error: 'sessionId and message are required'
    });
  }

  // Validate message structure
  if (!message.content || typeof message.isUser !== 'boolean') {
    return res.status(400).json({
      error: 'Message must have content and isUser fields'
    });
  }

  try {
    const messageId = await saveChatMessage(userId, sessionId, message);
    
    res.status(201).json({
      success: true,
      messageId,
      message: 'Message saved successfully'
    });
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({
      error: 'Failed to save message',
      details: error.message
    });
  }
}