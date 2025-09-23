/**
 * Test payment verification endpoint to see if new logging is active
 */

const BASE_URL = 'https://aipasta-backend.onrender.com';

async function testPaymentVerification() {
    console.log('🔍 Testing payment verification endpoint...\n');
    
    try {
        // Test with mock data (this should fail but show us the new error handling)
        const testData = {
            razorpay_payment_id: 'pay_test123',
            razorpay_order_id: 'order_test123', 
            razorpay_signature: 'test_signature'
        };
        
        const response = await fetch(`${BASE_URL}/api/plans/68d27a21763fd0c50021f882/verify-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test_token' // This won't work but let's see the response
            },
            body: JSON.stringify(testData)
        });
        
        console.log('Response status:', response.status);
        const text = await response.text();
        console.log('Response:', text);
        
        if (response.status === 401) {
            console.log('\n✅ Endpoint is protected (expected)');
            console.log('🎯 The new error handling should be active');
            console.log('\nℹ️  Try the payment flow again from the frontend');
        }
        
    } catch (error) {
        console.error('❌ Error testing endpoint:', error.message);
    }
}

testPaymentVerification();