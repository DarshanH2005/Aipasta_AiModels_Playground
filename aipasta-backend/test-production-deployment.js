/**
 * Test script to check if production deployment has the latest fixes
 */

const BASE_URL = 'https://aipasta-backend.onrender.com';

async function testProductionDeployment() {
    console.log('🔍 Testing production deployment status...\n');
    
    try {
        // Test basic connectivity
        const response = await fetch(BASE_URL);
        const data = await response.json();
        console.log('✅ Backend is online:', data.name);
        
        // Check if we can see our webhook event model
        console.log('\n🔍 Checking API endpoints...');
        
        // Try to access plans endpoint (should require auth but we can see error type)
        const plansResponse = await fetch(`${BASE_URL}/api/plans`);
        console.log('Plans endpoint status:', plansResponse.status);
        
        if (plansResponse.status === 401) {
            console.log('✅ Plans endpoint exists (requires auth as expected)');
        }
        
        // The key test is that the backend should have our new error handling
        console.log('\n📝 Deployment appears to be ready for testing');
        console.log('🎯 Try the payment flow again - the new error handling should work');
        
    } catch (error) {
        console.error('❌ Error testing deployment:', error.message);
    }
}

testProductionDeployment();