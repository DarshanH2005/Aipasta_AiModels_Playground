import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="text-2xl">AI</div>
              <h1 className="text-xl font-bold text-gray-900">AI Pasta</h1>
            </div>
            <nav className="flex items-center space-x-4">
              <Link href="/chat" className="text-gray-600 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium">
                Chat
              </Link>
              <Link href="/models" className="text-gray-600 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium">
                Models
              </Link>
              <Link href="/dashboard" className="text-gray-600 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium">
                Dashboard
              </Link>
              <Link href="/auth/signin" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                Sign In
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-purple-600">AI Pasta</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Your AI Model Kitchen - Mix, match, and experiment with AI models
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/models" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-full text-lg font-semibold">
              Explore Models
            </Link>
            <Link href="/playground" className="border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white px-8 py-4 rounded-full text-lg font-semibold">
              Try Playground
            </Link>
          </div>
        </div>
      </div>

      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="text-2xl">AI</div>
            <span className="text-xl font-bold">AI Pasta</span>
          </div>
          <p className="text-gray-400"> 2025 AI Pasta. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}