
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ChatSession = require('../src/models/ChatSession');
const ChatMessage = require('../src/models/ChatMessage');
const User = require('../src/models/User');

async function analyzeChats() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    console.log('\n--- Analyzing Last 10 Chat Sessions ---\n');

    const sessions = await ChatSession.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'name email');

    if (sessions.length === 0) {
      console.log('No chat sessions found.');
      return;
    }

    for (const session of sessions) {
      const messages = await ChatMessage.find({ sessionId: session.sessionId }).sort({ createdAt: 1 });
      
      console.log(`Session ID: ${session.sessionId}`);
      console.log(`Created At: ${session.createdAt}`);
      console.log(`User: ${session.userId ? session.userId.email : 'Unknown'}`);
      console.log(`Title: ${session.title || 'Untitled'}`);
      console.log(`Message Count (DB): ${messages.length} (Session says: ${session.messageCount})`);
      console.log(`Total Tokens: ${session.totalTokens}`);
      console.log(`Models Used: ${session.models.map(m => m.name).join(', ')}`);

      // Analyze flow
      let flowStatus = 'OK';
      let lastRole = null;

      if (messages.length === 0) {
        flowStatus = 'EMPTY';
      } else {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.role === 'user') {
          flowStatus = 'INCOMPLETE (Last message turned from User, no response)';
        }
      }

      console.log(`Flow Status: ${flowStatus}`);

      // Check for missing model data or tokens
      let missingModelData = 0;
      let zeroTokenUsage = 0;

      messages.forEach(msg => {
        if (msg.role === 'assistant') {
          if (!msg.model || !msg.model.id) missingModelData++;
          if (!msg.usage || msg.usage.totalTokens === 0) zeroTokenUsage++;
        }
      });

      if (missingModelData > 0) console.log(`⚠️  Warning: ${missingModelData} assistant messages missing Model data.`);
      if (zeroTokenUsage > 0) console.log(`⚠️  Warning: ${zeroTokenUsage} assistant messages have 0 total tokens.`);

      console.log('---------------------------------------------------\n');
    }

  } catch (error) {
    console.error('Error analyzing chats:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Done.');
  }
}

analyzeChats();
