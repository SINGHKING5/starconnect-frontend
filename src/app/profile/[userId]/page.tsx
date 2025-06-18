'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { User, isAuthenticated, getCurrentUser, clearAuthData, getAuthData } from '@/utils/auth';
import socketManager from '@/utils/socket';
import NotificationBadge from '@/components/NotificationBadge';

interface Post {
  id: number;
  userId: number;
  content: string;
  image: string | null;
  timestamp: string;
  likes: number[];
  comments: Comment[];
  userName: string;
  userType: string;
}

interface Comment {
  id: number;
  userId: number;
  text: string;
  timestamp: string;
  user: {
    id: number;
    name: string;
    avatar: string | null;
  };
}

interface ProfileUser {
  id: number;
  name: string;
  type: string;
  followers: number[];
  following: number[];
  followerCount: number;
  followingCount: number;
  posts: number;
}

interface LazyImageProps {
  src: string | null;
  alt: string;
  className?: string;
}

// Lazy loading image component
const LazyImage = ({ src, alt, className = "" }: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  if (!src || hasError) return null;

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      )}
      <img
        ref={imgRef}
        src={isInView ? src : undefined}
        alt={alt}
        className={`w-full h-auto max-h-[400px] object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        loading="lazy"
      />
    </div>
  );
};

export default function ProfilePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [canFollow, setCanFollow] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  
  const observerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  // Pagination settings
  const POSTS_PER_PAGE = 10;

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }

    setCurrentUser(user);
    fetchProfile();
    fetchUserPosts();

    // Connect to socket for real-time updates
    socketManager.connect();
  }, [userId, router]);

  const fetchProfile = async () => {
    try {
      setError(null);
      const authData = getAuthData();
      if (!authData) return;
      
      const response = await fetch(`http://localhost:5050/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${authData.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfileUser(data.user);
        setIsFollowing(data.isFollowing);
        setCanFollow(data.canFollow);
        setFollowerCount(data.user.followerCount);
      } else {
        throw new Error('Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile. Please try again.');
    }
  };

  const fetchUserPosts = async (pageNum = 1, append = false) => {
    try {
      setError(null);
      const authData = getAuthData();
      if (!authData) return;
      
      const response = await fetch(`http://localhost:5050/api/users/${userId}/posts?page=${pageNum}&limit=${POSTS_PER_PAGE}`, {
        headers: {
          'Authorization': `Bearer ${authData.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (append) {
          setPosts(prev => [...prev, ...data.posts]);
        } else {
          setPosts(data.posts);
        }
        
        setHasMore(data.pagination.hasNextPage);
      } else {
        throw new Error('Failed to fetch posts');
      }
    } catch (error) {
      console.error('Error fetching user posts:', error);
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    
    await fetchUserPosts(nextPage, true);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMorePosts();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [loadMorePosts, hasMore, loadingMore]);

  const handleFollow = async () => {
    if (!canFollow) return;

    setFollowLoading(true);
    
    // Optimistic update
    const newIsFollowing = !isFollowing;
    setIsFollowing(newIsFollowing);
    setFollowerCount(prev => newIsFollowing ? prev + 1 : prev - 1);

    try {
      const authData = getAuthData();
      if (!authData) return;
      
      const response = await fetch(`http://localhost:5050/api/users/${userId}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authData.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Update with actual data from backend
        setIsFollowing(data.isFollowing);
        setFollowerCount(data.followerCount);
      } else {
        // Revert optimistic update on error
        setIsFollowing(!newIsFollowing);
        setFollowerCount(prev => !newIsFollowing ? prev + 1 : prev - 1);
        throw new Error('Failed to follow/unfollow');
      }
    } catch (error) {
      console.error('Error following user:', error);
      setError('Failed to follow/unfollow. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthData();
    router.push('/login');
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getPostCardStyle = (userType: string) => {
    const baseStyle = "bg-white/10 backdrop-blur-md rounded-lg p-6 border transition-all duration-200 hover:bg-white/15 shadow-lg hover:shadow-xl";
    
    if (userType === 'celebrity') {
      return `${baseStyle} border-pink-300/30 bg-gradient-to-br from-white/10 to-pink-500/5`;
    } else {
      return `${baseStyle} border-blue-300/30 bg-gradient-to-br from-white/10 to-blue-500/5`;
    }
  };

  const handleNotificationClick = (notification: any) => {
    // Handle notification clicks - could navigate to specific posts
    if (notification.data?.postId) {
      // Could scroll to post or navigate to post detail
      console.log('Notification clicked for post:', notification.data.postId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">User Not Found</h1>
          <button
            onClick={() => router.push('/feed')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Back to Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/feed')}
                className="text-white hover:text-purple-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-white">Profile</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-white">
                Welcome, {currentUser?.name}
              </span>
              <NotificationBadge onNotificationClick={handleNotificationClick} />
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 shadow-md">
            <div className="flex items-center justify-between">
              <span className="font-medium">{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 transition-colors"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 border border-white/20 mb-8 shadow-lg">
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
                profileUser.type === 'celebrity' 
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500' 
                  : 'bg-gradient-to-r from-blue-500 to-cyan-500'
              }`}>
                <span className="text-white font-bold text-3xl">
                  {profileUser.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-2">
                <h1 className="text-3xl font-bold text-white">{profileUser.name}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  profileUser.type === 'celebrity' 
                    ? 'bg-pink-500 text-white' 
                    : 'bg-blue-500 text-white'
                }`}>
                  {profileUser.type === 'celebrity' ? 'Celebrity' : 'Public User'}
                </span>
              </div>
              <div className="flex items-center space-x-6 text-white/80">
                <div className="text-center">
                  <div className="text-2xl font-bold">{profileUser.posts}</div>
                  <div className="text-sm">Posts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{followerCount}</div>
                  <div className="text-sm">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{profileUser.followingCount}</div>
                  <div className="text-sm">Following</div>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0">
              {canFollow && (
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg ${
                    isFollowing
                      ? 'bg-gray-600 hover:bg-gray-700 text-white'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                  }`}
                >
                  {followLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Loading...</span>
                    </div>
                  ) : (
                    isFollowing ? 'Unfollow' : 'Follow'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Posts Section */}
        <div className="space-y-8">
          <h2 className="text-2xl font-semibold text-white">Posts</h2>
          
          {posts.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-12 border border-white/20 text-center shadow-lg">
              <div className="max-w-md mx-auto">
                <svg className="w-16 h-16 text-white/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="text-xl font-semibold text-white mb-2">No posts yet</h3>
                <p className="text-white/60">This user hasn't posted anything yet.</p>
              </div>
            </div>
          ) : (
            <>
              {posts.map((post) => (
                <div key={post.id} className={getPostCardStyle(post.userType)}>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        post.userType === 'celebrity' 
                          ? 'bg-gradient-to-r from-pink-500 to-purple-500' 
                          : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                      }`}>
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
                          {formatTimestamp(post.timestamp)}
                        </span>
                      </div>
                      
                      <p className="text-white/90 leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>
                      
                      {/* Lazy loaded image */}
                      {post.image && (
                        <div className="mb-4">
                          <LazyImage
                            src={post.image}
                            alt="Post image"
                            className="max-h-[400px] object-cover"
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-6 pt-2 border-t border-white/10">
                        <div className="flex items-center space-x-2 text-white/60">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          <span>{(post.likes || []).length}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-white/60">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span>{(post.comments || []).length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Infinite scroll trigger */}
              <div ref={observerRef} className="py-4">
                {loadingMore && (
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
                {!hasMore && posts.length > 0 && (
                  <div className="text-center text-white/60 py-4">
                    <p>You've reached the end of the posts!</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
} 