// villagestay-frontend/src/app/listings/[id]/page.js

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  StarIcon,
  MapPinIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  ShareIcon,
  HeartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  SparklesIcon,
  VideoCameraIcon,
  PlayIcon,
  EyeIcon,
  ClockIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import PaymentModal from '@/components/payment/PaymentModal';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import Providers from '@/components/providers/Providers';
import AppLayout from '@/components/layout/AppLayout';
import { listingsAPI, bookingsAPI, impactAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, getImagePlaceholder, calculateNights, getAmenityIcon } from '@/lib/utils';
import toast from 'react-hot-toast';
import ReviewsList from '@/components/reviews/ReviewsList';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const ListingDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isTourist } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [sustainabilityScore, setSustainabilityScore] = useState(null);
  const [listingVideos, setListingVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [bookingData, setBookingData] = useState({
    check_in: '',
    check_out: '',
    guests: 1,
    special_requests: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);

  useEffect(() => {
    if (params.id) {
      fetchListing();
      fetchSustainabilityScore();
    }
  }, [params.id]);

  const fetchListing = async () => {
    try {
      console.log('🔍 Fetching listing:', params.id);
      const response = await listingsAPI.getById(params.id);
      const listingData = response.data;
      console.log('📋 Listing data received:', listingData);
      
      setListing(listingData);
      
      // Set videos from listing data
      if (listingData.village_story_videos && listingData.village_story_videos.length > 0) {
        console.log('🎬 Found videos:', listingData.village_story_videos.length);
        setListingVideos(listingData.village_story_videos);
      } else {
        console.log('🎬 No videos found for this listing');
        setListingVideos([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch listing:', error);
      toast.error('Failed to load listing details');
      router.push('/listings');
    } finally {
      setLoading(false);
    }
  };

  const fetchSustainabilityScore = async () => {
    try {
      const response = await impactAPI.getSustainabilityScore(params.id);
      setSustainabilityScore(response.data);
    } catch (error) {
      console.error('Failed to fetch sustainability score:', error);
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please login to make a booking');
      router.push('/auth/login');
      return;
    }

    if (!isTourist) {
      toast.error('Only tourists can make bookings');
      return;
    }

    setBookingLoading(true);
    try {
      const response = await bookingsAPI.create({
        listing_id: params.id,
        ...bookingData
      });

      const nights = calculateNights(bookingData.check_in, bookingData.check_out);
      const baseAmount = listing.price_per_night * nights;
      const platformFee = baseAmount * 0.05;
      const totalAmount = baseAmount + platformFee;

      setPendingBooking({
        booking_id: response.data.booking_id,
        listing_title: listing.title,
        check_in: bookingData.check_in,
        check_out: bookingData.check_out,
        guests: bookingData.guests,
        nights: nights,
        base_amount: baseAmount,
        platform_fee: platformFee,
        total_amount: totalAmount,
        booking_reference: response.data.booking_reference
      });
      setShowPaymentModal(true);

    } catch (error) {
      const message = error.response?.data?.error || 'Failed to create booking';
      toast.error(message);
    } finally {
      setBookingLoading(false);
    }
  };

 const handlePaymentSuccess = async (paymentDetails) => {
  try {
    console.log('💳 Completing payment for booking:', pendingBooking.booking_id);
    console.log('💳 Payment details:', paymentDetails);
    
    // Try multiple endpoints for backward compatibility
    let response;
    let success = false;
    
    const endpoints = [
      'complete-payment',
      'confirm-payment', 
      'confirm'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Trying endpoint: ${endpoint}`);
        
        response = await bookingsAPI.completePayment(pendingBooking.booking_id, {
          payment_method: paymentDetails.method,
          payment_signature: paymentDetails.signature,
          transaction_id: paymentDetails.transaction_id,
          upi_id: paymentDetails.upi_id,
          card_last_four: paymentDetails.card_last_four
        });
        
        console.log('✅ Payment completed successfully');
        success = true;
        break;
        
      } catch (endpointError) {
        console.log(`❌ Endpoint ${endpoint} failed:`, endpointError.response?.status);
        
        if (endpointError.response?.status === 404) {
          continue; // Try next endpoint
        } else {
          throw endpointError; // Other errors should be thrown
        }
      }
    }
    
    if (!success) {
      throw new Error('All payment endpoints failed');
    }
    
    console.log('📄 Payment completion response:', response);
    
    setShowPaymentModal(false);
    setPendingBooking(null);
    
    toast.success('Booking confirmed! Redirecting to booking details...');
    
    setTimeout(() => {
      router.push(`/bookings/${pendingBooking.booking_id}`);
    }, 1500);
    
  } catch (error) {
    console.error('💥 Payment completion error:', error);
    console.error('📋 Error details:', error.response?.data);
    
    // Enhanced error handling
    if (error.response?.status === 404) {
      toast.error('Booking not found. Please try again.');
    } else if (error.response?.status === 400) {
      const errorMessage = error.response?.data?.error || 'Payment verification failed';
      toast.error(errorMessage);
    } else if (error.response?.status === 403) {
      toast.error('You are not authorized to complete this payment.');
    } else if (error.code === 'ERR_NETWORK') {
      toast.error('Network error. Please check your connection and try again.');
    } else {
      const errorMessage = error.response?.data?.error || 'Failed to confirm booking';
      toast.error(`${errorMessage}. Please contact support.`);
    }
  }
};

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: listing.title,
        text: listing.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === listing.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? listing.images.length - 1 : prev - 1
    );
  };

  const nextVideo = () => {
    setCurrentVideoIndex((prev) => 
      prev === listingVideos.length - 1 ? 0 : prev + 1
    );
    setVideoError(false); // Reset video error when changing videos
  };

  const prevVideo = () => {
    setCurrentVideoIndex((prev) => 
      prev === 0 ? listingVideos.length - 1 : prev - 1
    );
    setVideoError(false); // Reset video error when changing videos
  };

  const calculateTotal = () => {
    if (!bookingData.check_in || !bookingData.check_out) return 0;
    const nights = calculateNights(bookingData.check_in, bookingData.check_out);
    const baseAmount = listing.price_per_night * nights;
    const platformFee = baseAmount * 0.05;
    return baseAmount + platformFee;
  };

  const downloadVideo = (video) => {
    try {
      const link = document.createElement('a');
      link.href = `${API_BASE_URL}${video.download_url}`;
      link.download = `village_story_${listing.title.replace(/\s+/g, '_')}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download video');
    }
  };

  const handleVideoError = (e, video, fallbackAttempted = false) => {
    console.error('Video load error:', e);
    
    if (!fallbackAttempted) {
      console.log('Attempting fallback URL...');
      // Try direct URL without /stream
      const fallbackUrl = `${API_BASE_URL}${video.video_url}`;
      e.target.src = fallbackUrl;
      e.target.dataset.fallbackAttempted = 'true';
    } else {
      console.error('All video URLs failed');
      setVideoError(true);
      toast.error('Failed to load video. Please refresh the page.');
    }
  };

  const getVideoSource = (video) => {
    // Primary: Stream URL for better performance
    const streamUrl = `${API_BASE_URL}${video.video_url}/stream`;
    // Fallback: Direct URL
    const directUrl = `${API_BASE_URL}${video.video_url}`;
    
    return { streamUrl, directUrl };
  };

  if (loading) {
    return (
      <Providers>
        <AppLayout>
          <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
            <div className="text-center">
              <div className="spinner spinner-lg mx-auto mb-4"></div>
              <p className="text-gray-600">Loading village details...</p>
            </div>
          </div>
        </AppLayout>
      </Providers>
    );
  }

  if (!listing) {
    return (
      <Providers>
        <AppLayout>
          <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Village not found</h2>
              <Link href="/listings" className="btn-primary">
                Browse Other Villages
              </Link>
            </div>
          </div>
        </AppLayout>
      </Providers>
    );
  }

  const images = listing.images?.length > 0 ? listing.images : [getImagePlaceholder(800, 600, listing.title)];
  const currentVideo = listingVideos[currentVideoIndex];

  return (
    <Providers>
      <AppLayout>
        <div className="min-h-screen village-bg pt-20">
          {/* Back Button */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <ChevronLeftIcon className="w-5 h-5" />
              <span>Back to listings</span>
            </button>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                    {listing.title}
                  </h1>
                  <div className="flex items-center space-x-4 text-gray-600 flex-wrap">
                    <div className="flex items-center space-x-1">
                      <StarIcon className="w-5 h-5 text-yellow-400" />
                      <span className="font-medium">{listing.rating || '4.8'}</span>
                      <span>({listing.review_count || 24} reviews)</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPinIcon className="w-5 h-5" />
                      <span>{listing.location}</span>
                    </div>
                    {sustainabilityScore && (
                      <div className="flex items-center space-x-1">
                        <SparklesIcon className="w-5 h-5 text-green-500" />
                        <span className="text-green-600 font-medium">
                          Sustainability: {sustainabilityScore.grade}
                        </span>
                      </div>
                    )}
                    {listingVideos.length > 0 && (
                      <div className="flex items-center space-x-1">
                        <VideoCameraIcon className="w-5 h-5 text-blue-500" />
                        <span className="text-blue-600 font-medium">
                          {listingVideos.length} AI Video{listingVideos.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleShare}
                    className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow duration-200"
                  >
                    <ShareIcon className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={toggleFavorite}
                    className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow duration-200"
                  >
                    {isFavorite ? (
                      <HeartSolidIcon className="w-5 h-5 text-red-500" />
                    ) : (
                      <HeartIcon className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Village Story Videos Section */}
            {listingVideos.length > 0 && (
              <div className="mb-8">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <VideoCameraIcon className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">Village Story Videos</h3>
                        <p className="text-gray-600">AI-generated cinematic experiences showcasing authentic village life</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="bg-gradient-to-r from-blue-100 to-purple-100 text-purple-800 text-sm font-medium px-4 py-2 rounded-full">
                        Google Veo 3.0 AI
                      </span>
                      <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-2 rounded-full">
                        {listingVideos.length} Video{listingVideos.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  
                  {/* Video Player */}
                  <div className="relative rounded-3xl overflow-hidden bg-gray-900 mb-6 shadow-2xl">
                    {!videoError && currentVideo ? (
                      <video
                        controls
                        className="w-full h-64 md:h-[500px] object-cover"
                        key={`${currentVideo.video_id}-${currentVideoIndex}`}
                        crossOrigin="anonymous"
                        onError={(e) => {
                          const fallbackAttempted = e.target.dataset.fallbackAttempted === 'true';
                          handleVideoError(e, currentVideo, fallbackAttempted);
                        }}
                        onLoadStart={() => {
                          console.log('🎬 Loading video:', currentVideo.video_id);
                        }}
                        onCanPlay={() => {
                          console.log('✅ Video ready to play');
                          setVideoError(false);
                        }}
                      >
                        <source 
                          src={getVideoSource(currentVideo).streamUrl}
                          type="video/mp4" 
                        />
                        <source 
                          src={getVideoSource(currentVideo).directUrl} 
                          type="video/mp4" 
                        />
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <div className="w-full h-64 md:h-[500px] bg-gray-800 flex items-center justify-center">
                        <div className="text-center text-white">
                          <VideoCameraIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-semibold mb-2">Video Unavailable</p>
                          <p className="text-gray-300">Unable to load the video at this time</p>
                          <button
                            onClick={() => {
                              setVideoError(false);
                              setCurrentVideoIndex(currentVideoIndex); // Force re-render
                            }}
                            className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium transition-colors"
                          >
                            Try Again
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Video Navigation */}
                    {listingVideos.length > 1 && (
                      <>
                        <button
                          onClick={prevVideo}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors duration-200"
                        >
                          <ChevronLeftIcon className="w-6 h-6" />
                        </button>
                        <button
                          onClick={nextVideo}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors duration-200"
                        >
                          <ChevronRightIcon className="w-6 h-6" />
                        </button>
                        
                        {/* Video Dots */}
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                          {listingVideos.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                setCurrentVideoIndex(index);
                                setVideoError(false);
                              }}
                              className={`w-3 h-3 rounded-full transition-colors duration-200 ${
                                index === currentVideoIndex ? 'bg-white' : 'bg-white/50'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                    
                    {/* Video Info Overlay */}
                    {currentVideo && (
                      <>
                        <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-lg text-sm">
                          {currentVideo.duration}s
                        </div>
                        
                        {listingVideos.length > 1 && (
                          <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-lg text-sm">
                            Video {currentVideoIndex + 1} of {listingVideos.length}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  
                  {/* Video Stats */}
                  {/* {currentVideo && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl">
                        <ClockIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                        <div className="text-lg font-bold text-gray-900">
                          {currentVideo.duration}s
                        </div>
                        <div className="text-sm text-gray-600">Duration</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl">
                        <EyeIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <div className="text-lg font-bold text-gray-900">HD Quality</div>
                        <div className="text-sm text-gray-600">AI Generated</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl">
                        <SparklesIcon className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                        <div className="text-lg font-bold text-gray-900">Veo 3.0</div>
                        <div className="text-sm text-gray-600">Google AI</div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl">
                        <VideoCameraIcon className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                        <div className="text-lg font-bold text-gray-900">
                          {new Date(currentVideo.generated_at).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-600">Generated</div>
                      </div>
                    </div>
                  )} */}

                  {/* Download Button */}
                  {/* {currentVideo && (
                    <div className="text-center mb-6">
                      <button
                        onClick={() => downloadVideo(currentVideo)}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-2xl font-semibold flex items-center space-x-2 mx-auto hover:shadow-lg transition-all duration-300"
                      >
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        <span>Download This Video</span>
                      </button>
                    </div>
                  )} */}
                  
                  {/* Video Thumbnails */}
                  {listingVideos.length > 1 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {listingVideos.map((video, index) => (
                        <button
                          key={video.video_id}
                          onClick={() => {
                            setCurrentVideoIndex(index);
                            setVideoError(false);
                          }}
                          className={`relative rounded-xl overflow-hidden hover:opacity-80 transition-opacity duration-200 ${
                            index === currentVideoIndex ? 'ring-4 ring-blue-500' : ''
                          }`}
                        >
                          <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                            <div className="w-full h-20 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                              <PlayIcon className="w-6 h-6 text-white" />
                            </div>
                          </div>
                          <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {video.duration}s
                          </div>
                          <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            #{index + 1}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-6 text-center">
                    <p className="text-gray-600">
                      Experience the authentic village story created with cutting-edge Google Veo 3.0 AI technology
                    </p>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Images Gallery */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
              <div className="lg:col-span-3">
                <div className="relative rounded-2xl overflow-hidden group">
                  <img
                    src={images[currentImageIndex]}
                    alt={listing.title}
                    className="w-full h-96 lg:h-[500px] object-cover"
                    onError={(e) => {
                      e.target.src = getImagePlaceholder(800, 500, listing.title);
                    }}
                  />
                  
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        <ChevronLeftIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        <ChevronRightIcon className="w-5 h-5" />
                      </button>
                      
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                        {images.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                              index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {images.length > 1 && (
                <div className="lg:col-span-1 hidden lg:block">
                  <div className="grid grid-cols-1 gap-4 h-[500px] overflow-y-auto">
                    {images.slice(1, 5).map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index + 1)}
                        className="rounded-xl overflow-hidden hover:opacity-80 transition-opacity duration-200"
                      >
                        <img
                          src={image}
                          alt={`${listing.title} ${index + 2}`}
                          className="w-full h-24 object-cover"
                          onError={(e) => {
                            e.target.src = getImagePlaceholder(200, 100, listing.title);
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Property Info */}
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 capitalize">
                        {listing.property_type?.replace('_', ' ')} hosted by {listing.host?.full_name}
                      </h2>
                      <p className="text-gray-600">
                        Up to {listing.max_guests} guests
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">
                        {listing.host?.full_name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">{listing.description}</p>
                  </div>
                </div>

                {/* Amenities */}
                {listing.amenities?.length > 0 && (
                  <div className="card p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">What this place offers</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {listing.amenities.map((amenity, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <span className="text-2xl">{getAmenityIcon(amenity)}</span>
                          <span className="text-gray-700">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sustainability Features */}
                {listing.sustainability_features?.length > 0 && (
                  <div className="card p-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <SparklesIcon className="w-6 h-6 text-green-500" />
                      <h3 className="text-xl font-semibold text-gray-900">Sustainability Features</h3>
                      {sustainabilityScore && (
                        <span className="bg-green-100 text-green-800 text-sm font-medium px-2 py-1 rounded-full">
                          Grade {sustainabilityScore.grade}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {listing.sustainability_features.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <CheckIcon className="w-5 h-5 text-green-500" />
                          <span className="text-gray-700 capitalize">{feature.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* House Rules */}
                {listing.house_rules?.length > 0 && (
                  <div className="card p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">House Rules</h3>
                    <div className="space-y-2">
                      {listing.house_rules.map((rule, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <ShieldCheckIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                          <span className="text-gray-700">{rule}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experiences */}
                {listing.experiences?.length > 0 && (
                  <div className="card p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Local Experiences</h3>
                    <div className="space-y-4">
                      {listing.experiences.map((experience, index) => (
                        <div key={index} className="border border-gray-200 rounded-xl p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-1">{experience.title}</h4>
                              <p className="text-gray-600 text-sm mb-2">{experience.description}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span>Duration: {experience.duration}h</span>
                                <span>Max: {experience.max_participants} people</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">
                                {formatCurrency(experience.price)}
                              </div>
                              <div className="text-sm text-gray-500">per person</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviews */}
                <div className="mt-12">
                  <ReviewsList 
                    listingId={listing.id} 
                    canRespond={user?.id === listing.host?.id}
                    hostId={listing.host?.id}
                  />
                </div>
              </div>

              {/* Booking Card */}
              <div className="lg:col-span-1">
                <div className="sticky top-24">
                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency(listing.price_per_night)}
                          <span className="text-lg font-normal text-gray-500">/night</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <StarIcon className="w-5 h-5 text-yellow-400" />
                        <span className="font-medium">{listing.rating || '4.8'}</span>
                      </div>
                    </div>

                    <form onSubmit={handleBooking} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Check-in
                          </label>
                          <input
                            type="date"
                            required
                            value={bookingData.check_in}
                            onChange={(e) => setBookingData(prev => ({ ...prev, check_in: e.target.value }))}
                            min={new Date().toISOString().split('T')[0]}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Check-out
                          </label>
                          <input
                            type="date"
                            required
                            value={bookingData.check_out}
                            onChange={(e) => setBookingData(prev => ({ ...prev, check_out: e.target.value }))}
                            min={bookingData.check_in || new Date().toISOString().split('T')[0]}
                            className="input-field"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Guests
                        </label>
                        <select
                          value={bookingData.guests}
                          onChange={(e) => setBookingData(prev => ({ ...prev, guests: parseInt(e.target.value) }))}
                          className="input-field"
                        >
                          {[...Array(listing.max_guests)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {i + 1} guest{i > 0 ? 's' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Special Requests (Optional)
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Any special requests or dietary requirements?"
                          value={bookingData.special_requests}
                          onChange={(e) => setBookingData(prev => ({ ...prev, special_requests: e.target.value }))}
                          className="input-field resize-none"
                        />
                      </div>

                      {bookingData.check_in && bookingData.check_out && (
                        <div className="border-t border-gray-200 pt-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{formatCurrency(listing.price_per_night)} × {calculateNights(bookingData.check_in, bookingData.check_out)} nights</span>
                            <span>{formatCurrency(listing.price_per_night * calculateNights(bookingData.check_in, bookingData.check_out))}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Platform fee</span>
                            <span>{formatCurrency(listing.price_per_night * calculateNights(bookingData.check_in, bookingData.check_out) * 0.05)}</span>
                          </div>
                          <div className="flex justify-between font-semibold text-lg border-t border-gray-200 pt-2">
                            <span>Total</span>
                            <span>{formatCurrency(calculateTotal())}</span>
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={bookingLoading || !isAuthenticated}
                        className="btn-primary w-full"
                      >
                        {bookingLoading ? (
                          <div className="flex items-center justify-center">
                            <div className="spinner mr-2"></div>
                            Processing...
                          </div>
                        ) : !isAuthenticated ? (
                          'Login to Book'
                        ) : (
                          'Reserve Now'
                        )}
                      </button>

                      {!isAuthenticated && (
                        <p className="text-center text-sm text-gray-500">
                          <Link href="/auth/login" className="text-green-600 hover:text-green-700">
                            Sign in
                          </Link> to make a booking
                        </p>
                      )}
                    </form>

                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-500">You won't be charged yet</p>
                    </div>
                  </div>

                  {/* Contact Host */}
                  <div className="card p-6 mt-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">
                          {listing.host?.full_name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{listing.host?.full_name}</h4>
                        <p className="text-sm text-gray-600">Host since {new Date(listing.host?.created_at).getFullYear()}</p>
                      </div>
                    </div>
                    <button className="btn-secondary w-full flex items-center justify-center space-x-2">
                      <ChatBubbleLeftRightIcon className="w-5 h-5" />
                      <span>Contact Host</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {showPaymentModal && pendingBooking && (
          <PaymentModal
            booking={pendingBooking}
            onClose={() => {
              setShowPaymentModal(false);
              setPendingBooking(null);
            }}
            onSuccess={handlePaymentSuccess}
          />
        )}
      </AppLayout>
    </Providers>
  );
};

export default ListingDetailPage;