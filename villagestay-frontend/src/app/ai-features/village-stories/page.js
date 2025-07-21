'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  VideoCameraIcon,
  PhotoIcon,
  SparklesIcon,
  PlayIcon,
  ArrowDownTrayIcon, // Fixed import
  ShareIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline';
// import AppLayout from '@/components/layout/AppLayout';
import { aiAPI, listingsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const VillageStoriesPage = () => {
  const router = useRouter();
  const { user, isHost, isAuthenticated, loading } = useAuth();
  const [hostListings, setHostListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [generationStatus, setGenerationStatus] = useState('idle'); // idle, generating, completed, error
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const [progress, setProgress] = useState(0);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);

  useEffect(() => {
    // Wait for auth to complete loading
    if (!loading) {
      setAccessChecked(true);
      
      if (!isAuthenticated) {
        toast.error('Please login to access this feature');
        router.push('/auth/login');
        return;
      }

      if (!isHost) {
        toast.error('Only hosts can access village stories feature');
        router.push('/');
        return;
      }
      
      fetchHostListings();
    }
  }, [loading, isAuthenticated, isHost, router, user]);

  const fetchHostListings = async () => {
    try {
      setListingsLoading(true);
      const response = await listingsAPI.getHostListings(user.id);
      setHostListings(response.data.listings || []);
    } catch (error) {
      console.error('Failed to fetch host listings:', error);
      toast.error('Failed to load your listings');
    } finally {
      setListingsLoading(false);
    }
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    
    if (files.length > 5) {
      toast.error('Please select maximum 5 images');
      return;
    }

    const imagePromises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({
          file,
          url: e.target.result,
          name: file.name
        });
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then(images => {
      setUploadedImages(images);
    });
  };

  const generateVillageStory = async () => {
    if (!selectedListing) {
      toast.error('Please select a listing first');
      return;
    }

    if (uploadedImages.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    setGenerationStatus('generating');
    setProgress(0);

    try {
      // Simulate AI video generation process
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + Math.random() * 15;
        });
      }, 1000);

      // Call AI API
      const response = await aiAPI.generateVillageStory({
        listing_id: selectedListing.id,
        images: uploadedImages.map(img => img.url)
      });

      clearInterval(progressInterval);
      setProgress(100);
      
      // Simulate video generation completion
      setTimeout(() => {
        setGeneratedVideo({
          id: response.data.video_id || 'demo_video_123',
          url: 'https://via.placeholder.com/800x450/22c55e/ffffff?text=Generated+Village+Story+Video',
          thumbnail: 'https://via.placeholder.com/400x225/22c55e/ffffff?text=Video+Thumbnail',
          duration: 60,
          title: `${selectedListing.title} - Village Story`,
          story_script: response.data.story_script || 'Welcome to our beautiful village where tradition meets hospitality. Our family has been welcoming guests for generations, sharing the authentic flavors of rural life. Experience the serenity of village mornings, participate in traditional farming activities, and enjoy home-cooked meals prepared with love and local ingredients.',
          download_url: '#'
        });
        setGenerationStatus('completed');
        toast.success('Village story video generated successfully!');
      }, 2000);

    } catch (error) {
      console.error('Failed to generate village story:', error);
      setGenerationStatus('error');
      toast.error('Failed to generate video. Please try again.');
    }
  };

  const startOver = () => {
    setSelectedListing(null);
    setUploadedImages([]);
    setGenerationStatus('idle');
    setGeneratedVideo(null);
    setProgress(0);
  };

  if (loading || !accessChecked) {
    return (
      <div className="min-h-screen village-bg pt-8 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner spinner-lg mx-auto mb-4"></div>
          <p className="text-gray-600">Checking access permissions...</p>
        </div>
      </div>
    );
  }

  // Don't render the component if user doesn't have access
  if (!isAuthenticated || !isHost) {
    return null;
  }

  return (
    // <AppLayout>
      <div className="min-h-screen village-bg pt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <VideoCameraIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              AI Village Story Generator 🎬
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Transform your property photos into a cinematic story that showcases the authentic village experience.
            </p>
          </div>

          {/* Host Verification Badge */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-full px-4 py-2">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <span className="text-green-700 font-medium">Host Account Verified</span>
            </div>
          </div>

          <div className="space-y-8">
            {/* Step 1: Select Listing */}
            {!selectedListing && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-8"
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Select a Property for Video Generation
                </h2>

                {listingsLoading ? (
                  <div className="text-center py-12">
                    <div className="spinner spinner-lg mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your listings...</p>
                  </div>
                ) : hostListings.length === 0 ? (
                  <div className="text-center py-12">
                    <VideoCameraIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No listings found</h3>
                    <p className="text-gray-600 mb-6">
                      You need to have at least one listing to generate village stories.
                    </p>
                    <button
                      onClick={() => router.push('/host/create-listing')}
                      className="btn-primary"
                    >
                      Create Your First Listing
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {hostListings.map((listing) => (
                      <motion.button
                        key={listing.id}
                        onClick={() => setSelectedListing(listing)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="card p-0 overflow-hidden text-left hover:shadow-xl transition-all duration-300 hover:ring-2 hover:ring-green-500"
                      >
                        <div className="relative">
                          <img
                            src={listing.images?.[0] || 'https://via.placeholder.com/400x200/22c55e/ffffff?text=No+Image'}
                            alt={listing.title}
                            className="w-full h-48 object-cover"
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/400x200/22c55e/ffffff?text=No+Image';
                            }}
                          />
                          <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-lg text-xs font-medium">
                            {listing.images?.length || 0} photos
                          </div>
                          <div className="absolute top-3 left-3 bg-white rounded-lg px-2 py-1 text-xs font-medium text-gray-700">
                            <VideoCameraIcon className="w-3 h-3 inline mr-1" />
                            Generate Video
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 mb-2">{listing.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{listing.location}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-gray-900">
                              ₹{listing.price_per_night}/night
                            </span>
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full capitalize">
                              {listing.property_type?.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Upload Images */}
            {selectedListing && generationStatus === 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Selected Listing */}
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Creating story for: {selectedListing.title}
                    </h2>
                    <button
                      onClick={startOver}
                      className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                      <span>Change Property</span>
                    </button>
                  </div>
                  <div className="flex items-center space-x-4">
                    <img
                      src={selectedListing.images?.[0] || 'https://via.placeholder.com/100x100'}
                      alt={selectedListing.title}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedListing.title}</h3>
                      <p className="text-gray-600">{selectedListing.location}</p>
                      <p className="text-sm text-gray-500">{selectedListing.property_type?.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>

                {/* Image Upload */}
                <div className="card p-8">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">
                    Upload Images for Your Village Story
                  </h3>

                  <div className="space-y-6">
                    {/* Upload Area */}
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-400 transition-colors duration-200">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                          Upload Property Images
                        </h4>
                        <p className="text-gray-600 mb-4">
                          Select 3-5 high-quality images that showcase your property and surroundings
                        </p>
                        <div className="btn-primary inline-flex">
                          Choose Images
                        </div>
                      </label>
                    </div>

                    {/* Uploaded Images Preview */}
                    {uploadedImages.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4">
                          Uploaded Images ({uploadedImages.length}/5)
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                          {uploadedImages.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={image.url}
                                alt={`Upload ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg"
                              />
                              <button
                                onClick={() => setUploadedImages(prev => 
                                  prev.filter((_, i) => i !== index)
                                )}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tips */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">💡 Tips for Better Videos</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Include exterior shots of your property</li>
                        <li>• Add photos of the surrounding village/landscape</li>
                        <li>• Show interior spaces and unique features</li>
                        <li>• Include images of local activities or culture</li>
                        <li>• Use high-resolution, well-lit photos</li>
                      </ul>
                    </div>

                    {/* Generate Button */}
                    {uploadedImages.length > 0 && (
                      <div className="text-center">
                        <button
                          onClick={generateVillageStory}
                          className="btn-primary btn-lg"
                        >
                          <SparklesIcon className="w-6 h-6 mr-2" />
                          Generate Village Story Video
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Generation Progress */}
            {generationStatus === 'generating' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-8 text-center"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <VideoCameraIcon className="w-10 h-10 text-white" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Creating Your Village Story ✨
                </h2>

                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Our AI is analyzing your images and creating a beautiful cinematic story about your village property.
                </p>

                {/* Progress Bar */}
                <div className="max-w-md mx-auto mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Generation Progress</span>
                    <span className="text-sm font-medium text-gray-700">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Generation Steps */}
                <div className="space-y-4 max-w-sm mx-auto">
                  {[
                    { step: 'Analyzing images', completed: progress > 20 },
                    { step: 'Creating story narrative', completed: progress > 40 },
                    { step: 'Generating video scenes', completed: progress > 60 },
                    { step: 'Adding music and transitions', completed: progress > 80 },
                    { step: 'Finalizing video', completed: progress > 95 }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        item.completed ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                      <span className={`text-sm ${
                        item.completed ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {item.step}
                      </span>
                      {item.completed && (
                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 4: Generated Video */}
            {generationStatus === 'completed' && generatedVideo && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="card p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                      Your Village Story is Ready! 🎉
                    </h2>
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircleIcon className="w-6 h-6" />
                      <span className="font-medium">Video Generated</span>
                    </div>
                  </div>

                  {/* Video Player */}
                  <div className="relative rounded-2xl overflow-hidden mb-6 bg-gray-900">
                    <div className="aspect-w-16 aspect-h-9">
                      <div className="w-full h-64 md:h-96 flex items-center justify-center relative">
                        <img
                          src={generatedVideo.thumbnail}
                          alt="Video Thumbnail"
                          className="w-full h-full object-cover"
                        />
                        <button className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors duration-200 group">
                          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                            <PlayIcon className="w-8 h-8 text-gray-900 ml-1" />
                          </div>
                        </button>
                        <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-lg text-sm">
                          {generatedVideo.duration}s
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Video Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                      <ClockIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <div className="font-semibold text-gray-900">{generatedVideo.duration}s</div>
                      <div className="text-sm text-gray-600">Duration</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-xl">
                      <EyeIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <div className="font-semibold text-gray-900">HD Quality</div>
                      <div className="text-sm text-gray-600">1080p Resolution</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-xl">
                      <VideoCameraIcon className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                      <div className="font-semibold text-gray-900">Cinematic</div>
                      <div className="text-sm text-gray-600">AI Enhanced</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button className="btn-primary flex items-center justify-center">
                      <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                      Download Video
                    </button>
                    <button className="btn-secondary flex items-center justify-center">
                      <ShareIcon className="w-5 h-5 mr-2" />
                      Share Video
                    </button>
                    <button
                      onClick={startOver}
                      className="btn-outline"
                    >
                      Create Another
                    </button>
                  </div>
                </div>

                {/* Story Script */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Generated Story Script
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-gray-700 leading-relaxed italic">
                      "{generatedVideo.story_script}"
                    </p>
                  </div>
                </div>

                {/* Usage Tips */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    How to Use Your Village Story
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Marketing Tips:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Share on social media platforms</li>
                        <li>• Add to your listing description</li>
                        <li>• Use in email marketing</li>
                        <li>• Include in travel blogs</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Best Practices:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Keep captions in multiple languages</li>
                        <li>• Include contact information</li>
                        <li>• Add booking links</li>
                        <li>• Update regularly with new videos</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Error State */}
            {generationStatus === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-8 text-center"
              >
                <ExclamationCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Generation Failed
                </h2>
                <p className="text-gray-600 mb-6">
                  We encountered an issue while generating your village story. Please try again.
                </p>
                <div className="space-x-4">
                  <button
                    onClick={generateVillageStory}
                    className="btn-primary"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={startOver}
                    className="btn-secondary"
                  >
                    Start Over
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Feature Info */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI-Powered</h3>
              <p className="text-sm text-gray-600">Advanced AI creates compelling narratives from your property images</p>
            </div>

            <div className="card p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <VideoCameraIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Professional Quality</h3>
              <p className="text-sm text-gray-600">Cinematic videos with smooth transitions and engaging storytelling</p>
            </div>

            <div className="card p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <ShareIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Ready to Share</h3>
              <p className="text-sm text-gray-600">Download and share across all your marketing channels instantly</p>
            </div>
          </div>
        </div>
      </div>
    // </AppLayout>
  );
};

export default VillageStoriesPage;