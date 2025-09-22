import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

// Simple Admin Page - Client Side Only
const AdminPage = () => {
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Redirect to a message page or return loading during SSR
  if (!isClient) {
    return (
      <>
        <Head>
          <title>Loading Admin Panel - AI Pasta</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading Admin Panel...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Admin Panel - AI Pasta</title>
        <meta name="description" content="AI Pasta Admin Dashboard" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-blue-600 mb-4">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Admin Panel Under Maintenance
            </h1>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              The admin panel is temporarily unavailable due to technical issues. 
              Please try again later or contact support.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => router.push('/chat')}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Chat
              </button>
              
              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Go to Home
              </button>
            </div>
            
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Temporary Workaround:</strong><br />
                For admin functions, please use the database management tools directly 
                or contact the development team.
              </p>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Database Info:</strong><br />
                Connected to: aipasta database<br />
                Collections: users, chatmessages, chatsessions, plans, aimodels, webhook_events
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminPage;