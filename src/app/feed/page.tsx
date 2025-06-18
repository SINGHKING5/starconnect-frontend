'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

interface LazyImageProps {
  src: string | null;
  alt: string;
  className?: string;
}

// Lazy loading image component with improved styling
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

export default function FeedPage() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [postContent, setPostContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [commentText, setCommentText] = useState('');
  const [commentingPostId, setCommentingPostId] = useState<number | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  
  const observerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Pagination settings
  const POSTS_PER_PAGE = 5;

  // Track loaded post IDs to avoid duplicates
  const [loadedPostIds, setLoadedPostIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Use utility functions for robust auth checking
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }

    setUser(currentUser);
    fetchPosts();
    setLoading(false);

    // Connect to socket for real-time updates
    socketManager.connect();

    // Listen for new posts
    const handleNewPost = (post: Post) => {
      setPosts(prev => [post, ...prev]);
    };

    socketManager.on('newPost', handleNewPost);

    return () => {
      socketManager.off('newPost', handleNewPost);
    };
  }, [router]);

  const fetchPosts = async (pageNum = 1, append = false) => {
    try {
      setError(null);
      const authData = getAuthData();
      if (!authData) return;
      const response = await fetch(`http://localhost:5050/api/posts?page=${pageNum}&limit=${POSTS_PER_PAGE}`, {
        headers: {
          'Authorization': `Bearer ${authData.token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (append) {
          setPosts(prev => {
            const newPosts = data.posts.filter((p: Post) => !loadedPostIds.has(p.id));
            setLoadedPostIds(new Set([...loadedPostIds, ...newPosts.map((p: Post) => p.id)]));
            return [...prev, ...newPosts];
          });
        } else {
          setLoadedPostIds(new Set(data.posts.map((p: Post) => p.id)));
          setPosts(data.posts);
        }
        setHasMore(data.pagination.hasNextPage);
      } else {
        throw new Error('Failed to fetch posts');
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError('Failed to load posts. Please try again.');
    }
  };

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    
    await fetchPosts(nextPage, true);
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

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;

    setSubmitting(true);
    try {
      const authData = getAuthData();
      if (!authData) return;
      
      const response = await fetch('http://localhost:5050/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.token}`
        },
        body: JSON.stringify({ content: postContent })
      });

      if (response.ok) {
        setPostContent('');
        // Refresh posts to show the new post at the top
        setPage(1);
        fetchPosts(1, false);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setError('Failed to create post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId: number) => {
    // Optimistic UI update
    setPosts(prevPosts => prevPosts.map(post => {
      if (post.id !== postId) return post;
      const userId = user?.id;
      if (!userId) return post;
      const hasLiked = post.likes && post.likes.includes(userId);
      let newLikes;
      if (hasLiked) {
        newLikes = post.likes.filter((id: number) => id !== userId);
      } else {
        newLikes = [...(post.likes || []), userId];
      }
      return { ...post, likes: newLikes };
    }));

    // Call backend
    try {
      const authData = getAuthData();
      if (!authData) return;
      await fetch(`http://localhost:5050/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authData.token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      // Optionally: revert optimistic update or show error
      console.error('Error liking post:', error);
    }
  };

  const handleComment = (postId: number) => {
    if (commentingPostId === postId) {
      setCommentingPostId(null);
      setCommentText('');
    } else {
      setCommentingPostId(postId);
      setCommentText('');
    }
  };

  const handleSubmitComment = async (postId: number) => {
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    
    // Optimistic UI update
    const newComment: Comment = {
      id: Date.now(), // Temporary ID
      userId: user?.id || 0,
      text: commentText.trim(),
      timestamp: new Date().toISOString(),
      user: {
        id: user?.id || 0,
        name: user?.name || 'Unknown User',
        avatar: null
      }
    };

    setPosts(prevPosts => prevPosts.map(post => {
      if (post.id !== postId) return post;
      return {
        ...post,
        comments: [...(post.comments || []), newComment]
      };
    }));

    try {
      const authData = getAuthData();
      if (!authData) return;
      
      const response = await fetch(`http://localhost:5050/api/posts/${postId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.token}`
        },
        body: JSON.stringify({ text: commentText.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        // Update with the real comment from backend
        setPosts(prevPosts => prevPosts.map(post => {
          if (post.id !== postId) return post;
          return {
            ...post,
            comments: post.comments.map(comment => 
              comment.id === newComment.id ? data.comment : comment
            )
          };
        }));
        setCommentText('');
        setCommentingPostId(null);
      } else {
        // Revert optimistic update on error
        setPosts(prevPosts => prevPosts.map(post => {
          if (post.id !== postId) return post;
          return {
            ...post,
            comments: post.comments.filter(comment => comment.id !== newComment.id)
          };
        }));
        throw new Error('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      setError('Failed to add comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShare = (postId: number) => {
    // TODO: Implement share functionality
    if (navigator.share) {
      navigator.share({
        title: 'Check out this post on StarConnect!',
        text: 'I found this interesting post on StarConnect',
        url: `${window.location.origin}/feed`
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/feed`);
      alert('Link copied to clipboard!');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50 shadow-lg">
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
                Welcome, {user?.name}
              </span>
              <NotificationBadge onNotificationClick={handleNotificationClick} />
              {user?.type === 'celebrity' && (
                <button
                  onClick={() => router.push('/create-post')}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Create Post
                </button>
              )}
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
        {/* Create Post */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20 mb-12 shadow-lg">
          <h2 className="text-xl font-semibold text-white mb-4">Create a Post</h2>
          <form onSubmit={handleCreatePost}>
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200"
              rows={3}
              disabled={submitting}
            />
            <div className="flex justify-end mt-4">
              <button
                type="submit"
                disabled={submitting || !postContent.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-purple-400 disabled:to-pink-400 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-md hover:shadow-lg disabled:shadow-none"
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
        <div className="space-y-8">
          <h2 className="text-2xl font-semibold text-white">Recent Posts</h2>
          
          {posts.length === 0 && !loading ? (
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-12 border border-white/20 text-center shadow-lg">
              <div className="max-w-md mx-auto">
                <svg className="w-16 h-16 text-white/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="text-xl font-semibold text-white mb-2">No posts yet</h3>
                <p className="text-white/60 mb-6">Be the first to post something awesome!</p>
                {user?.type === 'celebrity' && (
                  <button
                    onClick={() => router.push('/create-post')}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    Create Your First Post
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {posts.map((post, index) => (
                <div key={post.id} className={getPostCardStyle(post.userType)}>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <button
                        onClick={() => router.push(`/profile/${post.userId}`)}
                        className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                          post.userType === 'celebrity' 
                            ? 'bg-gradient-to-r from-pink-500 to-purple-500' 
                            : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                        }"
                      >
                        <span className="text-white font-semibold text-lg">
                          {post.userName.charAt(0).toUpperCase()}
                        </span>
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <button
                          onClick={() => router.push(`/profile/${post.userId}`)}
                          className="text-white font-semibold hover:text-purple-300 transition-colors cursor-pointer"
                        >
                          {post.userName}
                        </button>
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
                        <button 
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center space-x-2 transition-all duration-200 hover:scale-110 cursor-pointer ${
                            likedPosts.has(post.id) 
                              ? 'text-pink-400 hover:text-pink-300' 
                              : 'text-white/60 hover:text-white'
                          }`}
                        >
                          <svg className="w-5 h-5" fill={likedPosts.has(post.id) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          <span>{(post.likes || []).length}</span>
                        </button>
                        <button 
                          onClick={() => handleComment(post.id)}
                          className="flex items-center space-x-2 text-white/60 hover:text-white transition-all duration-200 hover:scale-110 cursor-pointer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span>{(post.comments || []).length}</span>
                        </button>

                        {/* Comment Section */}
                        {commentingPostId === post.id && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            {/* Existing Comments */}
                            {(post.comments || []).length > 0 && (
                              <div className="space-y-3 mb-4">
                                {post.comments.map((comment) => (
                                  <div key={comment.id} className="flex space-x-3">
                                    <div className="flex-shrink-0">
                                      <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs font-semibold">
                                          {comment.user.name.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex-1">
                                      <div className="bg-white/5 rounded-lg p-3">
                                        <div className="flex items-center space-x-2 mb-1">
                                          <span className="text-white font-medium text-sm">{comment.user.name}</span>
                                          <span className="text-white/40 text-xs">{formatTimestamp(comment.timestamp)}</span>
                                        </div>
                                        <p className="text-white/80 text-sm">{comment.text}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Add Comment Form */}
                            <div className="flex space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-semibold">
                                    {user?.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex space-x-2">
                                  <input
                                    type="text"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="Write a comment..."
                                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    disabled={submittingComment}
                                    maxLength={500}
                                  />
                                  <button
                                    onClick={() => handleSubmitComment(post.id)}
                                    disabled={submittingComment || !commentText.trim()}
                                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                  >
                                    {submittingComment ? 'Posting...' : 'Post'}
                                  </button>
                                </div>
                                <p className="text-white/40 text-xs mt-1">
                                  {commentText.length}/500 characters
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <button 
                          onClick={() => handleShare(post.id)}
                          className="flex items-center space-x-2 text-white/60 hover:text-white transition-all duration-200 hover:scale-110 cursor-pointer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                          </svg>
                          <span>Share</span>
                        </button>
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
                    <p>You've reached the end of the feed!</p>
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