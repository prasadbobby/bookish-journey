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
  ArrowDownTrayIcon,
  AcademicCapIcon,
  CurrencyRupeeIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import PaymentModal from '@/components/payment/PaymentModal';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { experiencesAPI, bookingsAPI, impactAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, getImagePlaceholder } from '@/lib/utils';
import toast from 'react-hot-toast';
import ReviewsList from '@/components/reviews/ReviewsList';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const ExperienceDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isTourist } = useAuth();
  const [experience, setExperience] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [sustainabilityScore, setSustainabilityScore] = useState(null);
  const [experienceVideos, setExperienceVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [bookingData, setBookingData] = useState({
    experience_date: '',
    experience_time: '10:00',
    participants: 1,
    special_requests: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);

  useEffect(() => {
    if (params.id) {
      fetchExperience();
      fetchSustainabilityScore();
    }
  }, [params.id]);

  const fetchExperience = async () => {
    try {
      console.log('🔍 Fetching experience:', params.id);
      const response = await experiencesAPI.getById(params.id);
      const experienceData = response.data;
      console.log('📋 Experience data received:', experienceData);
      
      setExperience(experienceData);
      
      // Set videos from experience data
      if (experienceData.village_story_videos && experienceData.village_story_videos.length > 0) {
        console.log('🎬 Found videos:', experienceData.village_story_videos.length);
        setExperienceVideos(experienceData.village_story_videos);
      } else {
        console.log('🎬 No videos found for this experience');
        setExperienceVideos([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch experience:', error);
      toast.error('Failed to load experience details');
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
        listing_type: 'experience',
        ...bookingData
      });

      const baseAmount = experience.price_per_person * bookingData.participants;
      const platformFee = baseAmount * 0.05;
      const communityFee = baseAmount * 0.02;
      const totalAmount = baseAmount + platformFee + communityFee;

      setPendingBooking({
        booking_id: response.data.booking_id,
        listing_title: experience.title,
        experience_date: bookingData.experience_date,
        experience_time: bookingData.experience_time,
        participants: bookingData.participants,
        duration: experience.duration,
        base_amount: baseAmount,
        platform_fee: platformFee,
        community_contribution: communityFee,
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
    
    // Use the enhanced API method with fallback endpoints
    const response = await bookingsAPI.completePayment(pendingBooking.booking_id, {
      payment_method: paymentDetails.method,
      payment_signature: paymentDetails.signature,
      transaction_id: paymentDetails.transaction_id,
      upi_id: paymentDetails.upi_id,
      card_last_four: paymentDetails.card_last_four
    });
    
    console.log('📄 Payment completion response:', response);
    
    setShowPaymentModal(false);
    setPendingBooking(null);
    
    toast.success('Experience booked successfully! Redirecting to booking details...');
    
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
        title: experience.title,
        text: experience.description,
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
      prev === experience.images.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? experience.images.length - 1 : prev - 1
    );
  };

  const nextVideo = () => {
    setCurrentVideoIndex((prev) => 
      prev === experienceVideos.length - 1 ? 0 : prev + 1
    );
    setVideoError(false);
  };

  const prevVideo = () => {
    setCurrentVideoIndex((prev) => 
      prev === 0 ? experienceVideos.length - 1 : prev - 1
    );
    setVideoError(false);
  };

  const calculateTotal = () => {
    if (!bookingData.participants) return 0;
    const baseAmount = experience.price_per_person * bookingData.participants;
    const platformFee = baseAmount * 0.05;
    const communityFee = baseAmount * 0.02;
    return baseAmount + platformFee + communityFee;
  };

  const downloadVideo = (video) => {
    try {
      const link = document.createElement('a');
      link.href = `${API_BASE_URL}${video.download_url}`;
      link.download = `experience_story_${experience.title.replace(/\s+/g, '_')}.mp4`;
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
    const streamUrl = `${API_BASE_URL}${video.video_url}/stream`;
    const directUrl = `${API_BASE_URL}${video.video_url}`;
    
    return { streamUrl, directUrl };
  };

  const getDifficultyColor = (level) => {
    switch (level) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'challenging': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      cultural: '🎭',
      culinary: '🍛',
      farming: '🌾',
      craft: '🎨',
      spiritual: '🙏',
      adventure: '🏔️',
      wellness: '🧘',
      nature: '🌳'
    };
    return icons[category] || '✨';
  };

  const getAvailableTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  if (loading) {
    return (
      <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner spinner-lg mx-auto mb-4"></div>
          <p className="text-gray-600">Loading experience details...</p>
        </div>
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="min-h-screen village-bg pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Experience not found</h2>
          <Link href="/listings" className="btn-primary">
            Browse Other Experiences
          </Link>
        </div>
      </div>
    );
  }

  const images = experience.images?.length > 0 ? experience.images : [getImagePlaceholder(800, 600, experience.title)];
  const currentVideo = experienceVideos[currentVideoIndex];

  return (
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
                {experience.title}
              </h1>
              <div className="flex items-center space-x-4 text-gray-600 flex-wrap">
                <div className="flex items-center space-x-1">
                  <StarIcon className="w-5 h-5 text-yellow-400" />
                  <span className="font-medium">{experience.rating || '4.8'}</span>
                  <span>({experience.review_count || 24} reviews)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MapPinIcon className="w-5 h-5" />
                  <span>{experience.location}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <AcademicCapIcon className="w-5 h-5 text-purple-500" />
                  <span className="capitalize">{experience.category}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <ClockIcon className="w-5 h-5" />
                  <span>{experience.duration} hours</span>
                </div>
                {sustainabilityScore && (
                  <div className="flex items-center space-x-1">
                    <SparklesIcon className="w-5 h-5 text-green-500" />
                    <span className="text-green-600 font-medium">
                      Sustainability: {sustainabilityScore.grade}
                    </span>
                  </div>
                )}
                {experienceVideos.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <VideoCameraIcon className="w-5 h-5 text-blue-500" />
                    <span className="text-blue-600 font-medium">
                      {experienceVideos.length} AI Video{experienceVideos.length > 1 ? 's' : ''}
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

        {/* Experience Story Videos Section */}
        {experienceVideos.length > 0 && (
          <div className="mb-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <VideoCameraIcon className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Experience Story Videos</h3>
                    <p className="text-gray-600">AI-generated cinematic experiences showcasing authentic cultural activities</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 text-sm font-medium px-4 py-2 rounded-full">
                    Google Veo 3.0 AI
                  </span>
                  <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-2 rounded-full">
                    {experienceVideos.length} Video{experienceVideos.length > 1 ? 's' : ''}
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
                          setCurrentVideoIndex(currentVideoIndex);
                        }}
                        className="mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white font-medium transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Video Navigation */}
                {experienceVideos.length > 1 && (
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
                      {experienceVideos.map((_, index) => (
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
                    
                    {experienceVideos.length > 1 && (
                      <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-lg text-sm">
                        Video {currentVideoIndex + 1} of {experienceVideos.length}
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {/* Video Thumbnails */}
              {experienceVideos.length > 1 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {experienceVideos.map((video, index) => (
                    <button
                      key={video.video_id}
                      onClick={() => {
                        setCurrentVideoIndex(index);
                        setVideoError(false);
                      }}
                      className={`relative rounded-xl overflow-hidden hover:opacity-80 transition-opacity duration-200 ${
                        index === currentVideoIndex ? 'ring-4 ring-purple-500' : ''
                      }`}
                    >
                      <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                        <div className="w-full h-20 bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
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
                  Experience the authentic cultural story created with cutting-edge Google Veo 3.0 AI technology
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
                alt={experience.title}
                className="w-full h-96 lg:h-[500px] object-cover"
                onError={(e) => {
                  e.target.src = getImagePlaceholder(800, 500, experience.title);
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
                      alt={`${experience.title} ${index + 2}`}
                      className="w-full h-24 object-cover"
                      onError={(e) => {
                        e.target.src = getImagePlaceholder(200, 100, experience.title);
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
            {/* Experience Info */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 capitalize">
                    {experience.category} experience hosted by {experience.host?.full_name}
                  </h2>
                  <p className="text-gray-600">
                    Duration: {experience.duration} hours • Up to {experience.max_participants} participants
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">
                    {experience.host?.full_name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed">{experience.description}</p>
              </div>
            </div>

            {/* What's Included */}
            {experience.inclusions?.length > 0 && (
              <div className="card p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">What's included</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {experience.inclusions.map((inclusion, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <CheckIcon className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700">{inclusion}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Experience Details */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Experience details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <AcademicCapIcon className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Category</p>
                      <p className="font-semibold text-gray-900 capitalize">{experience.category}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <ClockIcon className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Duration</p>
                      <p className="font-semibold text-gray-900">{experience.duration} hours</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <UsersIcon className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Group size</p>
                      <p className="font-semibold text-gray-900">Up to {experience.max_participants} people</p>
                    </div>
                  </div>
                  
                  {experience.difficulty_level && (
                    <div className="flex items-center space-x-3">
                      <SparklesIcon className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Difficulty</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(experience.difficulty_level)}`}>
                          {experience.difficulty_level}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sustainability Features */}
            {experience.sustainability_features?.length > 0 && (
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
                  {experience.sustainability_features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <CheckIcon className="w-5 h-5 text-green-500" />
                      <span className="text-gray-700 capitalize">{feature.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Guidelines */}
            {experience.guidelines?.length > 0 && (
              <div className="card p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Guidelines</h3>
                <div className="space-y-2">
                  {experience.guidelines.map((guideline, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <ShieldCheckIcon className="w-5 h-5 text-gray-500 mt-0.5" />
                      <span className="text-gray-700">{guideline}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="mt-12">
              <ReviewsList 
                listingId={experience.id} 
                canRespond={user?.id === experience.host?.id}
                hostId={experience.host?.id}
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
                      {formatCurrency(experience.price_per_person)}
                      <span className="text-lg font-normal text-gray-500">/person</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <StarIcon className="w-5 h-5 text-yellow-400" />
                    <span className="font-medium">{experience.rating || '4.8'}</span>
                  </div>
                </div>

                <form onSubmit={handleBooking} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        required
                        value={bookingData.experience_date}
                        onChange={(e) => setBookingData(prev => ({ ...prev, experience_date: e.target.value }))}
                        min={new Date().toISOString().split('T')[0]}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Time
                      </label>
                      <select
                        value={bookingData.experience_time}
                        onChange={(e) => setBookingData(prev => ({ ...prev, experience_time: e.target.value }))}
                        className="input-field"
                      >
                        {getAvailableTimeSlots().map(time => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Participants
                    </label>
                    <select
                      value={bookingData.participants}
                      onChange={(e) => setBookingData(prev => ({ ...prev, participants: parseInt(e.target.value) }))}
                      className="input-field"
                    >
                      {[...Array(experience.max_participants)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} participant{i > 0 ? 's' : ''}
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
                      placeholder="Any special requests or requirements?"
                      value={bookingData.special_requests}
                      onChange={(e) => setBookingData(prev => ({ ...prev, special_requests: e.target.value }))}
                      className="input-field resize-none"
                    />
                  </div>

                  {bookingData.participants && (
                    <div className="border-t border-gray-200 pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{formatCurrency(experience.price_per_person)} × {bookingData.participants} participants</span>
                        <span>{formatCurrency(experience.price_per_person * bookingData.participants)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Platform fee (5%)</span>
                        <span>{formatCurrency(experience.price_per_person * bookingData.participants * 0.05)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Community fund (2%)</span>
                        <span>{formatCurrency(experience.price_per_person * bookingData.participants * 0.02)}</span>
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
                      'Reserve Experience'
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
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">
                      {experience.host?.full_name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{experience.host?.full_name}</h4>
                    <p className="text-sm text-gray-600">Host since {new Date(experience.host?.created_at).getFullYear()}</p>
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
    </div>
  );
};

export default ExperienceDetailPage;