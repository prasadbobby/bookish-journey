'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MicrophoneIcon,
  StopIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  SparklesIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  XMarkIcon,
  PlusIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  CurrencyRupeeIcon,
  HomeIcon,
  UsersIcon,
  MapPinIcon,
  GlobeAltIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  SpeakerWaveIcon,
  CommandLineIcon,
  ChatBubbleBottomCenterTextIcon,
  LightBulbIcon,
  RocketLaunchIcon,
  EyeIcon,
  HeartIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { aiAPI, listingsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const VoiceListingPage = () => {
  const router = useRouter();
  const { user, isHost, isAuthenticated, loading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [transcription, setTranscription] = useState('');
  const [generatedListing, setGeneratedListing] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('hi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [customEdits, setCustomEdits] = useState({});
  const [recordingTime, setRecordingTime] = useState(0);
  const [accessChecked, setAccessChecked] = useState(false);
  const [images, setImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Location-related states
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [loadingLocationSuggestions, setLoadingLocationSuggestions] = useState(false);
  const [isSelectingLocationSuggestion, setIsSelectingLocationSuggestion] = useState(false);
  const [geocodingStatus, setGeocodingStatus] = useState(null);
  const [geocodedLocation, setGeocodedLocation] = useState('');
  const [coordinates, setCoordinates] = useState({ lat: 0, lng: 0 });
  
  const mediaRecorder = useRef(null);
  const audioRef = useRef(null);
  const recordingInterval = useRef(null);
  const stream = useRef(null);
  const locationInputRef = useRef(null);
  const locationSuggestionsRef = useRef(null);
  const locationSuggestionsTimeoutRef = useRef(null);

  useEffect(() => {
    if (!loading) {
      setAccessChecked(true);
      
      if (!isAuthenticated) {
        toast.error('Please login to access this feature');
        router.push('/auth/login');
        return;
      }

      if (!isHost) {
        toast.error('Only hosts can access voice listing feature');
        router.push('/');
        return;
      }

      initializeMediaRecorder();
    }
  }, [loading, isAuthenticated, isHost, router]);

  // Initialize media recorder
  const initializeMediaRecorder = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      stream.current = mediaStream;
      
      const options = {
        mimeType: 'audio/webm;codecs=opus'
      };
      
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/webm';
      }
      
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/mp4';
      }
      
      mediaRecorder.current = new MediaRecorder(mediaStream, options);
      
      const audioChunks = [];
      
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
        audioChunks.length = 0;
      };
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Please allow microphone access to use voice listing');
    }
  };

  // Recording functions
  const startRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'inactive') {
      setIsRecording(true);
      setRecordingTime(0);
      setAudioBlob(null);
      setAudioUrl(null);
      
      mediaRecorder.current.start();
      
      recordingInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      setIsRecording(false);
      mediaRecorder.current.stop();
      
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    }
  };

  const playAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const retryRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscription('');
    setGeneratedListing(null);
    setCurrentStep(1);
    setRecordingTime(0);
    setCustomEdits({});
    setImages([]);
    setGeocodingStatus(null);
    setGeocodedLocation('');
    setCoordinates({ lat: 0, lng: 0 });
  };

  // Location suggestion functions
  const fetchLocationSuggestions = async (query) => {
    if (query.length < 2) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }

    setLoadingLocationSuggestions(true);
    try {
      const response = await listingsAPI.getLocationSuggestions({ query, limit: 6 });
      setLocationSuggestions(response.data.suggestions || []);
      setShowLocationSuggestions(true);
    } catch (error) {
      console.error('Location suggestions error:', error);
      setLocationSuggestions([]);
    } finally {
      setLoadingLocationSuggestions(false);
    }
  };

  const handleLocationChange = (value) => {
    setCustomEdits(prev => ({ ...prev, location: value }));
    setIsSelectingLocationSuggestion(false);
    
    // Reset geocoding status
    setGeocodingStatus(null);
    setGeocodedLocation('');
    setCoordinates({ lat: 0, lng: 0 });
    
    // Clear previous timeout
    if (locationSuggestionsTimeoutRef.current) {
      clearTimeout(locationSuggestionsTimeoutRef.current);
    }
    
    // Set new timeout for suggestions
    locationSuggestionsTimeoutRef.current = setTimeout(() => {
      fetchLocationSuggestions(value);
    }, 300);
  };

  const handleLocationSuggestionSelect = async (suggestion) => {
    try {
      setIsSelectingLocationSuggestion(true);
      setLoadingLocationSuggestions(true);
      setShowLocationSuggestions(false);
      
      // Update input immediately
      setCustomEdits(prev => ({
        ...prev,
        location: suggestion.description
      }));
      
      // Get detailed place information
      const response = await listingsAPI.getPlaceDetails({ place_id: suggestion.place_id });
      
      if (response.data.success) {
        const placeDetails = response.data.place_details;
        
        setCustomEdits(prev => ({
          ...prev,
          location: placeDetails.formatted_address
        }));
        
        setGeocodedLocation(placeDetails.formatted_address);
        setCoordinates({
          lat: placeDetails.lat,
          lng: placeDetails.lng
        });
        setGeocodingStatus('success');
        
        toast.success('📍 Location selected successfully!');
      }
    } catch (error) {
      console.error('Place details error:', error);
      toast.error('Failed to get location details');
      setGeocodingStatus('error');
    } finally {
      setLoadingLocationSuggestions(false);
      setIsSelectingLocationSuggestion(false);
    }
  };

  const handleLocationFocus = () => {
    if (locationSuggestions.length > 0 && customEdits.location && customEdits.location.length > 1) {
      setShowLocationSuggestions(true);
    }
  };

  const handleLocationBlur = () => {
    setTimeout(() => {
      if (!isSelectingLocationSuggestion) {
        setShowLocationSuggestions(false);
      }
    }, 200);
  };

  // Click outside handler for location suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        locationSuggestionsRef.current && 
        !locationSuggestionsRef.current.contains(event.target) &&
        locationInputRef.current &&
        !locationInputRef.current.contains(event.target) &&
        !isSelectingLocationSuggestion
      ) {
        setShowLocationSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSelectingLocationSuggestion]);

  // Image upload functions
  const handleImageUpload = (files) => {
    if (!files || files.length === 0) return;
    
    setUploadingImages(true);
    
    Array.from(files).forEach((file, index) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max size is 5MB`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const newImage = {
          id: Date.now() + index,
          file,
          url: event.target.result,
          preview: event.target.result,
          name: file.name,
          size: file.size
        };
        
        setImages(prev => [...prev, newImage]);
      };
      
      reader.onerror = () => {
        toast.error(`Error reading ${file.name}`);
      };
      
      reader.readAsDataURL(file);
    });

    setTimeout(() => setUploadingImages(false), 1000);
  };

  const handleFileInputChange = (e) => {
    handleImageUpload(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleImageUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const removeImage = (imageId) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
  };

  // Process voice to listing
  const processVoiceToListing = async () => {
    if (!audioBlob) {
      toast.error('Please record audio first');
      return;
    }

    setIsProcessing(true);
    setCurrentStep(2);

    try {
      console.log('Processing audio blob:', audioBlob.size, 'bytes');
      
      const formData = new FormData();
      formData.append('audio_data', audioBlob, 'voice_recording.webm');
      formData.append('language', selectedLanguage);

      console.log('Sending voice data to backend...');
      
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/ai-features/voice-to-listing`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Voice processing response:', result);
      
      if (result.result?.processing_status === 'failed') {
        throw new Error(result.result.error || 'Voice processing failed');
      }
      
      const resultWithId = {
        ...result.result,
        processing_id: result.processing_id || result.result.processing_id
      };
      
      setTranscription(resultWithId.transcribed_text);
      setGeneratedListing(resultWithId);
      setCurrentStep(3);
      
      // Pre-populate custom edits with generated data
      const enhanced = resultWithId.enhanced_listing || {};
      setCustomEdits({
        title: enhanced.title || '',
        description: enhanced.description || '',
        property_type: enhanced.property_type || 'homestay',
        price_per_night: resultWithId.pricing_intelligence?.base_price_per_night || 2000,
        max_guests: enhanced.max_guests || 4,
        location: enhanced.location || user?.address || ''
      });
      
      console.log('✅ Processing completed, processing_id:', resultWithId.processing_id);
      toast.success('🎉 Voice successfully converted to listing!');
    } catch (error) {
      console.error('Voice processing failed:', error);
      const errorMessage = error.message || 'Failed to process voice';
      toast.error(errorMessage);
      setCurrentStep(1);
    } finally {
      setIsProcessing(false);
    }
  };

  // Create listing from voice
  const createListingFromVoice = async () => {
    if (!generatedListing) {
      toast.error('No voice data to create listing from');
      return;
    }

    if (!generatedListing.processing_id) {
      toast.error('Missing processing ID. Please try recording again.');
      return;
    }

    if (images.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    if (!customEdits.location) {
      toast.error('Please provide a location');
      return;
    }

    setIsProcessing(true);
    try {
      console.log('Creating listing with processing_id:', generatedListing.processing_id);
      console.log('Custom edits:', customEdits);
      
      const response = await aiAPI.createListingFromVoice({
        processing_id: generatedListing.processing_id,
        selected_language: 'en',
        custom_edits: {
          ...customEdits,
          images: images.map(img => img.url || img.preview),
          coordinates: coordinates.lat !== 0 && coordinates.lng !== 0 ? coordinates : { lat: 0, lng: 0 }
        }
      });

      toast.success('🎉 Listing created successfully!');
      router.push(`/host/listings`);
    } catch (error) {
      console.error('Failed to create listing:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create listing';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (stream.current) {
        stream.current.getTracks().forEach(track => track.stop());
      }
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      if (locationSuggestionsTimeoutRef.current) {
        clearTimeout(locationSuggestionsTimeoutRef.current);
      }
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const languages = [
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳', desc: 'Hindi', popular: true },
    { code: 'en', name: 'English', flag: '🇬🇧', desc: 'English', popular: true },
    { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳', desc: 'Gujarati', popular: false },
    { code: 'te', name: 'తెలుగు', flag: '🇮🇳', desc: 'Telugu', popular: false },
    { code: 'mr', name: 'मराठी', flag: '🇮🇳', desc: 'Marathi', popular: false },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳', desc: 'Tamil', popular: false },
  ];

  const processingSteps = [
    { text: 'Converting speech to text...', icon: '🎤', color: 'text-blue-500', bg: 'bg-blue-50' },
    { text: 'AI enhancing content...', icon: '🤖', color: 'text-purple-500', bg: 'bg-purple-50' },
    { text: 'Generating pricing...', icon: '💰', color: 'text-green-500', bg: 'bg-green-50' },
    { text: 'Creating translations...', icon: '🌍', color: 'text-orange-500', bg: 'bg-orange-50' },
  ];

  const propertyTypes = [
    { value: 'homestay', label: 'Homestay', icon: '🏠', desc: 'Stay with local family' },
    { value: 'farmstay', label: 'Farmstay', icon: '🚜', desc: 'Rural farm experience' },
    { value: 'heritage_home', label: 'Heritage Home', icon: '🏛️', desc: 'Traditional architecture' },
    { value: 'eco_lodge', label: 'Eco Lodge', icon: '🌿', desc: 'Sustainable accommodation' },
    { value: 'village_house', label: 'Village House', icon: '🏘️', desc: 'Independent village home' },
    { value: 'cottage', label: 'Cottage', icon: '🏡', desc: 'Cozy countryside cottage' }
  ];

  if (loading || !accessChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 pt-20 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-white/80 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-white/20"
        >
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
            <SparklesIcon className="w-8 h-8 text-purple-600 absolute top-6 left-1/2 transform -translate-x-1/2" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Initializing AI Voice Assistant</h3>
          <p className="text-gray-600 font-medium">Setting up microphone and AI services...</p>
        </motion.div>
      </div>
    );
  }

  if (!isAuthenticated || !isHost) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 pt-20">
      {/* Floating AI Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
        <div className="absolute bottom-40 left-20 w-4 h-4 bg-pink-400 rounded-full animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
        <div className="absolute top-60 left-1/3 w-1 h-1 bg-green-400 rounded-full animate-ping"></div>
        <div className="absolute bottom-60 right-1/3 w-1 h-1 bg-yellow-400 rounded-full animate-ping"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="relative inline-block mb-8">
            <motion.div 
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-24 h-24 bg-gradient-to-br from-purple-500 via-purple-600 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/30"
            >
              <MicrophoneIcon className="w-12 h-12 text-white" />
            </motion.div>
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center"
            >
              <SparklesIcon className="w-4 h-4 text-white" />
            </motion.div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
            AI Voice Listing Magic
          </h1>
          
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed mb-8">
            Speak about your property in your native language and watch our advanced AI transform it into a 
            <span className="font-semibold text-purple-600"> professional, multilingual listing</span> instantly
          </p>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20"
            >
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span>Real-time AI Processing</span>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20"
            >
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span>6+ Languages Supported</span>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20"
            >
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
              <span>Smart Location Detection</span>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20"
            >
              <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
              <span>Instant Publishing</span>
            </motion.div>
          </div>
        </motion.div>

        {/* Progress Steps */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2 md:space-x-6">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <motion.div 
                    animate={{ 
                      scale: currentStep === step ? [1, 1.1, 1] : 1,
                      boxShadow: currentStep === step ? [
                        '0 0 0 0 rgba(139, 92, 246, 0)',
                        '0 0 0 10px rgba(139, 92, 246, 0.1)',
                        '0 0 0 0 rgba(139, 92, 246, 0)'
                      ] : '0 0 0 0 rgba(139, 92, 246, 0)'
                    }}
                    transition={{ duration: 2, repeat: currentStep === step ? Infinity : 0 }}
                    className={`w-12 h-12 md:w-16 md:h-16 rounded-3xl flex items-center justify-center font-bold text-sm md:text-lg transition-all duration-500 ${
                      currentStep >= step 
                        ? 'bg-gradient-to-br from-purple-500 to-blue-600 text-white shadow-2xl shadow-purple-500/30 scale-110' 
                        : currentStep === step
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {currentStep > step ? (
                      <CheckIcon className="w-6 h-6 md:w-8 md:h-8" />
                    ) : (
                      step
                    )}
                  </motion.div>
                  {step < 4 && (
                    <motion.div 
                      animate={{ 
                        scaleX: currentStep > step ? 1 : 0.3
                      }}
                      transition={{ duration: 0.5 }}
                      className={`w-8 md:w-20 h-2 mx-1 md:mx-3 rounded-full transition-all duration-500 origin-left ${
                        currentStep > step ? 'bg-gradient-to-r from-purple-500 to-blue-600' : 'bg-gray-200'
                      }`} 
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-between mt-6 text-xs md:text-sm text-gray-600 max-w-2xl mx-auto">
            <span className="font-medium">🎤 Record</span>
            <span className="font-medium">🤖 Process</span>
            <span className="font-medium">✨ Review</span>
            <span className="font-medium">🚀 Publish</span>
          </div>
        </motion.div>

        <div className="space-y-8">
          <AnimatePresence mode="wait">
            {/* Step 1: Recording */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-white/90 backdrop-blur-2xl rounded-3xl p-8 md:p-16 shadow-2xl border border-white/30"
              >
                <div className="text-center mb-12">
                  <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl md:text-4xl font-bold text-gray-900 mb-6"
                  >
                    🎙️ Record Your Property Story
                  </motion.h2>
                  <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
                    Choose your language and describe your property naturally. Our AI will understand context, 
                    emotions, and create professional content that resonates with travelers.
                  </p>
                </div>

                {/* Language Selection */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mb-12"
                >
                  <h3 className="text-xl font-semibold text-gray-900 mb-8 text-center">
                    🌍 Select your preferred language
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
                    {languages.map((lang) => (
                      <motion.button
                        key={lang.code}
                        whileHover={{ scale: 1.05, y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedLanguage(lang.code)}
                        className={`relative p-6 rounded-2xl border-2 transition-all duration-300 group ${
                          selectedLanguage === lang.code
                            ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-blue-50 shadow-xl shadow-purple-500/20'
                            : 'border-gray-200 hover:border-purple-300 hover:shadow-lg bg-white'
                        }`}
                      >
                        {lang.popular && (
                          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-400 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                            Popular
                          </div>
                        )}
                        <div className="text-center">
                          <div className="text-3xl mb-3">{lang.flag}</div>
                          <div className="font-bold text-gray-900 text-lg mb-1">{lang.name}</div>
                          <div className="text-sm text-gray-500">{lang.desc}</div>
                        </div>
                        {selectedLanguage === lang.code && (
                          <motion.div
                            layoutId="selectedLanguage"
                            className="absolute inset-0 border-2 border-purple-500 rounded-2xl bg-purple-500/5"
                          />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Recording Interface */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-center"
                >
                  <div className="relative mb-12">
                    <motion.div 
                      animate={{ 
                        boxShadow: isRecording ? [
                          '0 0 0 0 rgba(239, 68, 68, 0.4)',
                          '0 0 0 20px rgba(239, 68, 68, 0)',
                          '0 0 0 0 rgba(239, 68, 68, 0.4)'
                        ] : '0 0 0 0 rgba(139, 92, 246, 0)'
                      }}
                      transition={{ duration: 1.5, repeat: isRecording ? Infinity : 0 }}
                      className={`w-48 h-48 mx-auto rounded-full flex items-center justify-center transition-all duration-500 ${
                        isRecording 
                          ? 'bg-gradient-to-br from-red-500 to-pink-600 animate-pulse shadow-2xl shadow-red-500/50' 
                          : 'bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105'
                      }`}
                    >
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={isRecording ? stopRecording : startRecording}
                        className="w-full h-full rounded-full flex items-center justify-center text-white"
                        disabled={isProcessing}
                      >
                        {isRecording ? (
                          <StopIcon className="w-20 h-20" />
                        ) : (
                          <MicrophoneIcon className="w-20 h-20" />
                        )}
                      </motion.button>
                    </motion.div>
                    
                    {/* Recording Timer */}
                    {isRecording && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -bottom-8 left-1/2 transform -translate-x-1/2"
                      >
                        <div className="bg-red-500 text-white px-6 py-3 rounded-full text-lg font-bold shadow-lg">
                          🔴 {formatTime(recordingTime)}
                        </div>
                      </motion.div>
                    )}

                    {/* Audio Waveform Visualization */}
                    {isRecording && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 flex items-end space-x-1"
                      >
                        {[...Array(20)].map((_, i) => (
                          <motion.div
                            key={i}
                            animate={{ 
                              height: [4, Math.random() * 40 + 10, 4]
                            }}
                            transition={{ 
                              duration: 0.5,
                              repeat: Infinity,
                              delay: i * 0.1
                            }}
                            className="w-1 bg-gradient-to-t from-red-500 to-pink-400 rounded-full"
                          />
                        ))}
                      </motion.div>
                    )}
                  </div>

                  <div className="space-y-8">
                    <motion.h3 
                      animate={{ 
                        scale: isRecording ? [1, 1.05, 1] : 1
                      }}
                      transition={{ duration: 2, repeat: isRecording ? Infinity : 0 }}
                      className="text-2xl font-bold text-gray-900"
                    >
                      {isRecording ? '🎤 Listening to your story...' : '✨ Ready to capture your unique experience'}
                    </motion.h3>
                    
                    <div className="bg-gradient-to-r from-purple-50 via-blue-50 to-green-50 rounded-3xl p-8 max-w-5xl mx-auto border border-white/20">
                      <h4 className="font-bold text-gray-900 mb-6 text-xl">💡 What to include in your description:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
                        <div className="space-y-4">
                          <motion.div 
                            whileHover={{ x: 5 }}
                            className="flex items-center space-x-3 p-3 bg-white/60 rounded-xl border border-white/30"
                          >
                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                            <span className="font-medium">Property type (house, farm, cottage, heritage home)</span>
                          </motion.div>
                          <motion.div 
                            whileHover={{ x: 5 }}
                            className="flex items-center space-x-3 p-3 bg-white/60 rounded-xl border border-white/30"
                          >
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="font-medium">Location and beautiful surroundings</span>
                          </motion.div>
                          <motion.div 
                            whileHover={{ x: 5 }}
                            className="flex items-center space-x-3 p-3 bg-white/60 rounded-xl border border-white/30"
                          >
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="font-medium">Number of rooms and guest capacity</span>
                          </motion.div>
                          <motion.div 
                            whileHover={{ x: 5 }}
                            className="flex items-center space-x-3 p-3 bg-white/60 rounded-xl border border-white/30"
                          >
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <span className="font-medium">Facilities and amenities offered</span>
                          </motion.div>
                        </div>
                        <div className="space-y-4">
                          <motion.div 
                            whileHover={{ x: 5 }}
                            className="flex items-center space-x-3 p-3 bg-white/60 rounded-xl border border-white/30"
                          >
                            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                            <span className="font-medium">Unique features and local experiences</span>
                          </motion.div>
                          <motion.div 
                            whileHover={{ x: 5 }}
                            className="flex items-center space-x-3 p-3 bg-white/60 rounded-xl border border-white/30"
                          >
                            <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                            <span className="font-medium">Local activities and cultural highlights</span>
                          </motion.div>
                          <motion.div 
                            whileHover={{ x: 5 }}
                            className="flex items-center space-x-3 p-3 bg-white/60 rounded-xl border border-white/30"
                          >
                            <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                            <span className="font-medium">Food and hospitality you provide</span>
                          </motion.div>
                          <motion.div 
                            whileHover={{ x: 5 }}
                            className="flex items-center space-x-3 p-3 bg-white/60 rounded-xl border border-white/30"
                          >
                            <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                            <span className="font-medium">What makes your place special</span>
                          </motion.div>
                        </div>
                      </div>
                      
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border border-yellow-200"
                      >
                        <div className="flex items-center space-x-2 text-yellow-800 mb-2">
                          <LightBulbIcon className="w-5 h-5" />
                          <span className="font-semibold">Pro Tip:</span>
                        </div>
                        <p className="text-yellow-700 text-sm">
                          Speak naturally as if you're telling a friend about your home. Our AI understands context, 
                          emotions, and cultural nuances to create compelling content that attracts the right guests.
                        </p>
                      </motion.div>
                    </div>
                  </div>

                  {/* Audio Playback */}
                  {audioUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-12 bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/20"
                    >
                      <h4 className="text-xl font-semibold text-gray-900 mb-6">🎵 Your Recorded Story</h4>
                      
                      <div className="flex items-center justify-center space-x-8">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={playAudio}
                          className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          {isPlaying ? (
                            <PauseIcon className="w-8 h-8" />
                          ) : (
                            <PlayIcon className="w-8 h-8 ml-1" />
                          )}
                        </motion.button>
                        
                        <div className="text-center">
                          <div className="text-gray-900 font-medium text-lg">Duration: {formatTime(recordingTime)}</div>
                          <div className="text-gray-500 text-sm">Language: {languages.find(l => l.code === selectedLanguage)?.name}</div>
                        </div>
                        
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={retryRecording}
                          className="w-16 h-16 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 transition-all duration-300 shadow-md"
                        >
                          <ArrowPathIcon className="w-8 h-8" />
                        </motion.button>
                      </div>
                      
                      <audio
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                      />
                      
                      {/* Audio Visualization */}
                      {isPlaying && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-6 flex items-center justify-center space-x-1"
                        >
                          {[...Array(30)].map((_, i) => (
                            <motion.div
                              key={i}
                              animate={{ 
                                height: [2, Math.random() * 20 + 5, 2]
                              }}
                              transition={{ 
                                duration: 0.8,
                                repeat: Infinity,
                                delay: i * 0.05
                              }}
                              className="w-1 bg-gradient-to-t from-green-500 to-emerald-400 rounded-full"
                            />
                          ))}
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {/* Action Buttons */}
                  {audioBlob && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-12 flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6"
                    >
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={retryRecording}
                        className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-semibold text-lg transition-all duration-300 flex items-center justify-center space-x-2"
                        disabled={isProcessing}
                      >
                        <ArrowPathIcon className="w-6 h-6" />
                        <span>🔄 Record Again</span>
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={processVoiceToListing}
                        disabled={isProcessing}
                        className="px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-2"
                      >
                        {isProcessing ? (
                          <>
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>✨ Creating Magic...</span>
                          </>
                        ) : (
                          <>
                            <RocketLaunchIcon className="w-6 h-6" />
                            <span>🚀 Generate Listing</span>
                          </>
                        )}
                      </motion.button>
                    </motion.div>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* Step 2: Processing */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-white/90 backdrop-blur-2xl rounded-3xl p-8 md:p-16 shadow-2xl border border-white/30 text-center"
              >
                <motion.div 
                  animate={{ 
                    rotate: [0, 360],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                    scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className="w-24 h-24 bg-gradient-to-br from-purple-500 via-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-purple-500/30"
                >
                  <SparklesIcon className="w-12 h-12 text-white" />
                </motion.div>
                
                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                  🤖 AI is Working Its Magic
                </h2>
                
                <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
                  Our advanced AI is analyzing your voice, understanding context and emotions, then creating 
                  professional content optimized for search and bookings. This magical process takes just moments...
                </p>
                
                <div className="space-y-8 max-w-2xl mx-auto">
                  {processingSteps.map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.6 }}
                      className={`flex items-center space-x-6 p-6 rounded-2xl shadow-lg border border-white/20 ${step.bg}`}
                    >
                      <motion.div 
                        animate={{ 
                          scale: [1, 1.2, 1],
                          rotate: [0, 10, -10, 0]
                        }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity,
                          delay: index * 0.5
                        }}
                        className="text-4xl"
                      >
                        {step.icon}
                      </motion.div>
                      <div className="flex-1 text-left">
                        <div className={`font-bold text-lg ${step.color}`}>{step.text}</div>
                        <div className="w-full bg-white/50 rounded-full h-3 mt-3 overflow-hidden">
                          <motion.div 
                            className={`h-full rounded-full ${step.color.replace('text-', 'bg-')}`}
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 2.5, delay: index * 0.6 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Real-time Status Updates */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2 }}
                  className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
                >
                  <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                    <div className="text-3xl mb-3">🎤</div>
                    <h4 className="font-semibold text-gray-900 mb-2">Voice Recognition</h4>
                    <p className="text-sm text-gray-600">Converting speech to text with 99% accuracy</p>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                    <div className="text-3xl mb-3">🧠</div>
                    <h4 className="font-semibold text-gray-900 mb-2">AI Enhancement</h4>
                    <p className="text-sm text-gray-600">Understanding context and generating compelling content</p>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                    <div className="text-3xl mb-3">🌍</div>
                    <h4 className="font-semibold text-gray-900 mb-2">Multi-language</h4>
                    <p className="text-sm text-gray-600">Creating versions in multiple languages</p>
                  </div>
                </motion.div>

                {transcription && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-12 p-8 bg-green-50 rounded-2xl border border-green-200"
                  >
                    <div className="flex items-center justify-center space-x-3 mb-4">
                      <CheckIcon className="w-6 h-6 text-green-600" />
                      <h3 className="font-bold text-green-900 text-xl">✅ Speech Recognition Complete</h3>
                    </div>
                    <div className="bg-white/80 rounded-xl p-6 border border-green-100">
                      <p className="text-green-800 italic leading-relaxed">"{transcription}"</p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Step 3: Review & Edit */}
            {currentStep === 3 && generatedListing && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-8"
              >
                <div className="bg-white/90 backdrop-blur-2xl rounded-3xl p-8 md:p-12 shadow-2xl border border-white/30">
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                        ✨ Your AI-Generated Listing
                      </h2>
                      <p className="text-lg text-gray-600">Review and customize your listing before publishing</p>
                    </div>
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.05, 1]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="flex items-center space-x-3 text-green-600 bg-green-50 px-6 py-3 rounded-2xl border border-green-200"
                    >
                      <CheckIcon className="w-6 h-6" />
                      <span className="font-bold">Ready to Publish!</span>
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    {/* Left Column - Form Fields */}
                    <div className="space-y-8">
                      {/* Property Title */}
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">
                          <HomeIcon className="w-5 h-5 inline mr-2" />
                          Property Title
                        </label>
                        <input
                          type="text"
                          value={customEdits.title || ''}
                          onChange={(e) => setCustomEdits(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-lg font-medium"
                          placeholder="e.g., Peaceful Himalayan Village Retreat"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">
                          <DocumentTextIcon className="w-5 h-5 inline mr-2" />
                          Description
                        </label>
                        <textarea
                          rows={6}
                          value={customEdits.description || ''}
                          onChange={(e) => setCustomEdits(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 resize-none"
                          placeholder="Describe your property experience..."
                        />
                        <div className="mt-2 text-sm text-gray-500">
                          {(customEdits.description || '').length} characters
                        </div>
                      </div>

                      {/* Location with Smart Suggestions */}
                      <div className="relative">
                        <label className="block text-sm font-bold text-gray-700 mb-3">
                          <MapPinIcon className="w-5 h-5 inline mr-2" />
                          Location
                        </label>
                        <div className="relative">
                          <input
                            ref={locationInputRef}
                            type="text"
                            value={customEdits.location || ''}
                            onChange={(e) => handleLocationChange(e.target.value)}
                            onFocus={handleLocationFocus}
                            onBlur={handleLocationBlur}
                            placeholder="Start typing your location..."
                            autoComplete="off"
                            className={`w-full px-4 py-4 border-2 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-lg ${
                              geocodingStatus === 'success' ? 'border-green-500 bg-green-50' :
                              geocodingStatus === 'error' ? 'border-red-500 bg-red-50' :
                              geocodingStatus === 'loading' ? 'border-blue-500 bg-blue-50' : 
                              'border-gray-200'
                            }`}
                          />
                          
                          {/* Status Indicator */}
                          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                            {loadingLocationSuggestions && (
                              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            )}
                            {geocodingStatus === 'success' && !loadingLocationSuggestions && (
                              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                <CheckIcon className="w-5 h-5 text-white" />
                              </div>
                            )}
                            {geocodingStatus === 'error' && !loadingLocationSuggestions && (
                              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                                <XMarkIcon className="w-5 h-5 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Location Suggestions Dropdown */}
                        <AnimatePresence>
                          {showLocationSuggestions && locationSuggestions.length > 0 && (
                            <motion.div
                              ref={locationSuggestionsRef}
                              initial={{ opacity: 0, y: -10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -10, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                              className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                            >
                              <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-100">
                                <div className="flex items-center space-x-2 text-sm text-gray-600">
                                  <MagnifyingGlassIcon className="w-4 h-4" />
                                  <span>Choose your location</span>
                                  <span className="ml-auto text-xs bg-white px-2 py-1 rounded-full">
                                   {locationSuggestions.length} found
                                 </span>
                               </div>
                             </div>
                             <div className="max-h-80 overflow-y-auto">
                               {locationSuggestions.map((suggestion, index) => (
                                 <motion.button
                                   key={suggestion.place_id}
                                   type="button"
                                   initial={{ opacity: 0, x: -20 }}
                                   animate={{ opacity: 1, x: 0 }}
                                   transition={{ delay: index * 0.05 }}
                                   onMouseDown={(e) => {
                                     e.preventDefault();
                                     setIsSelectingLocationSuggestion(true);
                                   }}
                                   onMouseUp={() => {
                                     handleLocationSuggestionSelect(suggestion);
                                   }}
                                   className="w-full p-4 text-left hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all duration-200 border-b border-gray-50 last:border-b-0 focus:outline-none focus:bg-gradient-to-r focus:from-purple-50 focus:to-blue-50"
                                 >
                                   <div className="flex items-start space-x-3">
                                     <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                       <MapPinIcon className="w-4 h-4 text-purple-600" />
                                     </div>
                                     <div className="flex-1 min-w-0">
                                       <div className="font-medium text-gray-900 truncate">
                                         {suggestion.main_text} 
                                       </div>
                                       {/* <div className="text-sm text-gray-500 truncate">
                                         {suggestion.secondary_text}
                                       </div> */}
                                       {suggestion.types && suggestion.types.length > 0 && (
                                         <div className="flex items-center space-x-1 mt-1">
                                           {suggestion.types.slice(0, 2).map((type, idx) => (
                                             <span 
                                               key={idx}
                                               className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                                             >
                                               {type.replace(/_/g, ' ')}
                                             </span>
                                           ))}
                                         </div>
                                       )}
                                     </div>
                                     <ChevronRightIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                   </div>
                                 </motion.button>
                               ))}
                             </div>
                             
                             <div className="p-2 bg-gray-50 border-t border-gray-100">
                               <div className="text-xs text-gray-500 text-center">
                                 Powered by Google Places
                               </div>
                             </div>
                           </motion.div>
                         )}
                       </AnimatePresence>
                       
                       {/* Location Status Messages */}
                       {geocodingStatus === 'success' && geocodedLocation && (
                         <motion.div
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           className="mt-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl"
                         >
                           <div className="flex items-center space-x-2 text-sm text-green-700 mb-2">
                             <GlobeAltIcon className="w-4 h-4" />
                             <span className="font-semibold">Location verified successfully!</span>
                           </div>
                           <p className="text-sm text-green-600 mb-2">{geocodedLocation}</p>
                           <p className="text-xs text-green-500">
                             📍 Coordinates: {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
                           </p>
                         </motion.div>
                       )}
                     </div>

                     <div className="grid grid-cols-2 gap-6">
                       {/* Property Type */}
                       <div>
                         <label className="block text-sm font-bold text-gray-700 mb-3">
                           <HomeIcon className="w-5 h-5 inline mr-2" />
                           Property Type
                         </label>
                         <select
                           value={customEdits.property_type || 'homestay'}
                           onChange={(e) => setCustomEdits(prev => ({ ...prev, property_type: e.target.value }))}
                           className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-lg font-medium"
                         >
                           {propertyTypes.map(type => (
                             <option key={type.value} value={type.value}>
                               {type.icon} {type.label}
                             </option>
                           ))}
                         </select>
                       </div>

                       {/* Price per Night */}
                       <div>
                         <label className="block text-sm font-bold text-gray-700 mb-3">
                           <CurrencyRupeeIcon className="w-5 h-5 inline mr-2" />
                           Price per Night (₹)
                         </label>
                         <input
                           type="number"
                           min="500"
                           max="10000"
                           value={customEdits.price_per_night || 2000}
                           onChange={(e) => setCustomEdits(prev => ({ ...prev, price_per_night: parseInt(e.target.value) }))}
                           className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-lg font-medium"
                         />
                       </div>
                     </div>

                     {/* Maximum Guests */}
                     <div>
                       <label className="block text-sm font-bold text-gray-700 mb-3">
                         <UsersIcon className="w-5 h-5 inline mr-2" />
                         Maximum Guests
                       </label>
                       <select
                         value={customEdits.max_guests || 4}
                         onChange={(e) => setCustomEdits(prev => ({ ...prev, max_guests: parseInt(e.target.value) }))}
                         className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-lg font-medium"
                       >
                         {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                           <option key={num} value={num}>{num} guest{num > 1 ? 's' : ''}</option>
                         ))}
                       </select>
                     </div>
                   </div>

                   {/* Right Column - Generated Content Display */}
                   <div className="space-y-8">
                     {/* AI Generated Amenities */}
                     {generatedListing.enhanced_listing?.amenities && (
                       <motion.div 
                         initial={{ opacity: 0, x: 20 }}
                         animate={{ opacity: 1, x: 0 }}
                         className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200"
                       >
                         <h4 className="font-bold text-green-900 mb-4 flex items-center text-lg">
                           ✨ AI-Generated Amenities
                         </h4>
                         <div className="flex flex-wrap gap-3">
                           {generatedListing.enhanced_listing.amenities.map((amenity, index) => (
                             <motion.span 
                               key={index}
                               initial={{ opacity: 0, scale: 0.8 }}
                               animate={{ opacity: 1, scale: 1 }}
                               transition={{ delay: index * 0.1 }}
                               className="bg-green-100 text-green-800 px-4 py-2 rounded-xl text-sm font-medium border border-green-200"
                             >
                               {amenity}
                             </motion.span>
                           ))}
                         </div>
                       </motion.div>
                     )}

                     {/* AI Pricing Intelligence */}
                     {generatedListing.pricing_intelligence && (
                       <motion.div 
                         initial={{ opacity: 0, x: 20 }}
                         animate={{ opacity: 1, x: 0 }}
                         transition={{ delay: 0.1 }}
                         className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200"
                       >
                         <h4 className="font-bold text-blue-900 mb-4 flex items-center text-lg">
                           💰 AI Pricing Intelligence
                         </h4>
                         <div className="space-y-4 text-sm text-blue-700">
                           <div className="flex justify-between items-center p-3 bg-white/60 rounded-xl">
                             <span>Suggested Base Price:</span>
                             <span className="font-bold text-blue-900 text-lg">₹{generatedListing.pricing_intelligence.base_price_per_night}</span>
                           </div>
                           <div className="text-xs text-blue-600 bg-blue-100 rounded-lg p-4 leading-relaxed">
                             {generatedListing.pricing_intelligence.pricing_rationale}
                           </div>
                         </div>
                       </motion.div>
                     )}

                     {/* Original Transcription */}
                     {transcription && (
                       <motion.div 
                         initial={{ opacity: 0, x: 20 }}
                         animate={{ opacity: 1, x: 0 }}
                         transition={{ delay: 0.2 }}
                         className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200"
                       >
                         <h4 className="font-bold text-purple-900 mb-4 flex items-center text-lg">
                           🎤 Your Original Voice Description
                         </h4>
                         <div className="bg-white/60 rounded-xl p-4">
                           <p className="text-sm text-purple-700 italic leading-relaxed">"{transcription}"</p>
                         </div>
                         <div className="mt-3 flex items-center space-x-2 text-xs text-purple-600">
                           <SpeakerWaveIcon className="w-4 h-4" />
                           <span>Language: {languages.find(l => l.code === selectedLanguage)?.name}</span>
                           <span>•</span>
                           <span>Duration: {formatTime(recordingTime)}</span>
                         </div>
                       </motion.div>
                     )}

                     {/* AI Enhancement Stats */}
                     <motion.div 
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       transition={{ delay: 0.3 }}
                       className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-200"
                     >
                       <h4 className="font-bold text-yellow-900 mb-4 flex items-center text-lg">
                         📊 AI Enhancement Stats
                       </h4>
                       <div className="grid grid-cols-2 gap-4 text-sm">
                         <div className="text-center p-3 bg-white/60 rounded-xl">
                           <div className="text-2xl font-bold text-yellow-900">
                             {(customEdits.description || '').length}
                           </div>
                           <div className="text-yellow-700">Characters</div>
                         </div>
                         <div className="text-center p-3 bg-white/60 rounded-xl">
                           <div className="text-2xl font-bold text-yellow-900">
                             {generatedListing.enhanced_listing?.amenities?.length || 0}
                           </div>
                           <div className="text-yellow-700">Amenities</div>
                         </div>
                       </div>
                     </motion.div>
                   </div>
                 </div>

                 {/* Upload Photos Section */}
                 <div className="mt-12 pt-8 border-t border-gray-200">
                   <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
                     <PhotoIcon className="w-7 h-7 mr-3" />
                     Upload Property Photos
                   </h3>
                   
                   {/* Upload Area */}
                   <div 
                     className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 ${
                       dragActive 
                         ? 'border-purple-500 bg-purple-50' 
                         : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
                     }`}
                     onDrop={handleDrop}
                     onDragOver={handleDragOver}
                     onDragLeave={handleDragLeave}
                   >
                     <input
                       type="file"
                       multiple
                       accept="image/*"
                       onChange={handleFileInputChange}
                       className="hidden"
                       id="photo-upload"
                     />
                     <label htmlFor="photo-upload" className="cursor-pointer">
                       <motion.div
                         whileHover={{ scale: 1.05 }}
                         className="mx-auto w-24 h-24 bg-gradient-to-br from-purple-100 to-blue-100 rounded-3xl flex items-center justify-center mb-6"
                       >
                         <CloudArrowUpIcon className="w-12 h-12 text-purple-600" />
                       </motion.div>
                       <h4 className="text-2xl font-bold text-gray-900 mb-4">
                         📸 Upload Amazing Photos
                       </h4>
                       <p className="text-lg text-gray-600 mb-4 max-w-md mx-auto">
                         Drag and drop your photos here, or click to browse. 
                         Show off your property's best features and atmosphere!
                       </p>
                       <div className="text-sm text-gray-500">
                         Supported formats: JPG, PNG, GIF • Max 5MB each • At least 1 photo required
                       </div>
                       
                       {uploadingImages && (
                         <motion.div 
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           className="mt-6"
                         >
                           <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                           <p className="text-purple-600 font-medium">Uploading photos...</p>
                         </motion.div>
                       )}
                     </label>
                   </div>

                   {/* Uploaded Images Grid */}
                   {images.length > 0 && (
                     <motion.div
                       initial={{ opacity: 0, y: 20 }}
                       animate={{ opacity: 1, y: 0 }}
                       className="mt-8"
                     >
                       <div className="flex items-center justify-between mb-6">
                         <h4 className="text-xl font-bold text-gray-900 flex items-center">
                           <PhotoIcon className="w-6 h-6 mr-2" />
                           Uploaded Photos ({images.length})
                         </h4>
                         <button
                           type="button"
                           onClick={() => document.getElementById('photo-upload').click()}
                           className="flex items-center space-x-2 text-purple-600 hover:text-purple-700 font-medium transition-colors duration-300 px-4 py-2 rounded-xl hover:bg-purple-50"
                         >
                           <PlusIcon className="w-5 h-5" />
                           <span>Add More</span>
                         </button>
                       </div>
                       
                       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                         {images.map((image, index) => (
                           <motion.div
                             key={image.id}
                             initial={{ opacity: 0, scale: 0.8 }}
                             animate={{ opacity: 1, scale: 1 }}
                             transition={{ delay: index * 0.1 }}
                             className="relative group"
                           >
                             <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden shadow-lg">
                               <img
                                 src={image.preview || image.url}
                                 alt={`Property photo ${index + 1}`}
                                 className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                               />
                             </div>
                             
                             {/* Image overlay */}
                             <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 rounded-2xl flex items-center justify-center">
                               <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 flex space-x-3">
                                 <motion.button
                                   whileHover={{ scale: 1.1 }}
                                   whileTap={{ scale: 0.9 }}
                                   type="button"
                                   className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all duration-300"
                                 >
                                   <EyeIcon className="w-5 h-5" />
                                 </motion.button>
                                 <motion.button
                                   whileHover={{ scale: 1.1 }}
                                   whileTap={{ scale: 0.9 }}
                                   type="button"
                                   onClick={() => removeImage(image.id)}
                                   className="p-3 bg-red-500/80 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-all duration-300"
                                 >
                                   <XMarkIcon className="w-5 h-5" />
                                 </motion.button>
                               </div>
                             </div>
                             
                             {/* Primary photo indicator */}
                             {index === 0 && (
                               <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center space-x-1">
                                 <span>⭐</span>
                                 <span>Primary</span>
                               </div>
                             )}
                             
                             {/* Image info */}
                             <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-2 rounded-lg truncate">
                               {image.name}
                             </div>
                           </motion.div>
                         ))}
                       </div>
                       
                       <div className="mt-6 text-center">
                         <div className="inline-flex items-center space-x-2 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-full">
                           <LightBulbIcon className="w-4 h-4" />
                           <span>💡 Tip: The first photo will be your main listing image. Make it spectacular!</span>
                         </div>
                       </div>
                     </motion.div>
                   )}
                 </div>

                 {/* Action Buttons */}
                 <div className="mt-12 flex justify-between items-center">
                   <motion.button
                     whileHover={{ scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                     onClick={retryRecording}
                     className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-semibold text-lg transition-all duration-300 flex items-center space-x-2"
                     disabled={isProcessing}
                   >
                     <ArrowPathIcon className="w-6 h-6" />
                     <span>🔄 Start Over</span>
                   </motion.button>
                   
                   <div className="flex space-x-4">
                     <motion.button 
                       whileHover={{ scale: 1.05 }}
                       whileTap={{ scale: 0.95 }}
                       className="px-8 py-4 border-2 border-purple-500 text-purple-600 hover:bg-purple-50 rounded-2xl font-semibold text-lg transition-all duration-300 flex items-center space-x-2"
                       disabled={isProcessing}
                     >
                       <HeartIcon className="w-6 h-6" />
                       <span>💾 Save as Draft</span>
                     </motion.button>
                     
                     <motion.button
                       whileHover={{ scale: 1.05 }}
                       whileTap={{ scale: 0.95 }}
                       onClick={createListingFromVoice}
                       disabled={isProcessing || !customEdits.title || !customEdits.description || images.length === 0 || !customEdits.location}
                       className={`px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg transition-all duration-300 flex items-center space-x-2 ${
                         (!customEdits.title || !customEdits.description || images.length === 0 || !customEdits.location)
                           ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                           : 'bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white shadow-purple-500/25'
                       }`}
                     >
                       {isProcessing ? (
                         <>
                           <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                           <span>🚀 Publishing...</span>
                         </>
                       ) : (
                         <>
                           <SparklesIcon className="w-6 h-6" />
                           <span>🎉 Publish Listing</span>
                         </>
                       )}
                     </motion.button>
                   </div>
                 </div>
                 
                 {/* Validation Messages */}
                 {(!customEdits.title || !customEdits.description || images.length === 0 || !customEdits.location) && (
                   <motion.div
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="mt-6 text-center"
                   >
                     <div className="inline-flex items-center space-x-2 text-amber-600 bg-amber-50 px-6 py-3 rounded-2xl border border-amber-200">
                       <ExclamationTriangleIcon className="w-5 h-5" />
                       <span className="font-medium">
                         {!customEdits.title || !customEdits.description
                           ? 'Please complete title and description'
                           : !customEdits.location
                           ? 'Please provide a location'
                           : images.length === 0
                           ? 'Please upload at least one photo'
                           : 'Please complete all required fields'}
                       </span>
                     </div>
                   </motion.div>
                 )}
               </div>
             </motion.div>
           )}
         </AnimatePresence>
       </div>

       {/* Professional Tips Section
       <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.5 }}
         className="mt-20 bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 rounded-3xl p-10 shadow-2xl border border-white/30"
       >
         <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center flex items-center justify-center">
           <SparklesIcon className="w-8 h-8 mr-3" />
           🎯 Pro Tips for Voice Listing Success
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           <motion.div 
             whileHover={{ scale: 1.05, y: -5 }}
             className="text-center bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/20"
           >
             <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
               <MicrophoneIcon className="w-10 h-10 text-white" />
             </div>
             <h4 className="font-bold text-gray-900 mb-3 text-lg">🎤 Perfect Recording</h4>
             <p className="text-sm text-gray-600 leading-relaxed">
               Speak clearly in a quiet environment. Our AI captures emotions and context, 
               so be natural and passionate about your property.
             </p>
           </motion.div>
           
           <motion.div 
             whileHover={{ scale: 1.05, y: -5 }}
             className="text-center bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/20"
           >
             <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
               <ChatBubbleBottomCenterTextIcon className="w-10 h-10 text-white" />
             </div>
             <h4 className="font-bold text-gray-900 mb-3 text-lg">✨ Compelling Stories</h4>
             <p className="text-sm text-gray-600 leading-relaxed">
               Tell your unique story! What makes guests fall in love with your place? 
               Share personal touches and memorable experiences.
             </p>
           </motion.div>
           
           <motion.div 
             whileHover={{ scale: 1.05, y: -5 }}
             className="text-center bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/20"
           >
             <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
               <PhotoIcon className="w-10 h-10 text-white" />
             </div>
             <h4 className="font-bold text-gray-900 mb-3 text-lg">📸 Visual Appeal</h4>
             <p className="text-sm text-gray-600 leading-relaxed">
               High-quality photos seal the deal. Capture golden hour lighting, 
               show spaces in use, and highlight unique architectural details.
             </p>
           </motion.div>
         </div>
         
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.7 }}
           className="mt-10 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-200"
         >
           <div className="flex items-center space-x-3 mb-3">
             <LightBulbIcon className="w-6 h-6 text-yellow-600" />
             <h4 className="font-bold text-yellow-900 text-lg">🔥 Success Secret</h4>
           </div>
           <p className="text-yellow-800 leading-relaxed">
             The most successful voice listings are recorded by hosts who are genuinely excited about sharing their space. 
             Our AI can detect authenticity and enthusiasm, which translates into more engaging content that attracts bookings!
           </p>
         </motion.div>
       </motion.div> */}

       {/* Quick Actions */}
       <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.7 }}
         className="mt-12 text-center"
       >
         <p className="text-lg text-gray-600 mb-6">Need help or want to try something else?</p>
         <div className="flex flex-wrap justify-center gap-6">
           <motion.button
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             onClick={() => router.push('/host/create-listing')}
             className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-3"
           >
             <HomeIcon className="w-6 h-6" />
             <span>📝 Try Manual Form</span>
           </motion.button>
           
           <motion.button
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             onClick={() => router.push('/host/dashboard')}
             className="px-8 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl font-semibold hover:border-gray-300 hover:shadow-md transition-all duration-300 flex items-center space-x-3"
           >
             <CommandLineIcon className="w-6 h-6" />
             <span>📊 Go to Dashboard</span>
           </motion.button>
           
           <motion.button
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-3"
           >
             <ShareIcon className="w-6 h-6" />
             <span>🤝 Get Help</span>
           </motion.button>
         </div>
       </motion.div>
     </div>
   </div>
 );
};

export default VoiceListingPage;