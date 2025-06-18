'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAuthData } from '@/utils/auth';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (userType: 'celebrity' | 'public') => {
    setIsLoading(true);
    setError('');

    const credentials = {
      celebrity: { email: 'celeb@example.com', password: '123456' },
      public: { email: 'user@example.com', password: '123456' }
    };

    try {
      const response = await fetch('http://localhost:5050/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials[userType]),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.success) {
        // Use utility function to save auth data consistently
        setAuthData(data.token, data.user, data.user.type);

        // Redirect based on user role
        if (data.user.type === 'celebrity') {
          router.push('/feed');
        } else {
          router.push('/feed');
        }
      } else {
        throw new Error('Login failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            StarConnect
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Connect with your favorite celebrities
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={() => handleLogin('celebrity')}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:from-pink-400 disabled:to-purple-500 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 text-lg flex items-center justify-center"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Logging in...</span>
              </div>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
                Login as Celebrity
              </>
            )}
          </button>

          <button
            onClick={() => handleLogin('public')}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:from-blue-400 disabled:to-cyan-500 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 text-lg flex items-center justify-center"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Logging in...</span>
              </div>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                </svg>
                Login as Public User
              </>
            )}
          </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Demo Credentials:
          </p>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-500 space-y-1">
            <p>Celebrity: celeb@example.com / 123456</p>
            <p>Public: user@example.com / 123456</p>
          </div>
        </div>
      </div>
    </div>
  );
} 