#!/usr/bin/env node

/**
 * Production Admin User Creation Script
 * Creates admin user in production environment
 * 
 * Usage: node scripts/prod-create-admin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

// Admin credentials - change these as needed
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'demo1@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'demo@123';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin User';

console.log('🚀 Starting production admin user creation...');
console.log('📧 Admin email:', ADMIN_EMAIL);
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
console.log('🔗 Database URI:', process.env.MONGODB_URI ? 'Connected' : 'Missing');

// Database connection
const connectDB = async () => {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    };
    
    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('✅ MongoDB connected successfully for admin creation');
    console.log('📦 Connected to database:', mongoose.connection.db.databaseName);
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
};

// Create or update admin user
const createAdminUser = async () => {
  try {
    await connectDB();

    console.log('🔍 Checking for existing admin user...');
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
    
    if (existingAdmin) {
      console.log('👤 Admin user found. Updating credentials and role...');
      console.log('🆔 User ID:', existingAdmin._id);
      console.log('📧 Current email:', existingAdmin.email);
      console.log('🎭 Current role:', existingAdmin.role);
      
      // Update existing admin user
      existingAdmin.password = ADMIN_PASSWORD; // Pre-save middleware will hash this
      existingAdmin.role = 'admin';
      existingAdmin.isActive = true;
      existingAdmin.name = ADMIN_NAME;
      existingAdmin.passwordChangedAt = new Date();
      
      // Ensure admin has sufficient tokens
      if (!existingAdmin.tokens || existingAdmin.tokens.balance < 1000) {
        existingAdmin.tokens = {
          balance: 10000,
          used: existingAdmin.tokens?.used || 0,
          lastUpdated: new Date()
        };
      }
      
      await existingAdmin.save();
      console.log('✅ Admin user updated successfully!');
      console.log('💰 Token balance:', existingAdmin.tokens.balance);
      
    } else {
      console.log('👤 No existing admin found. Creating new admin user...');
      
      // Create new admin user
      const adminUser = new User({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD, // Pre-save middleware will hash this
        name: ADMIN_NAME,
        role: 'admin',
        authProvider: 'local',
        isActive: true,
        // Give admin user tokens to start with
        tokens: {
          balance: 10000,
          used: 0,
          lastUpdated: new Date()
        },
        // Set up basic preferences
        preferences: {
          theme: 'light',
          language: 'en',
          notifications: true
        },
        // Initialize usage stats
        usage: {
          totalRequests: 0,
          totalTokensUsed: 0,
          lastUsed: new Date()
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const savedAdmin = await adminUser.save();
      console.log('✅ New admin user created successfully!');
      console.log('🆔 User ID:', savedAdmin._id);
      console.log('💰 Token balance:', savedAdmin.tokens.balance);
    }

    console.log('');
    console.log('🔐 Admin Credentials:');
    console.log('   Email:', ADMIN_EMAIL);
    console.log('   Password:', ADMIN_PASSWORD);
    console.log('   Role: admin');
    console.log('');
    console.log('🎯 You can now login to the admin panel using these credentials.');
    
  } catch (error) {
    console.error('❌ Error creating/updating admin user:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the script
if (require.main === module) {
  createAdminUser();
}

module.exports = { createAdminUser };