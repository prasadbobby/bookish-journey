// villagestay-frontend/src/app/ai-features/village-stories/page.js

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  VideoCameraIcon,
  PhotoIcon,
  SparklesIcon,
  PlayIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChevronLeftIcon,
  PlusIcon,
  XMarkIcon,
  CloudArrowUpIcon,
  FilmIcon,
  // SparklesIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { aiAPI, listingsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

// Define API_BASE_URL at the top of the component
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const VillageStoriesPage = () => {
  const router = useRouter();
  const { user, isHost, isAuthenticated, loading } = useAuth();
  const [hostListings, setHostListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [generationStatus, setGenerationStatus] = useState('idle');
  const [generatedVideo, setGeneratedVideo] = useState(null);
  const [progress, setProgress] = useState(0);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [accessChecked, setAccessChecked] = useState(false);
  const [generationId, setGenerationId] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
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

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const fetchHostListings = async () => {
    try {
      setListingsLoading(true);
      console.log('🔍 Fetching host listings for user:', user.id);
      const response = await listingsAPI.getHostListings(user.id);
      console.log('📋 Host listings response:', response.data);
      setHostListings(response.data.listings || []);
    } catch (error) {
      console.error('❌ Failed to fetch host listings:', error);
      toast.error('Failed to load your listings');
    } finally {
      setListingsLoading(false);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast.error('Please select only image files');
      return;
    }

    if (uploadedImages.length + imageFiles.length > 5) {
      toast.error(`Please select maximum 5 images total. You have ${uploadedImages.length} images already.`);
      return;
    }

    const imagePromises = imageFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({
          id: Date.now() + Math.random(),
          file,
          url: e.target.result,
          name: file.name,
          size: file.size
        });
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then(newImages => {
      setUploadedImages(prev => [...prev, ...newImages]);
      toast.success(`Added ${newImages.length} image${newImages.length > 1 ? 's' : ''}`);
    });
  };

  const removeImage = (imageId) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };

const pollGenerationStatus = async (id) => {
  try {
    console.log('🔍 Polling generation status for ID:', id);
    const response = await aiAPI.getStoryStatus(id);
    console.log('📊 Status response:', response.data);
    
    const status = response.data.status;
    
    setProgress(status === 'completed' ? 100 : status === 'processing' ? 75 : 25);
    
    if (status === 'completed' && response.data.video_data) {
      const videoData = response.data.video_data;
      console.log('🎬 Video data received:', videoData);
      
      // Construct correct URLs
      const baseVideoUrl = `${API_BASE_URL}${videoData.video_url}`;
      const downloadUrl = `${API_BASE_URL}${videoData.download_url}`;
      const streamUrl = `${API_BASE_URL}${videoData.stream_url}`;
      
      console.log('📹 Video URLs:');
      console.log('Base URL:', baseVideoUrl);
      console.log('Download URL:', downloadUrl);
      console.log('Stream URL:', streamUrl);
      
      setGeneratedVideo({
        id: videoData.video_id,
        url: baseVideoUrl,
        thumbnail: baseVideoUrl,
        duration: videoData.duration,
        title: `${selectedListing.title} - Village Story`,
        story_script: videoData.prompt_used || 'AI-generated village story showcasing authentic rural hospitality and cultural experiences.',
        download_url: downloadUrl,
        stream_url: streamUrl,
        file_size: videoData.file_size,
        mongo_id: videoData.mongo_id
      });
      setGenerationStatus('completed');
      
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      
      toast.success('🎬 Village story video generated successfully!');
    } else if (status === 'error') {
      setGenerationStatus('error');
      
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      
      toast.error(`Video generation failed: ${response.data.error}`);
    }
  } catch (error) {
    console.error('❌ Failed to check generation status:', error);
  }
};
  const generateVillageStory = async () => {
    if (!selectedListing) {
      toast.error('Please select a listing first');
      return;
    }

    setGenerationStatus('generating');
    setProgress(0);

    try {
      console.log('🎬 Starting video generation...');
      toast.success('🎬 Starting video generation with Google Veo 3.0...', { duration: 3000 });

      const response = await aiAPI.generateVillageStory({
        listing_id: selectedListing.id,
        images: uploadedImages.map(img => img.url)
      });

      console.log('📝 Generation response:', response.data);
      const genId = response.data.generation_id;
      setGenerationId(genId);
      
      toast.success('🔄 Video generation in progress. This may take 2-5 minutes...', { duration: 5000 });

      // Start polling for status
      const interval = setInterval(() => pollGenerationStatus(genId), 10000);
      setPollingInterval(interval);

    } catch (error) {
      console.error('❌ Failed to generate village story:', error);
      setGenerationStatus('error');
      toast.error(error.response?.data?.error || 'Failed to generate video. Please try again.');
    }
  };

  const startOver = () => {
    setSelectedListing(null);
    setUploadedImages([]);
    setGenerationStatus('idle');
    setGeneratedVideo(null);
    setProgress(0);
    setGenerationId(null);
    
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  };

  const downloadVideo = () => {
    if (!generatedVideo?.download_url) {
      toast.error('Download URL not available');
      return;
    }

    const link = document.createElement('a');
    link.href = generatedVideo.download_url;
    link.download = `village_story_${selectedListing.title.replace(/\s+/g, '_')}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Download started!');
  };

  if (loading || !accessChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <SparklesIcon className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600">Checking access permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isHost) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-20 h-20 bg-gradient-to-r from-purple-600 via-blue-600 to-green-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <FilmIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-green-500 bg-clip-text text-transparent mb-6">
            AI Village Story Generator
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Transform your property into a cinematic masterpiece using Google's revolutionary Veo 3.0 AI technology. 
            Create stunning videos that showcase authentic village experiences and attract more guests.
          </p>
        </motion.div>

        {/* Technology Badge */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-12"
        >
          <div className="flex items-center space-x-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full px-8 py-4 shadow-lg">
            <SparklesIcon className="w-6 h-6" />
            <span className="font-semibold text-lg">Powered by Google Veo 3.0</span>
            <span className="bg-white/20 backdrop-blur-sm text-xs font-bold px-3 py-1 rounded-full">
              Latest AI
            </span>
          </div>
        </motion.div>

        <div className="space-y-8">
          {/* Step 1: Select Listing */}
          {!selectedListing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <VideoCameraIcon className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Choose Your Property
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Select the listing you'd like to create a stunning village story video for. 
                  Our AI will analyze your property details to craft the perfect narrative.
                </p>
              </div>

              {listingsLoading ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"></div>
                  </div>
                  <p className="text-gray-600">Loading your amazing properties...</p>
                </div>
              ) : hostListings.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <VideoCameraIcon className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 mb-4">No Properties Found</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    You need to have at least one property listing to generate village stories. 
                    Create your first listing to get started.
                  </p>
                  <button
                    onClick={() => router.push('/host/create-listing')}
                    className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-8 py-4 rounded-2xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                  >
                    Create Your First Listing
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {hostListings.map((listing) => (
                    <motion.button
                      key={listing.id}
                      onClick={() => setSelectedListing(listing)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.98 }}
                      className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 text-left border border-gray-100"
                    >
                      <div className="relative">
                        <img
                          src={listing.images?.[0] || 'https://via.placeholder.com/400x240/22c55e/ffffff?text=No+Image'}
                          alt={listing.title}
                          className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/400x240/22c55e/ffffff?text=No+Image';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        {/* Badges */}
                        <div className="absolute top-4 right-4 flex flex-col space-y-2">
                          <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                            {listing.images?.length || 0} photos
                          </span>
                          {listing.has_village_story && (
                            <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                              📹 Has Video
                            </span>
                          )}
                        </div>
                        
                        {/* Generate Badge */}
                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
                          <div className="flex items-center space-x-2">
                            <SparklesIcon className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-medium text-gray-700">Generate Story</span>
                          </div>
                        </div>
                        
                        {/* Play Icon Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                            <PlayIcon className="w-8 h-8 text-white ml-1" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <h3 className="font-bold text-gray-900 mb-2 text-lg group-hover:text-purple-600 transition-colors">
                          {listing.title}
                        </h3>
                        <p className="text-gray-600 mb-3 flex items-center">
                          <MapPinIcon className="w-4 h-4 mr-1" />
                          {listing.location}
                        </p>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-2xl font-bold text-gray-900">
                              ₹{listing.price_per_night}
                            </span>
                            <span className="text-gray-500 text-sm">/night</span>
                          </div>
                          <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full capitalize">
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
              className="space-y-8"
            >
              {/* Selected Listing */}
              <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center">
                      <CheckCircleIcon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        Creating story for: {selectedListing.title}
                      </h2>
                      <p className="text-gray-600">Ready to generate your AI-powered village story</p>
                    </div>
                  </div>
                  <button
                    onClick={startOver}
                    className="flex items-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                    <span>Change Property</span>
                  </button>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-100">
                  <div className="flex items-center space-x-4">
                    <img
                      src={selectedListing.images?.[0] || 'https://via.placeholder.com/100x100'}
                      alt={selectedListing.title}
                      className="w-20 h-20 rounded-xl object-cover shadow-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-lg">{selectedListing.title}</h3>
                      <p className="text-gray-600 flex items-center mt-1">
                        <MapPinIcon className="w-4 h-4 mr-1" />
                        {selectedListing.location}
                      </p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="bg-white/50 text-gray-700 text-sm px-3 py-1 rounded-full capitalize">
                          {selectedListing.property_type?.replace('_', ' ')}
                        </span>
                        <span className="bg-white/50 text-gray-700 text-sm px-3 py-1 rounded-full">
                          ₹{selectedListing.price_per_night}/night
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Image Upload Section */}
              <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CloudArrowUpIcon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    Enhance Your Story with Images
                  </h3>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Upload up to 5 stunning images of your property to help our AI create a more personalized and compelling video story. 
                    You can also generate a video without images using just your listing details.
                  </p>
                </div>

                <div className="space-y-8">
                  {/* Drag and Drop Upload Area */}
                  <div 
                    className={`relative border-3 border-dashed rounded-3xl p-12 text-center transition-all duration-300 ${
                      dragActive 
                        ? 'border-blue-500 bg-blue-50' 
                        : uploadedImages.length < 5 
                          ? 'border-gray-300 hover:border-blue-400 hover:bg-blue-50' 
                          : 'border-green-300 bg-green-50'
                    }`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                      disabled={uploadedImages.length >= 5}
                    />
                    
                    {uploadedImages.length < 5 ? (
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                          <PhotoIcon className="w-10 h-10 text-white" />
                        </div>
                        <h4 className="text-2xl font-bold text-gray-900 mb-4">
                          Drop images here or click to browse
                        </h4>
                        <p className="text-gray-600 mb-6 max-w-lg mx-auto">
                          Select up to 5 high-quality images that showcase your property's unique features, surroundings, and atmosphere.
                        </p>
                        <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-2xl font-semibold hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                          <PlusIcon className="w-5 h-5" />
                          <span>Choose Images</span>
                        </div>
                      </label>
                    ) : (
                      <div>
                        <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
                        <h4 className="text-2xl font-bold text-gray-900 mb-2">Perfect! All 5 images uploaded</h4>
                        <p className="text-gray-600">Your story will be even more engaging with these beautiful images</p>
                      </div>
                    )}
                    
                    {dragActive && (
                      <div className="absolute inset-0 bg-blue-500/10 border-blue-500 rounded-3xl flex items-center justify-center">
                        <div className="text-blue-600 font-semibold text-xl">
                          Drop your images here!
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Uploaded Images Preview */}
                  {uploadedImages.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-xl font-bold text-gray-900">
                          Uploaded Images ({uploadedImages.length}/5)
                        </h4>
                        <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                          {uploadedImages.length} image{uploadedImages.length > 1 ? 's' : ''} ready
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                        {uploadedImages.map((image) => (
                          <motion.div 
                            key={image.id} 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative group"
                          >
                            <div className="relative rounded-2xl overflow-hidden shadow-lg">
                              <img
                                src={image.url}
                                alt={image.name}
                                className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            </div>
                            
                            <button
                              onClick={() => removeImage(image.id)}
                              className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                            
                            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">
                              {(image.size / 1024 / 1024).toFixed(1)}MB
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Technology Info */}
                  <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-green-50 border border-purple-200 rounded-2xl p-8">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <SparklesIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 mb-3 text-lg">Google Veo 3.0 AI Technology</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <span>Creates cinematic 30-second videos with authentic storytelling</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span>Uses your listing description, amenities, and location details</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span>Incorporates uploaded images for personalized content</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              <span>Generates professional-quality videos for marketing</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                              <span>Processing time: 2-5 minutes depending on complexity</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                              <span>HD quality output ready for all platforms</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <div className="text-center">
                    <motion.button
                      onClick={generateVillageStory}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-gradient-to-r from-purple-600 via-blue-600 to-green-500 text-white px-12 py-6 rounded-3xl font-bold text-xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-2"
                    >
                      <div className="flex items-center space-x-3">
                        <SparklesIcon className="w-8 h-8" />
                        <span>Generate Village Story Video with AI</span>
                        <SparklesIcon className="w-6 h-6" />
                      </div>
                    </motion.button>
                    <div className="mt-4 space-y-2">
                      <p className="text-gray-600 font-medium">
                        Powered by Google Veo 3.0 • Generation takes 2-5 minutes
                      </p>
                      <p className="text-sm text-gray-500">
                        {uploadedImages.length > 0 
                          ? `Using ${uploadedImages.length} image${uploadedImages.length > 1 ? 's' : ''} for enhanced storytelling`
                          : 'Will use listing details to create your story'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Generation Progress */}
          {generationStatus === 'generating' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-xl p-12 text-center border border-gray-100"
            >
              <div className="w-32 h-32 bg-gradient-to-r from-purple-500 via-blue-500 to-green-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse shadow-2xl">
                <VideoCameraIcon className="w-16 h-16 text-white" />
              </div>

              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Creating Your Cinematic Village Story ✨
              </h2>

              <p className="text-gray-600 mb-12 max-w-2xl mx-auto text-lg">
                Google Veo 3.0 is analyzing your property details{uploadedImages.length > 0 && ` and ${uploadedImages.length} image${uploadedImages.length > 1 ? 's' : ''}`} to generate a stunning cinematic village story. 
                This process typically takes 2-5 minutes for the best quality results.
              </p>

              {/* Enhanced Progress Bar */}
              <div className="max-w-2xl mx-auto mb-12">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold text-gray-700">Generation Progress</span>
                  <span className="text-lg font-semibold text-gray-700">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-purple-500 via-blue-500 to-green-500 h-4 rounded-full transition-all duration-1000 shadow-lg"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Enhanced Generation Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                {[
                  { 
                    step: 'Analyzing Property Details', 
                    completed: progress > 20,
                    icon: SparklesIcon,
                    description: 'AI studying your listing information'
                  },
                  { 
                    step: 'Processing Visual Content', 
                    completed: progress > 40,
                    icon: PhotoIcon,
                    description: uploadedImages.length > 0 ? `Processing ${uploadedImages.length} images` : 'Creating visual concepts'
                  },
                  { 
                    step: 'Generating Video Scenes', 
                    completed: progress > 60,
                    icon: VideoCameraIcon,
                    description: 'Veo 3.0 creating cinematic sequences'
                  },
                  { 
                    step: 'Adding Transitions & Effects', 
                    completed: progress > 80,
                    icon: FilmIcon,
                    description: 'Polishing with professional touches'
                  },
                  { 
                    step: 'Finalizing Village Story', 
                    completed: progress > 95,
                    icon: CheckCircleIcon,
                    description: 'Preparing your masterpiece'
                  }
                ].map((item, index) => (
                  <motion.div 
                    key={index} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-6 rounded-2xl border-2 transition-all duration-500 ${
                      item.completed 
                        ? 'border-green-500 bg-green-50' 
                        : progress > (index * 20) 
                          ? 'border-blue-500 bg-blue-50 animate-pulse' 
                          : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${
                      item.completed 
                        ? 'bg-green-500' 
                        : progress > (index * 20) 
                          ? 'bg-blue-500' 
                          : 'bg-gray-400'
                    }`}>
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <h4 className={`font-semibold mb-2 ${
                      item.completed ? 'text-green-800' : 'text-gray-900'
                    }`}>
                      {item.step}
                    </h4>
                    <p className={`text-sm ${
                      item.completed ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {item.description}
                    </p>
                    {item.completed && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex justify-center mt-3"
                      >
                        <CheckCircleIcon className="w-6 h-6 text-green-500" />
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Real-time updates */}
              <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200">
                <div className="flex items-center justify-center space-x-3 mb-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <p className="text-blue-800 font-semibold">
                    🤖 AI is crafting your personalized village story...
                  </p>
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                </div>
                <p className="text-sm text-blue-600">
                  Generation ID: {generationId}
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 4: Generated Video */}
          {generationStatus === 'completed' && generatedVideo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Success Header */}
              <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-3xl shadow-xl p-8 text-white">
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6"
                  >
                    <CheckCircleIcon className="w-12 h-12 text-white" />
                  </motion.div>
                  <h2 className="text-4xl font-bold mb-4">
                    Your Village Story is Ready! 🎉
                  </h2>
                  <p className="text-xl text-white/90 max-w-2xl mx-auto">
                    Google Veo 3.0 has created a stunning cinematic experience that showcases the authentic beauty of your village property.
                  </p>
                </div>
              </div>
              {/* Video Player */}
             <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
               <div className="relative rounded-3xl overflow-hidden mb-8 bg-gray-900 shadow-2xl">
        <video
          controls
          className="w-full h-64 md:h-[600px] object-cover"
          key={generatedVideo.id}
          crossOrigin="anonymous"
          onError={(e) => {
            console.error('Video load error:', e);
            console.log('Attempting fallback URL...');
            // Fallback to direct URL if stream fails
            e.target.src = `${API_BASE_URL}${generatedVideo.url.replace('/stream', '')}`;
          }}
        >
          <source src={generatedVideo.stream_url} type="video/mp4" />
          <source src={generatedVideo.url} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

               {/* Video Stats */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                 <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl">
                   <ClockIcon className="w-10 h-10 text-blue-500 mx-auto mb-3" />
                   <div className="text-2xl font-bold text-gray-900">{generatedVideo.duration}s</div>
                   <div className="text-sm text-gray-600">Duration</div>
                 </div>
                 <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl">
                   <EyeIcon className="w-10 h-10 text-green-500 mx-auto mb-3" />
                   <div className="text-2xl font-bold text-gray-900">HD</div>
                   <div className="text-sm text-gray-600">Quality</div>
                 </div>
                 <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl">
                   <SparklesIcon className="w-10 h-10 text-purple-500 mx-auto mb-3" />
                   <div className="text-2xl font-bold text-gray-900">Veo 3.0</div>
                   <div className="text-sm text-gray-600">Google AI</div>
                 </div>
                 <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl">
                   <FilmIcon className="w-10 h-10 text-orange-500 mx-auto mb-3" />
                   <div className="text-2xl font-bold text-gray-900">
                     {(generatedVideo.file_size / (1024 * 1024)).toFixed(1)}MB
                   </div>
                   <div className="text-sm text-gray-600">File Size</div>
                 </div>
               </div>

               {/* Action Buttons */}
               <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                 <motion.button
                   onClick={downloadVideo}
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-2xl font-semibold flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transition-all duration-300"
                 >
                   <ArrowDownTrayIcon className="w-6 h-6" />
                   <span>Download Video</span>
                 </motion.button>
                 
                 <motion.button 
                   onClick={() => {
                     if (navigator.share) {
                       navigator.share({
                         title: generatedVideo.title,
                         url: generatedVideo.url
                       });
                     } else {
                       navigator.clipboard.writeText(generatedVideo.url);
                       toast.success('Video link copied to clipboard!');
                     }
                   }}
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   className="bg-white border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-2xl font-semibold flex items-center justify-center space-x-3 hover:border-purple-400 hover:text-purple-600 transition-all duration-300"
                 >
                   <ShareIcon className="w-6 h-6" />
                   <span>Share Video</span>
                 </motion.button>
                 
                 <motion.button
                   onClick={startOver}
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-8 py-4 rounded-2xl font-semibold flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transition-all duration-300"
                 >
                   <PlusIcon className="w-6 h-6" />
                   <span>Create Another</span>
                 </motion.button>
               </div>
             </div>

             {/* AI Story Concept */}
             <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
               <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-3">
                 <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                   <SparklesIcon className="w-6 h-6 text-white" />
                 </div>
                 <span>AI Story Concept</span>
               </h3>
               <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-8 border border-gray-200">
                 <p className="text-gray-700 leading-relaxed italic text-lg">
                   "{generatedVideo.story_script}"
                 </p>
               </div>
               <div className="mt-4 text-center">
                 <p className="text-sm text-gray-500">
                   Generated by Google Veo 3.0 based on your listing details{uploadedImages.length > 0 && ` and ${uploadedImages.length} uploaded image${uploadedImages.length > 1 ? 's' : ''}`}
                 </p>
               </div>
             </div>

             {/* Usage Guide */}
             <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
               <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
                 Maximize Your Video's Impact
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-200">
                   <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center space-x-2">
                     <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                       <ShareIcon className="w-4 h-4 text-white" />
                     </div>
                     <span>Marketing Strategies</span>
                   </h4>
                   <ul className="space-y-3 text-gray-700">
                     <li className="flex items-start space-x-3">
                       <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                       <span>Share on social media platforms for maximum reach</span>
                     </li>
                     <li className="flex items-start space-x-3">
                       <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                       <span>Add to your listing description as a featured video</span>
                     </li>
                     <li className="flex items-start space-x-3">
                       <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                       <span>Use in email marketing campaigns</span>
                     </li>
                     <li className="flex items-start space-x-3">
                       <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                       <span>Include in travel blog partnerships</span>
                     </li>
                   </ul>
                 </div>
                 
                 <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-6 border border-green-200">
                   <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center space-x-2">
                     <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                       <CheckCircleIcon className="w-4 h-4 text-white" />
                     </div>
                     <span>Best Practices</span>
                   </h4>
                   <ul className="space-y-3 text-gray-700">
                     <li className="flex items-start space-x-3">
                       <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                       <span>Add captions in multiple languages for global appeal</span>
                     </li>
                     <li className="flex items-start space-x-3">
                       <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                       <span>Include booking contact information in descriptions</span>
                     </li>
                     <li className="flex items-start space-x-3">
                       <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                       <span>Link directly to your listing page</span>
                     </li>
                     <li className="flex items-start space-x-3">
                       <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                       <span>Update regularly with seasonal content</span>
                     </li>
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
             className="bg-white rounded-3xl shadow-xl p-12 text-center border border-red-200"
           >
             <ExclamationCircleIcon className="w-20 h-20 text-red-500 mx-auto mb-6" />
             <h2 className="text-3xl font-bold text-gray-900 mb-6">
               Generation Temporarily Unavailable
             </h2>
             <p className="text-gray-600 mb-8 max-w-2xl mx-auto text-lg">
               We encountered an issue while generating your village story. This can happen due to high demand or technical issues. 
               Please try again in a few moments.
             </p>
             <div className="flex flex-col sm:flex-row gap-4 justify-center">
               <motion.button
                 onClick={generateVillageStory}
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
               >
                 Try Again
               </motion.button>
               <motion.button
                 onClick={startOver}
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 className="bg-white border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-2xl font-semibold hover:border-purple-400 hover:text-purple-600 transition-all duration-300"
               >
                 Start Over
               </motion.button>
             </div>
           </motion.div>
         )}
       </div>

       {/* Feature Highlights */}
       <motion.div 
         initial={{ opacity: 0, y: 40 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.5 }}
         className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8"
       >
         <div className="bg-white rounded-3xl shadow-xl p-8 text-center border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
           <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
             <SparklesIcon className="w-8 h-8 text-white" />
           </div>
           <h3 className="text-xl font-bold text-gray-900 mb-4">Google Veo 3.0 AI</h3>
           <p className="text-gray-600 leading-relaxed">
             Cutting-edge AI video generation technology that creates professional cinematic content with unmatched quality and authenticity.
           </p>
         </div>

         <div className="bg-white rounded-3xl shadow-xl p-8 text-center border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
           <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
             <VideoCameraIcon className="w-8 h-8 text-white" />
           </div>
           <h3 className="text-xl font-bold text-gray-900 mb-4">Cinematic Quality</h3>
           <p className="text-gray-600 leading-relaxed">
             High-definition videos with smooth transitions, perfect lighting, and authentic storytelling that captivates your audience.
           </p>
         </div>

         <div className="bg-white rounded-3xl shadow-xl p-8 text-center border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
           <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
             <ShareIcon className="w-8 h-8 text-white" />
           </div>
           <h3 className="text-xl font-bold text-gray-900 mb-4">Ready to Share</h3>
           <p className="text-gray-600 leading-relaxed">
             Download and share your village story across all marketing channels instantly. Perfect for social media, websites, and promotions.
           </p>
         </div>
       </motion.div>
     </div>
   </div>
 );
};

export default VillageStoriesPage;