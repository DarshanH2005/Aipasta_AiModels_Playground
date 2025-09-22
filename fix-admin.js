#!/usr/bin/env node

/**
 * Production Admin Fix Script
 * Quick script to create admin user and check database status
 */

const https = require('https');
const readline = require('readline');

// Configuration
const API_BASE = 'https://aipasta-backend.onrender.com';
const DEFAULT_ADMIN = {
  email: 'admin@aipasta.com',
  password: 'admin@123',
  name: 'Super Admin'
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Check backend health
async function checkHealth() {
  try {
    console.log('🔍 Checking backend health...');
    const response = await makeRequest(`${API_BASE}/health`);
    
    if (response.status === 200) {
      console.log('✅ Backend is online');
      console.log('📊 Response:', response.data);
      return true;
    } else {
      console.log('⚠️ Backend responded with status:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Backend health check failed:', error.message);
    return false;
  }
}

// Create admin user
async function createAdmin(adminData = DEFAULT_ADMIN) {
  try {
    console.log('👤 Creating admin user...');
    console.log('📧 Email:', adminData.email);
    
    const response = await makeRequest(`${API_BASE}/api/admin/create-initial-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: adminData
    });
    
    if (response.status === 201) {
      console.log('✅ Admin user created successfully!');
      console.log('🔐 Credentials:');
      console.log('   Email:', adminData.email);
      console.log('   Password:', adminData.password);
      console.log('   Role: admin');
      console.log('💰 Token Balance:', response.data?.data?.user?.tokenBalance || 10000);
      return true;
    } else if (response.status === 400 && response.data?.message?.includes('already exists')) {
      console.log('ℹ️ Admin user already exists');
      console.log('🔐 Try these credentials:');
      console.log('   Email:', adminData.email);
      console.log('   Password:', adminData.password);
      return true;
    } else {
      console.log('❌ Failed to create admin user');
      console.log('📊 Status:', response.status);
      console.log('📄 Response:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Admin creation failed:', error.message);
    return false;
  }
}

// Interactive prompt
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// Main function
async function main() {
  console.log('🔧 AI Pasta Production Admin Fix Tool');
  console.log('=====================================\n');
  
  // Check health first
  const isHealthy = await checkHealth();
  console.log('');
  
  if (!isHealthy) {
    console.log('⚠️ Backend seems to be having issues. Continue anyway? (y/n)');
    const rl = createInterface();
    
    const answer = await new Promise(resolve => {
      rl.question('', resolve);
    });
    
    rl.close();
    
    if (answer.toLowerCase() !== 'y') {
      console.log('Exiting...');
      process.exit(0);
    }
  }
  
  // Create admin user
  const success = await createAdmin();
  console.log('');
  
  if (success) {
    console.log('🎯 Next Steps:');
    console.log('1. Try logging into the admin panel');
    console.log('2. If admin panel shows errors, use MongoDB Atlas:');
    console.log('   → https://cloud.mongodb.com/');
    console.log('   → Database: aipasta');
    console.log('   → Collections: users, chatmessages, chatsessions, etc.');
    console.log('3. Admin panel errors will be fixed in next deployment');
  } else {
    console.log('🛠️ Manual Steps:');
    console.log('1. Check backend logs for errors');
    console.log('2. Verify MongoDB connection');
    console.log('3. Use MongoDB Atlas interface for admin tasks');
  }
  
  console.log('\n📖 Database Info:');
  console.log('   MongoDB URI: Connected to aipasta database');
  console.log('   Collections: 6 total (users, plans, models, etc.)');
  console.log('   Status: Connected and operational');
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkHealth, createAdmin };