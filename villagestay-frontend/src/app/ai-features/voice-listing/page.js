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
  UsersIcon
} from '@heroicons/react/24/outline';
import { aiAPI } from '@/lib/api';
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
  
  const mediaRecorder = useRef(null);
  const audioRef = useRef(null);
  const recordingInterval = useRef(null);
  const stream = useRef(null);

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
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    setUploadingImages(true);
    
    files.forEach((file, index) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`File ${file.name} is not an image`);
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Max size is 5MB`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const newImage = {
          id: Date.now() + index,
          file,
          url: event.target.result,
          preview: event.target.result,
          name: file.name
        };
        
        setImages(prev => [...prev, newImage]);
      };
      
      reader.onerror = () => {
        toast.error(`Error reading file ${file.name}`);
      };
      
      reader.readAsDataURL(file);
    });

    setTimeout(() => setUploadingImages(false), 1000);
  };

  const removeImage = (imageId) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
  };

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
    
    // Set the generated listing with processing_id
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
      max_guests: enhanced.max_guests || 4
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

  setIsProcessing(true);
  try {
    console.log('Creating listing with processing_id:', generatedListing.processing_id);
    console.log('Custom edits:', customEdits);
    
    const response = await aiAPI.createListingFromVoice({
      processing_id: generatedListing.processing_id,
      selected_language: 'en',
      custom_edits: {
        ...customEdits,
        images: images.map(img => img.url || img.preview)
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

  useEffect(() => {
    return () => {
      if (stream.current) {
        stream.current.getTracks().forEach(track => track.stop());
      }
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const languages = [
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳', desc: 'Hindi' },
    { code: 'en', name: 'English', flag: '🇬🇧', desc: 'English' },
    { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳', desc: 'Gujarati' },
    { code: 'te', name: 'తెలుగు', flag: '🇮🇳', desc: 'Telugu' },
    { code: 'mr', name: 'मराठी', flag: '🇮🇳', desc: 'Marathi' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳', desc: 'Tamil' },
  ];

  const processingSteps = [
    { text: 'Converting speech to text...', icon: '🎤', color: 'text-blue-500' },
    { text: 'AI enhancing content...', icon: '🤖', color: 'text-purple-500' },
    { text: 'Generating pricing...', icon: '💰', color: 'text-green-500' },
    { text: 'Creating translations...', icon: '🌍', color: 'text-orange-500' },
  ];

  if (loading || !accessChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            <SparklesIcon className="w-6 h-6 text-purple-600 absolute top-5 left-1/2 transform -translate-x-1/2" />
          </div>
          <p className="text-gray-600 font-medium">Initializing AI Voice Assistant...</p>
        </div>
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
        <div className="absolute top-20 left-10 w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
        <div className="absolute bottom-40 left-20 w-3 h-3 bg-pink-400 rounded-full animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-1 h-1 bg-purple-400 rounded-full animate-bounce"></div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="relative inline-block mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 via-purple-600 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/25">
              <MicrophoneIcon className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <SparklesIcon className="w-3 h-3 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            AI Voice Listing Magic
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Speak about your property in your native language and watch our AI transform it into a 
            <span className="font-semibold text-purple-600"> professional listing</span> instantly
          </p>
          
          <div className="mt-6 flex items-center justify-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Real-time AI Processing</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Multi-language Support</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span>Instant Publishing</span>
            </div>
          </div>
        </motion.div>

        {/* Progress Steps */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2 md:space-x-4">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-bold text-sm md:text-base transition-all duration-500 ${
                    currentStep >= step 
                      ? 'bg-gradient-to-br from-purple-500 to-blue-600 text-white shadow-lg shadow-purple-500/25 scale-110' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                    {currentStep > step ? (
                      <CheckIcon className="w-5 h-5 md:w-6 md:h-6" />
                    ) : (
                      step
                    )}
                  </div>
                  {step < 4 && (
                    <div className={`w-8 md:w-16 h-1 mx-1 md:mx-2 rounded-full transition-all duration-500 ${
                      currentStep > step ? 'bg-gradient-to-r from-purple-500 to-blue-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-between mt-4 text-xs md:text-sm text-gray-600 max-w-lg mx-auto">
            <span>Record</span>
            <span>Process</span>
            <span>Review</span>
            <span>Publish</span>
          </div>
        </motion.div>

        <div className="space-y-8">
          {/* Step 1: Recording */}
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl border border-white/20"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                    🎙️ Record Your Property Story
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Choose your language and describe your property. Our AI will listen and create magic!
                  </p>
                </div>

                {/* Language Selection */}
                <div className="mb-10">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
                    Select your preferred language
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                    {languages.map((lang) => (
                      <motion.button
                        key={lang.code}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedLanguage(lang.code)}
                        className={`p-4 rounded-2xl border-2 transition-all duration-300 ${
                          selectedLanguage === lang.code
                            ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-blue-50 shadow-lg shadow-purple-500/25'
                            : 'border-gray-200 hover:border-purple-300 bg-white hover:shadow-md'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-2xl mb-2">{lang.flag}</div>
                          <div className="font-medium text-gray-900">{lang.name}</div>
                          <div className="text-xs text-gray-500">{lang.desc}</div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Recording Interface */}
                <div className="text-center">
                  <div className="relative mb-10">
                    <div className={`w-40 h-40 mx-auto rounded-full flex items-center justify-center transition-all duration-500 ${
                      isRecording 
                        ? 'bg-gradient-to-br from-red-500 to-pink-600 animate-pulse shadow-2xl shadow-red-500/50' 
                        : 'bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 shadow-2xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105'
                    }`}>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={isRecording ? stopRecording : startRecording}
                        className="w-full h-full rounded-full flex items-center justify-center text-white"
                        disabled={isProcessing}
                      >
                        {isRecording ? (
                          <StopIcon className="w-16 h-16" />
                        ) : (
                          <MicrophoneIcon className="w-16 h-16" />
                        )}
                      </motion.button>
                    </div>
                    
                    {isRecording && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -bottom-6 left-1/2 transform -translate-x-1/2"
                      >
                        <div className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                          🔴 {formatTime(recordingTime)}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {isRecording ? '🎤 Recording in progress...' : '✨ Ready to capture your story'}
                    </h3>
                    
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 max-w-3xl mx-auto">
                      <h4 className="font-semibold text-gray-900 mb-4">💡 What to include in your description:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span>Property type (house, farm, cottage)</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>Location and beautiful surroundings</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Number of rooms and facilities</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span>Unique features and experiences</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                            <span>Local activities and culture</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                            <span>Food and hospitality offered</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Audio Playback */}
                  {audioUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8 bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
                    >
                      <div className="flex items-center justify-center space-x-6">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={playAudio}
                          className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          {isPlaying ? (
                            <PauseIcon className="w-6 h-6" />
                          ) : (
                            <PlayIcon className="w-6 h-6" />
                          )}
                        </motion.button>
                        
                        <div className="text-center">
                          <div className="text-gray-900 font-medium">🎵 Your Recording</div>
                          <div className="text-gray-500 text-sm">{formatTime(recordingTime)}</div>
                        </div>
                        
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={retryRecording}
                          className="w-14 h-14 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 transition-all duration-300"
                        >
                          <ArrowPathIcon className="w-6 h-6" />
                        </motion.button>
                      </div>
                      <audio
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                      />
                    </motion.div>
                  )}

                  {/* Action Buttons */}
                  {audioBlob && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8 flex justify-center space-x-4"
                    >
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={retryRecording}
                        className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-semibold transition-all duration-300"
                        disabled={isProcessing}
                      >
                        🔄 Record Again
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={processVoiceToListing}
                        disabled={isProcessing}
                        className="px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        {isProcessing ? (
                          <div className="flex items-center">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                            ✨ Creating Magic...
                          </div>
                        ) : (
                          '🚀 Generate Listing'
                        )}
                      </motion.button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 2: Processing */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl border border-white/20 text-center"
              >
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="w-20 h-20 bg-gradient-to-br from-purple-500 via-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-purple-500/25"
                >
                  <SparklesIcon className="w-10 h-10 text-white" />
                </motion.div>
                
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  🤖 AI is Working Its Magic
                </h2>
                
                <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
                  Our advanced AI is processing your voice recording and creating a professional listing. 
                  This should take just a few moments...
                </p>
                
                <div className="space-y-6 max-w-md mx-auto">
                  {processingSteps.map((step, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.5 }}
                      className="flex items-center space-x-4 p-4 bg-white rounded-2xl shadow-lg border border-gray-100"
                    >
                      <div className="text-2xl">{step.icon}</div>
                      <div className="flex-1 text-left">
                        <div className={`font-medium ${step.color}`}>{step.text}</div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <motion.div 
                            className={`h-2 rounded-full ${step.color.replace('text-', 'bg-')}`}
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 2, delay: index * 0.5 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {transcription && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 p-6 bg-green-50 rounded-2xl border border-green-200"
                  >
                    <h3 className="font-semibold text-green-900 mb-3">✅ Speech Recognition Complete</h3>
                    <p className="text-green-800 italic">"{transcription}"</p>
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
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl border border-white/20">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        ✨ Your AI-Generated Listing
                      </h2>
                      <p className="text-gray-600">Review and customize your listing before publishing</p>
                    </div>
                    <div className="flex items-center space-x-3 text-green-600 bg-green-50 px-4 py-2 rounded-2xl">
                      <CheckIcon className="w-6 h-6" />
                      <span className="font-semibold">Ready to Publish!</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column - Form Fields */}
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          <HomeIcon className="w-5 h-5 inline mr-2" />
                          Property Title
                        </label>
                        <input
                          type="text"
                          value={customEdits.title || ''}
                          onChange={(e) => setCustomEdits(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                          placeholder="e.g., Peaceful Himalayan Village Retreat"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          <DocumentTextIcon className="w-5 h-5 inline mr-2" />
                          Description
                        </label>
                        <textarea
                          rows={6}
                          value={customEdits.description || ''}
                          onChange={(e) => setCustomEdits(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 resize-none"
                          placeholder="Describe your property experience..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-3">
                            <HomeIcon className="w-5 h-5 inline mr-2" />
                            Property Type
                          </label>
                          <select
                            value={customEdits.property_type || 'homestay'}
                            onChange={(e) => setCustomEdits(prev => ({ ...prev, property_type: e.target.value }))}
                            className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                          >
                            <option value="homestay">🏠 Homestay</option>
                            <option value="farmstay">🚜 Farmstay</option>
                            <option value="heritage_home">🏛️ Heritage Home</option>
                            <option value="eco_lodge">🌿 Eco Lodge</option>
                            <option value="village_house">🏘️ Village House</option>
                            <option value="cottage">🏡 Cottage</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-3">
                            <CurrencyRupeeIcon className="w-5 h-5 inline mr-2" />
                            Price per Night (₹)
                          </label>
                          <input
                            type="number"
                            min="500"
                            max="10000"
                            value={customEdits.price_per_night || 2000}
                            onChange={(e) => setCustomEdits(prev => ({ ...prev, price_per_night: parseInt(e.target.value) }))}
                            className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          <UsersIcon className="w-5 h-5 inline mr-2" />
                          Maximum Guests
                        </label>
                        <select
                          value={customEdits.max_guests || 4}
                          onChange={(e) => setCustomEdits(prev => ({ ...prev, max_guests: parseInt(e.target.value) }))}
                          className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                            <option key={num} value={num}>{num} guest{num > 1 ? 's' : ''}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Right Column - Generated Content Display */}
                    <div className="space-y-6">
                      {/* Amenities */}
                      {generatedListing.enhanced_listing?.amenities && (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                          <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                            ✨ AI-Generated Amenities
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {generatedListing.enhanced_listing.amenities.map((amenity, index) => (
                              <span key={index} className="bg-green-100 text-green-800 px-3 py-2 rounded-xl text-sm font-medium border border-green-200">
                                {amenity}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI Pricing Suggestions */}
                      {generatedListing.pricing_intelligence && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                          <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                            💰 AI Pricing Intelligence
                          </h4>
                          <div className="space-y-3 text-sm text-blue-700">
                            <div className="flex justify-between items-center">
                              <span>Suggested Base Price:</span>
                              <span className="font-bold text-blue-900">₹{generatedListing.pricing_intelligence.base_price_per_night}</span>
                            </div>
                            <div className="text-xs text-blue-600 bg-blue-100 rounded-lg p-3">
                              {generatedListing.pricing_intelligence.pricing_rationale}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Original Transcription */}
                      {transcription && (
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
                          <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                            🎤 Your Original Voice Description
                          </h4>
                          <p className="text-sm text-purple-700 italic leading-relaxed">"{transcription}"</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upload Photos Section */}
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                      <PhotoIcon className="w-6 h-6 mr-3" />
                      Upload Property Photos
                    </h3>
                    
                    {/* Upload Area */}
                    <div className="relative">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label
                        htmlFor="photo-upload"
                        className="block border-2 border-dashed border-purple-300 rounded-2xl p-8 text-center hover:border-purple-400 hover:bg-purple-50 transition-all duration-300 cursor-pointer group"
                      >
                        <CloudArrowUpIcon className="w-12 h-12 text-purple-400 mx-auto mb-4 group-hover:text-purple-500" />
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">Upload Photos</h4>
                        <p className="text-gray-600 mb-2">Choose multiple photos that showcase your property</p>
                        <p className="text-sm text-gray-500">Supported: JPG, PNG, GIF (Max 5MB each)</p>
                        
                        {uploadingImages && (
                          <div className="mt-4">
                            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-purple-600 font-medium mt-2">Uploading...</p>
                          </div>
                        )}
                      </label>
                    </div>

                    {/* Uploaded Images Grid */}
                    {images.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                          📸 Uploaded Photos ({images.length})
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {images.map((image) => (
                            <div key={image.id} className="relative group">
                              <img
                                src={image.preview || image.url}
                                alt={`Upload ${image.name}`}
                                className="w-full h-32 object-cover rounded-2xl shadow-lg"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(image.id)}
                                className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg"
                              >
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-lg max-w-20 truncate">
                                {image.name}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => document.getElementById('photo-upload').click()}
                          className="mt-4 flex items-center space-x-2 text-purple-600 hover:text-purple-700 font-medium transition-colors duration-300"
                        >
                          <PlusIcon className="w-5 h-5" />
                          <span>Add More Photos</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-10 flex justify-between items-center">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={retryRecording}
                      className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-semibold transition-all duration-300"
                      disabled={isProcessing}
                    >
                      🔄 Start Over
                    </motion.button>
                    
                    <div className="flex space-x-4">
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-8 py-4 border-2 border-purple-500 text-purple-600 hover:bg-purple-50 rounded-2xl font-semibold transition-all duration-300"
                        disabled={isProcessing}
                      >
                        💾 Save as Draft
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={createListingFromVoice}
                        disabled={isProcessing || !customEdits.title || !customEdits.description || images.length === 0}
                        className={`px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 ${
                          (!customEdits.title || !customEdits.description || images.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isProcessing ? (
                          <div className="flex items-center">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                            🚀 Publishing...
                          </div>
                        ) : (
                          '🎉 Publish Listing'
                        )}
                      </motion.button>
                    </div>
                  </div>
                  
                  {/* Validation Messages */}
                  {(!customEdits.title || !customEdits.description || images.length === 0) && (
                    <div className="mt-4 text-center">
                      <div className="inline-flex items-center space-x-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-2xl border border-amber-200">
                        <ExclamationTriangleIcon className="w-5 h-5" />
                        <span className="text-sm font-medium">
                          {!customEdits.title || !customEdits.description
                            ? 'Please complete title and description'
                            : images.length === 0
                            ? 'Please upload at least one photo'
                            : 'Please wait...'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Professional Tips Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 bg-white/60 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-white/20"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
            💡 Pro Tips for Amazing Results
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center">
                🎤 Recording Best Practices
              </h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Speak clearly and at a natural pace</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Find a quiet environment without background noise</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Keep recording between 1-3 minutes for best results</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Include specific details about your property</span>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center">
                ✨ Content Optimization Tips
              </h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-pink-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Highlight unique features that set you apart</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Describe the local area and nearby attractions</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-teal-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Mention special services and experiences you offer</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Paint a picture of the guest experience</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default VoiceListingPage;