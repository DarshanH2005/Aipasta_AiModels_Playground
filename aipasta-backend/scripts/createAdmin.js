require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected for admin creation');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Create admin user
const createAdminUser = async () => {
  try {
    await connectDB();

    const adminEmail = 'demo1@gmail.com';
    const adminPassword = 'demo@123';

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('Admin user already exists. Updating password and role...');
      
      // Set plain password - let the pre-save middleware handle hashing
      existingAdmin.password = adminPassword;
      existingAdmin.role = 'admin';
      existingAdmin.isActive = true;
      existingAdmin.name = 'Admin User';
      existingAdmin.passwordChangedAt = new Date();
      
      await existingAdmin.save();
      console.log('✅ Admin user updated successfully!');
    } else {
      // Create new admin user - let the middleware handle password hashing
      const adminUser = new User({
        email: adminEmail,
        password: adminPassword,
        name: 'Admin User',
        role: 'admin',
        authProvider: 'local',
        isActive: true,
        // Give admin user some tokens to start with
        tokens: {
          balance: 1000000,
          totalEarned: 1000000,
          totalSpent: 0
        },
        preferences: {
          theme: 'dark',
          language: 'en'
        }
      });

      await adminUser.save();
      console.log('✅ Admin user created successfully!');
    }

    console.log('\n📋 Admin Credentials:');
    console.log('Email: demo1@gmail.com');
    console.log('Password: demo@123');
    console.log('Role: admin');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

// Run the script
createAdminUser();