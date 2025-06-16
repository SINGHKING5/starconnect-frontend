'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  email: string;
  type: string;
  name: string;
}

interface Post {
  id: number;
  userId: number;
  content: string;
  timestamp: string;
  likes: number;
  comments: any[];
  userName: string;
  userType: string;
}

export default function FeedPage() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      setUser(JSON.parse(userData));
      fetchPosts();
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5050/posts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5050/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: postContent })
      });

      if (response.ok) {
        setPostContent('');
        fetchPosts(); // Refresh posts
      }
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setSubmitting(false);
    }
  };

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-white">StarConnect</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                user?.type === 'celebrity' 
                  ? 'bg-pink-500 text-white' 
                  : 'bg-blue-500 text-white'
              }`}>
                {user?.type === 'celebrity' ? 'Celebrity Feed' : 'Public Feed'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-white">
                Welcome, {user?.type === 'celebrity' ? 'Celebrity' : 'Public User'}
              </span>
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Post */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Create a Post</h2>
          <form onSubmit={handleCreatePost}>
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={3}
              disabled={submitting}
            />
            <div className="flex justify-end mt-4">
              <button
                type="submit"
                disabled={submitting || !postContent.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-purple-400 disabled:to-pink-400 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 flex items-center space-x-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Posting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>Post</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Posts Feed */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-white">Recent Posts</h2>
          {posts.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 border border-white/20 text-center">
              <p className="text-white/60">No posts yet. Be the first to share something!</p>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {post.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-white font-semibold">{post.userName}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        post.userType === 'celebrity' 
                          ? 'bg-pink-500 text-white' 
                          : 'bg-blue-500 text-white'
                      }`}>
                        {post.userType}
                      </span>
                      <span className="text-white/60 text-sm">
                        {new Date(post.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-white/90 leading-relaxed mb-4">{post.content}</p>
                    <div className="flex items-center space-x-6">
                      <button className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span>{post.likes}</span>
                      </button>
                      <button className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>{post.comments.length}</span>
                      </button>
                      <button className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
} 