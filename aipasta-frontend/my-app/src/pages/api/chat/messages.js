// API endpoint for managing chat messages with proper conversation flow
import { getDatabase } from '../../../lib/mongodb';
import { buildApiUrl } from '../../../lib/api-client';

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await handleGetMessages(req, res);
      case 'POST':
        return await handleSendMessage(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Chat messages API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function handleGetMessages(req, res) {
  const { sessionId, limit = 50 } = req.query;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }
  
  try {
    const db = await getDatabase();
    const chatHistory = db.collection('chat_history');
    
    const messages = await chatHistory
      .find({ sessionId })
      .sort({ createdAt: 1, sequence: 1 }) // Chronological order with sequence
      .limit(parseInt(limit))
      .toArray();
    
    // Group messages by conversation turns for proper display
    const conversationTurns = [];
    let currentTurn = null;
    
    for (const message of messages) {
      if (message.role === 'user') {
        // Start new conversation turn
        currentTurn = {
          id: `turn_${message._id}`,
          userMessage: {
            id: message._id.toString(),
            content: message.content,
            attachments: message.attachments || [],
            timestamp: message.createdAt,
            sequence: message.sequence || 0
          },
          modelResponses: [],
          timestamp: message.createdAt
        };
        conversationTurns.push(currentTurn);
      } else if (message.role === 'assistant' && currentTurn) {
        // Add model response to current turn
        currentTurn.modelResponses.push({
          id: message._id.toString(),
          content: message.content,
          model: message.model,
          timestamp: message.createdAt,
          sequence: message.sequence || 0,
          usage: message.usage,
          cost: message.cost,
          isComplete: message.isComplete !== false,
          error: message.error
        });
      }
    }
    
    res.status(200).json({
      success: true,
      sessionId,
      conversationTurns,
      totalMessages: messages.length
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
}

async function handleSendMessage(req, res) {
  const { sessionId, userId, content, models = [], attachments = [] } = req.body;
  
  if (!sessionId || !content || !models.length) {
    return res.status(400).json({ 
      error: 'sessionId, content, and models are required' 
    });
  }
  
  try {
    const db = await getDatabase();
    const chatHistory = db.collection('chat_history');
    
    // Get next sequence number for this session
    const lastMessage = await chatHistory
      .findOne({ sessionId }, { sort: { sequence: -1 } });
    const nextSequence = (lastMessage?.sequence || 0) + 1;
    
    // Save user message
    const userMessage = {
      sessionId,
      userId: userId || null,
      role: 'user',
      content,
      attachments,
      sequence: nextSequence,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const userResult = await chatHistory.insertOne(userMessage);
    
    // Prepare response for immediate return (we'll update with AI responses via streaming)
    const response = {
      success: true,
      userMessage: {
        id: userResult.insertedId.toString(),
        content,
        attachments,
        timestamp: userMessage.createdAt,
        sequence: nextSequence
      },
      modelResponses: models.map((model, index) => ({
        id: `pending_${Date.now()}_${index}`,
        model,
        content: '',
        isComplete: false,
        isStreaming: true
      }))
    };
    
    res.status(201).json(response);
    
    // Process AI responses asynchronously (don't wait for client)
    processAIResponses(sessionId, userId, content, models, attachments, nextSequence + 1);
    
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
}

// Process AI responses asynchronously
async function processAIResponses(sessionId, userId, userContent, models, attachments, startSequence) {
  const db = await getDatabase();
  const chatHistory = db.collection('chat_history');
  
  // Build conversation history for context
  const previousMessages = await chatHistory
    .find({ sessionId })
    .sort({ sequence: 1 })
    .toArray();
  
  const conversationHistory = previousMessages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));
  
  // Process each model response
  const responses = await Promise.allSettled(
    models.map(async (model, index) => {
      try {
        const sequence = startSequence + index;
        
        // Create pending response record
        const pendingResponse = {
          sessionId,
          userId: userId || null,
          role: 'assistant',
          content: '',
          model: {
            id: model.id,
            name: model.name,
            provider: model.provider
          },
          sequence,
          isComplete: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const responseResult = await chatHistory.insertOne(pendingResponse);
        const responseId = responseResult.insertedId;
        
        // Make API call to get AI response
        const aiResponse = await callAIModel(model, conversationHistory, attachments);
        
        // Update with complete response
        await chatHistory.updateOne(
          { _id: responseId },
          {
            $set: {
              content: aiResponse.content,
              usage: aiResponse.usage,
              cost: aiResponse.cost,
              isComplete: true,
              updatedAt: new Date()
            }
          }
        );
        
        return { success: true, model: model.id, responseId };
      } catch (error) {
        console.error(`Error processing ${model.id}:`, error);
        
        // Save error response
        const errorResponse = {
          sessionId,
          userId: userId || null,
          role: 'assistant',
          content: '',
          model: {
            id: model.id,
            name: model.name,
            provider: model.provider
          },
          error: error.message,
          sequence: startSequence + index,
          isComplete: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await chatHistory.insertOne(errorResponse);
        return { success: false, model: model.id, error: error.message };
      }
    })
  );
  
  console.log(`Processed ${responses.length} model responses for session ${sessionId}`);
}

// Call AI model via existing API
async function callAIModel(model, messages, attachments) {
  // Local safe parser to avoid JSON.parse on HTML error pages
  async function safeParseResponse(response) {
    const text = await response.text();
    const isHtml = /<\/?html|<!doctype html|<\!DOCTYPE/i.test(text) || response.headers.get('content-type')?.includes('text/html');
    if (isHtml) return { __nonJson: true, text };
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (err) {
      return { __nonJson: true, text };
    }
  }

  const apiUrl = buildApiUrl('/api/chat');
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model.id,
      messages,
      attachments,
      stream: false
    })
  });
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }
  
  const parsed = await safeParseResponse(response);
  if (parsed && parsed.__nonJson) {
    throw new Error(`Non-JSON response from API: ${parsed.text?.slice?.(0,200)}`);
  }
  return parsed;
}