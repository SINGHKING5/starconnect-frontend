'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, isAuthenticated, isCelebrity, getCurrentUser, clearAuthData, getAuthData } from '@/utils/auth';

export default function CreatePostPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [postContent, setPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [previewData, setPreviewData] = useState<{content: string, image: string | null} | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Use utility functions for robust auth checking
    console.log('Create Post - Starting auth check...');
    
    // Add a small delay to ensure localStorage is fully available
    const checkAuth = () => {
      if (!isAuthenticated()) {
        console.log('Create Post - Not authenticated, redirecting to login');
        router.push('/login');
        return;
      }

      const currentUser = getCurrentUser();
      if (!currentUser) {
        console.log('Create Post - No user data, redirecting to login');
        router.push('/login');
        return;
      }

      setUser(currentUser);
      
      // Check if user is a celebrity
      if (!isCelebrity()) {
        console.log('Create Post - Not a celebrity, redirecting to feed');
        router.push('/feed');
        return;
      }
      
      console.log('Create Post - Access granted for celebrity:', currentUser.name);
      setLoading(false);
    };

    // Small delay to ensure localStorage is ready
    setTimeout(checkAuth, 100);
  }, [router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!postContent.trim()) {
      alert('Please enter some content for your post');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const authData = getAuthData();
      if (!authData) {
        alert('Authentication required');
        return;
      }
      
      // Prepare payload with exact structure requested
      const payload = {
        content: postContent.trim(),
        image: imagePreview || null, // Base64 string or null
        authorId: authData.user.id.toString(), // From localStorage
        timestamp: new Date().toISOString() // Current date-time
      };
      
      console.log('Sending payload:', payload);
      
      const response = await fetch('http://localhost:5050/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Post created successfully:', data);
        
        // Set preview data with the actual created post
        setPreviewData({
          content: data.post.content,
          image: data.post.image
        });
        
        // Show success message
        setShowSuccess(true);
        
        // Reset form
        setPostContent('');
        setSelectedImage(null);
        setImagePreview(null);
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          setShowSuccess(false);
          setPreviewData(null);
        }, 3000);
      } else {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        alert(`Error creating post: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Network error creating post:', error);
      alert('Failed to create post. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearAuthData();
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
              <span className="bg-pink-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                Create Post
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-white">Welcome, {user?.name}</span>
              <button
                onClick={() => router.push('/feed')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Back to Feed
              </button>
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

      {/* Success Alert */}
      {showSuccess && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Post created successfully!</span>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
            <div className="text-sm">
              <strong>Debug Info:</strong>
              <br />
              User: {user?.name} ({user?.type})
              <br />
              Authenticated: {isAuthenticated() ? 'Yes' : 'No'}
              <br />
              Is Celebrity: {isCelebrity() ? 'Yes' : 'No'}
              <br />
              Token: {localStorage.getItem('token') ? 'Present' : 'Missing'}
              <br />
              UserRole: {localStorage.getItem('userRole') || 'Missing'}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Post Form */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-6">Create a New Post</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Post Content */}
                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-white/80 mb-2">
                    Post Content *
                  </label>
                  <textarea
                    id="content"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="Share what's on your mind with your fans..."
                    className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 resize-none focus:outline-none focus:ring-2 focus:ring-pink-500"
                    rows={6}
                    required
                    disabled={isSubmitting}
                  />
                  <p className="text-white/60 text-sm mt-1">
                    {postContent.length}/500 characters
                  </p>
                </div>

                {/* Image Upload */}
                <div>
                  <label htmlFor="image" className="block text-sm font-medium text-white/80 mb-2">
                    Add Image (Optional)
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label htmlFor="image" className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/20 border-dashed rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 text-white/60 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm text-white/60">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-white/40">PNG, JPG, GIF up to 10MB</p>
                      </div>
                      <input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        disabled={isSubmitting}
                      />
                    </label>
                  </div>
                  {selectedImage && (
                    <p className="text-white/60 text-sm mt-2">
                      Selected: {selectedImage.name}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !postContent.trim()}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:from-pink-400 disabled:to-purple-400 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Creating Post...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      <span>Create Post</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Preview Section */}
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Post Preview</h3>
              
              {previewData ? (
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {user?.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">{user?.name}</h4>
                      <p className="text-white/60 text-sm">Just now</p>
                    </div>
                  </div>
                  
                  <p className="text-white/90 leading-relaxed mb-4">{previewData.content}</p>
                  
                  {previewData.image && (
                    <div className="mb-4">
                      <img
                        src={previewData.image}
                        alt="Post preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-6 text-white/60">
                    <button className="flex items-center space-x-2 hover:text-white transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span>0</span>
                    </button>
                    <button className="flex items-center space-x-2 hover:text-white transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>0</span>
                    </button>
                    <button className="flex items-center space-x-2 hover:text-white transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                      </svg>
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white/5 rounded-lg p-8 text-center">
                  <svg className="w-12 h-12 text-white/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-white/60">Your post preview will appear here</p>
                </div>
              )}
            </div>

            {/* Tips Section */}
            <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Tips for Great Posts</h3>
              <ul className="space-y-2 text-white/70 text-sm">
                <li className="flex items-start space-x-2">
                  <span className="text-pink-400 mt-1">•</span>
                  <span>Share behind-the-scenes moments with your fans</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-pink-400 mt-1">•</span>
                  <span>Use high-quality images to engage your audience</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-pink-400 mt-1">•</span>
                  <span>Keep your content authentic and personal</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-pink-400 mt-1">•</span>
                  <span>Respond to comments to build community</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 