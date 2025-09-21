// Test script to verify frontend-backend connection
import { checkHealth, fetchModels } from '../lib/api-client.js';
import { useAuth } from '../contexts/AuthContext';

export default function ConnectionTest() {
  const { user } = useAuth();
  
  const testConnection = async () => {
    console.log('🔄 Testing backend connection...');
    
    try {
      // Test 1: Health check
      console.log('Testing health endpoint...');
      const health = await checkHealth();
      console.log('✅ Health check response:', health);
      
      // Test 2: Models endpoint (requires authentication)
      if (!user) {
        console.log('⚠️ Skipping models test - user not authenticated');
        return { success: true, health, modelCount: 0, note: 'Models test skipped - authentication required' };
      }
      
      console.log('Testing models endpoint...');
      const models = await fetchModels();
      console.log('✅ Models response (count):', models?.models?.length || 'No models');
      
      return { success: true, health, modelCount: models?.models?.length || 0 };
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return { success: false, error: error.message };
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Frontend-Backend Connection Test</h2>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded-lg">
          <p><strong>Backend URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'Not configured'}</p>
          <p><strong>Frontend URL:</strong> http://localhost:3000</p>
        </div>
        
        <button
          onClick={testConnection}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
        >
          Test Connection
        </button>
        
        <div className="mt-4 text-sm text-gray-600">
          <p>Check the browser console for detailed test results.</p>
        </div>
      </div>
    </div>
  );
}