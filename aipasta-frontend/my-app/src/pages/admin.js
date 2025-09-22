import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { ToastProvider, useToast } from '../shared';
import { IconUsers, IconCurrency, IconBrain, IconChartBar, IconSettings, IconLogout, IconEye, IconTrash, IconEdit, IconShield, IconDashboard, IconCoins, IconX } from '@tabler/icons-react';

// StatCard Component
const StatCard = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500'
  };

  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className={`h-6 w-6 text-white p-1 rounded ${colorClasses[color]}`} />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {title}
              </dt>
              <dd className="text-lg font-medium text-gray-900 dark:text-white">
                {value}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

// UserTable Component
const UserTable = ({ users, onAddTokens }) => {
  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
      <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Tokens
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
          {users.map((user) => (
            <tr key={user._id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {user.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {user.email}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  user.role === 'admin' 
                    ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' 
                    : 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                }`}>
                  {user.role}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {user.tokens?.balance || user.credits || 0}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  user.isActive 
                    ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                    : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                }`}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex space-x-2">
                  <button 
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    title="View Details"
                  >
                    <IconEye className="w-4 h-4" />
                  </button>
                  <button 
                    className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                    title="Add Tokens"
                    onClick={() => onAddTokens(user)}
                  >
                    <IconCoins className="w-4 h-4" />
                  </button>
                  <button 
                    className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                    title="Edit User"
                  >
                    <IconEdit className="w-4 h-4" />
                  </button>
                  <button 
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    title="Delete User"
                  >
                    <IconTrash className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Main Admin Panel Component
const AdminPanelWithToast = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Token management state
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [tokenAmount, setTokenAmount] = useState('');
  const [tokenReason, setTokenReason] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Check if user is admin
  useEffect(() => {
    // Wait for auth to complete loading
    if (authLoading) {
      console.log('Auth still loading, waiting...');
      return;
    }

    // Debug: Log user object with full details
    console.log('Admin page - user object:', user);
    console.log('User role specifically:', user?.role);
    console.log('User object keys:', user ? Object.keys(user) : 'no user');
    console.log('Auth loading:', authLoading);
    
    if (!user) {
      console.log('No user found after auth loading completed, redirecting to chat');
      router.push('/chat');
      return;
    }

    // Check if user has admin role
    if (user.role !== 'admin') {
      console.log('Redirecting - not admin. User role:', user?.role);
      console.log('Expected: admin, Got:', typeof user.role, user.role);
      router.push('/chat');
      return;
    }

    console.log('User is admin, loading admin data');
    loadAdminData();
  }, [user, authLoading]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // Load admin dashboard stats
      const statsResponse = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: getAuthHeaders()
      });
      
      if (!statsResponse.ok) {
        if (statsResponse.status === 403) {
          showError('Access denied. Admin permissions required.');
          router.push('/chat');
          return;
        }
        throw new Error('Failed to load admin data');
      }
      
      const statsData = await statsResponse.json();
      setStats(statsData.data);

      // Load users list
      const usersResponse = await fetch(`${API_BASE}/api/admin/users`, {
        headers: getAuthHeaders()
      });
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.data.users || []);
      }
      
    } catch (error) {
      console.error('Error loading admin data:', error);
      showError('Failed to load admin data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Token management functions
  const handleAddTokens = (user) => {
    setSelectedUser(user);
    setTokenAmount('');
    setTokenReason('Admin token addition');
    setTokenModalOpen(true);
  };

  const handleTokenSubmit = async (e) => {
    e.preventDefault();
    
    if (!tokenAmount || isNaN(tokenAmount) || parseFloat(tokenAmount) <= 0) {
      showError('Please enter a valid token amount');
      return;
    }

    setTokenLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/users/${selectedUser._id}/tokens`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          amount: parseFloat(tokenAmount),
          reason: tokenReason || 'Admin token addition'
        })
      });

      const data = await response.json();

      if (response.ok) {
        showSuccess(`Successfully added ${tokenAmount} tokens to ${selectedUser.name}`);
        
        // Update the user in the local state
        setUsers(users.map(u => 
          u._id === selectedUser._id 
            ? { ...u, tokens: { ...u.tokens, balance: data.data.user.newBalance }, credits: data.data.user.newBalance }
            : u
        ));
        
        // Close modal and reset form
        setTokenModalOpen(false);
        setSelectedUser(null);
        setTokenAmount('');
        setTokenReason('');
      } else {
        showError(data.message || 'Failed to add tokens');
      }
    } catch (error) {
      console.error('Error adding tokens:', error);
      showError('Failed to add tokens: ' + error.message);
    } finally {
      setTokenLoading(false);
    }
  };

  const handleCloseTokenModal = () => {
    setTokenModalOpen(false);
    setSelectedUser(null);
    setTokenAmount('');
    setTokenReason('');
  };

  // Show loading screen while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Admin Panel - AI Pasta</title>
        <meta name="description" content="AI Pasta Admin Dashboard" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <IconShield className="h-8 w-8 text-blue-600 mr-3" />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Admin Dashboard
                </h1>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Welcome, {user?.name}
                </span>
                <button
                  onClick={() => router.push('/chat')}
                  className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  title="Back to Chat"
                >
                  <IconDashboard className="w-5 h-5" />
                </button>
                <button
                  onClick={() => logout()}
                  className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  title="Logout"
                >
                  <IconLogout className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Tab Navigation */}
              <div className="mb-6">
                <nav className="flex space-x-8" aria-label="Tabs">
                  {[
                    { id: 'dashboard', name: 'Dashboard', icon: IconChartBar },
                    { id: 'users', name: 'Users', icon: IconUsers },
                    { id: 'settings', name: 'Settings', icon: IconSettings }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`${
                          activeTab === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {tab.name}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                      title="Total Users"
                      value={stats?.totalUsers || 0}
                      icon={IconUsers}
                      color="blue"
                    />
                    <StatCard
                      title="Active Sessions"
                      value={stats?.activeSessions || 0}
                      icon={IconBrain}
                      color="green"
                    />
                    <StatCard
                      title="Total Models"
                      value={stats?.totalModels || 0}
                      icon={IconBrain}
                      color="purple"
                    />
                    <StatCard
                      title="Revenue"
                      value={`₹${stats?.totalRevenue || 0}`}
                      icon={IconCurrency}
                      color="yellow"
                    />
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                        Recent Activity
                      </h3>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        <p>• {stats?.recentSignups || 0} new users this week</p>
                        <p>• {stats?.recentSessions || 0} chat sessions today</p>
                        <p>• {stats?.recentPurchases || 0} plan purchases this month</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'users' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                      User Management
                    </h3>
                    <UserTable users={users} onAddTokens={handleAddTokens} />
                  </div>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                      System Settings
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      <p>System configuration options will be available here.</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Token Management Modal */}
      {tokenModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add Tokens to {selectedUser?.name}
              </h3>
              <button
                onClick={handleCloseTokenModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTokenSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  User Information
                </label>
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Email:</span> {selectedUser?.email}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Current Balance:</span> {selectedUser?.tokens?.balance || selectedUser?.credits || 0} tokens
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="tokenAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Token Amount *
                </label>
                <input
                  type="number"
                  id="tokenAmount"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter token amount"
                  min="1"
                  step="1"
                  required
                />
              </div>

              <div className="mb-6">
                <label htmlFor="tokenReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  id="tokenReason"
                  value={tokenReason}
                  onChange={(e) => setTokenReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Reason for adding tokens"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleCloseTokenModal}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  disabled={tokenLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={tokenLoading || !tokenAmount}
                >
                  {tokenLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Adding...
                    </div>
                  ) : (
                    `Add ${tokenAmount || '0'} Tokens`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

// Wrap with ToastProvider
const AdminPage = () => (
  <ToastProvider>
    <AdminPanelWithToast />
  </ToastProvider>
);

export default AdminPage;