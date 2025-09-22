#!/usr/bin/env node
/**
 * Fix User Tokens Script
 * This script fixes the token structure for users who have tokens.balance 
 * but missing freeTokens/paidTokens distribution
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');

async function fixUserTokens() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the specific user
    const user = await User.findById('68d0561032faca173a2ded1b');
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('🔍 Current user state:', {
      email: user.email,
      credits: user.credits,
      tokens: {
        balance: user.tokens?.balance,
        freeTokens: user.tokens?.freeTokens,
        paidTokens: user.tokens?.paidTokens
      }
    });

    // Reset the user's tokens to 50,000 and structure them properly
    console.log('🔧 Resetting user tokens to 50,000 and structuring properly...');
    
    user.tokens = user.tokens || {};
    user.tokens.freeTokens = 50000; // Set 50k free tokens
    user.tokens.paidTokens = 0; // Keep paid tokens at 0
    user.tokens.balance = user.tokens.freeTokens + user.tokens.paidTokens; // Calculate balance
    user.tokens.totalUsed = 0; // Reset usage counter
    
    // Update legacy credits field for compatibility
    user.credits = user.tokens.balance;
    
    await user.save();
    console.log('✅ User tokens fixed and reset to 50,000!');
    
    console.log('🎉 New user state:', {
      email: user.email,
      credits: user.credits,
      tokens: {
        balance: user.tokens.balance,
        freeTokens: user.tokens.freeTokens,
        paidTokens: user.tokens.paidTokens,
        totalUsed: user.tokens.totalUsed
      }
    });

  } catch (error) {
    console.error('❌ Error fixing user tokens:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
fixUserTokens();