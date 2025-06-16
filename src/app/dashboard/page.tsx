'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  email: string;
  type: string;
  name: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in and is a celebrity
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    const userRole = localStorage.getItem('userRole');

    if (!token || !userData || userRole !== 'celebrity') {
      router.push('/login');
      return;
    }

    try {
      setUser(JSON.parse(userData));
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">StarConnect</h1>
              <span className="bg-pink-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                Celebrity Dashboard
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-white">Welcome, {user?.name}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats Cards */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-white/60 text-sm">Followers</p>
                    <p className="text-white text-2xl font-bold">1,234</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
                <div className="flex items-center">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-white/60 text-sm">Post Views</p>
                    <p className="text-white text-2xl font-bold">5,678</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-white/60 text-sm">Total Likes</p>
                    <p className="text-white text-2xl font-bold">9,012</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-3 bg-white/5 rounded-lg">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-white">New follower: @fan123</span>
                  <span className="text-white/60 text-sm">2 minutes ago</span>
                </div>
                <div className="flex items-center space-x-4 p-3 bg-white/5 rounded-lg">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-white">Post liked by @celebrity_fan</span>
                  <span className="text-white/60 text-sm">5 minutes ago</span>
                </div>
                <div className="flex items-center space-x-4 p-3 bg-white/5 rounded-lg">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span className="text-white">New comment on your post</span>
                  <span className="text-white/60 text-sm">10 minutes ago</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200">
                  Create New Post
                </button>
                <button className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200">
                  View Analytics
                </button>
                <button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200">
                  Manage Profile
                </button>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4">Profile Info</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-white/60 text-sm">Name</p>
                  <p className="text-white font-medium">{user?.name}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">Email</p>
                  <p className="text-white font-medium">{user?.email}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">Account Type</p>
                  <span className="inline-block bg-pink-500 text-white px-2 py-1 rounded text-sm font-medium">
                    {user?.type}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 