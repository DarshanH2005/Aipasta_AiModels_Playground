require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const bcrypt = require('bcryptjs');

async function checkAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for admin check');

    // Find the admin user
    const adminUser = await User.findOne({ email: 'demo1@gmail.com' });
    
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      return;
    }

    console.log('✅ Admin user found:');
    console.log('Email:', adminUser.email);
    console.log('Name:', adminUser.name);
    console.log('Role:', adminUser.role);
    console.log('Password hash:', adminUser.password);
    console.log('Auth Provider:', adminUser.authProvider);
    console.log('Is Active:', adminUser.isActive);

    // Test password comparison
    const testPassword = 'demo@123';
    const isPasswordCorrect = await bcrypt.compare(testPassword, adminUser.password);
    console.log('Password test (demo@123):', isPasswordCorrect ? '✅ Correct' : '❌ Incorrect');

    // Test various password formats
    const testPasswords = ['demo@123', 'demo123', 'demo', 'admin'];
    console.log('\n🔍 Testing different password formats:');
    for (const pwd of testPasswords) {
      const isCorrect = await bcrypt.compare(pwd, adminUser.password);
      console.log(`  "${pwd}": ${isCorrect ? '✅' : '❌'}`);
    }

  } catch (error) {
    console.error('❌ Error checking admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

checkAdminUser();