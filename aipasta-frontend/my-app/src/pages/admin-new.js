import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

// Client-side only admin component
const ClientOnlyAdmin = () => {
  const [isClient, setIsClient] = useState(false);
  const [AdminComponent, setAdminComponent] = useState(null);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    
    // Dynamically import the admin component only on client side
    const loadAdminComponent = async () => {
      try {
        const { AdminPanelComponent } = await import('../components/admin/AdminPanel');
        setAdminComponent(() => AdminPanelComponent);
      } catch (error) {
        console.error('Failed to load admin component:', error);
        router.push('/');
      }
    };

    if (typeof window !== 'undefined') {
      loadAdminComponent();
    }
  }, [router]);

  // Show loading during SSR and while loading component
  if (!isClient || !AdminComponent) {
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

  return <AdminComponent />;
};

export default ClientOnlyAdmin;