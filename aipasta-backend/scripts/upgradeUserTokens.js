const mongoose = require('mongoose');
const User = require('../src/models/User');

// Load environment variables
require('dotenv').config();

async function upgradeUserTokens() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aipasta', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('📡 Connected to MongoDB');
    
    // Find all users with old token limits (500 or less)
    const usersToUpdate = await User.find({
      $or: [
        { 'tokens.balance': { $lte: 500 } },
        { 'tokens.freeTokens': { $lte: 500 } },
        { 'credits': { $lte: 500 } }
      ]
    });
    
    console.log(`🔍 Found ${usersToUpdate.length} users to upgrade`);
    
    let upgradeCount = 0;
    
    for (const user of usersToUpdate) {
      const oldBalance = user.tokens.balance;
      const oldFreeTokens = user.tokens.freeTokens;
      const oldCredits = user.credits;
      
      // Upgrade token balances to 5000
      user.tokens.balance = Math.max(user.tokens.balance, 5000);
      user.tokens.freeTokens = Math.max(user.tokens.freeTokens, 5000);
      user.credits = Math.max(user.credits, 5000);
      
      await user.save();
      upgradeCount++;
      
      console.log(`✅ Upgraded user ${user.email}:`);
      console.log(`   Balance: ${oldBalance} → ${user.tokens.balance}`);
      console.log(`   Free tokens: ${oldFreeTokens} → ${user.tokens.freeTokens}`);
      console.log(`   Credits: ${oldCredits} → ${user.credits}`);
    }
    
    console.log(`\n🎉 Successfully upgraded ${upgradeCount} users to 5,000 tokens!`);
    
  } catch (error) {
    console.error('❌ Error upgrading user tokens:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📡 Database connection closed');
  }
}

// Run the upgrade
upgradeUserTokens();