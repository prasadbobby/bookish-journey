'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PhotoIcon,
  MapPinIcon,
  CurrencyRupeeIcon,
  HomeIcon,
  UsersIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  GlobeAltIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  SparklesIcon,
  CloudArrowUpIcon,
  TrashIcon,
  EyeIcon,
  HeartIcon,
  StarIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { listingsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import AIContentGenerator from '@/components/ai/AIContentGenerator';

const CreateListingPage = () => {
  const { user, isHost } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [geocodingStatus, setGeocodingStatus] = useState(null);
  const [geocodedLocation, setGeocodedLocation] = useState('');
  const [coordinates, setCoordinates] = useState({ lat: 0, lng: 0 });
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [isSelectingSuggestion, setIsSelectingSuggestion] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
    const locationInputRef = useRef(null);
  const suggestionsTimeoutRef = useRef(null);
  const suggestionsRef = useRef(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    price_per_night: '',
    property_type: 'homestay',
    max_guests: 2,
    amenities: [],
    house_rules: [],
    sustainability_features: [],
    coordinates: { lat: 0, lng: 0 }
  });

  const [formErrors, setFormErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);

  // Debounced location suggestions
 const fetchLocationSuggestions = async (query) => {
    if (query.length < 2) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    try {
      const response = await listingsAPI.getLocationSuggestions({ query, limit: 6 });
      setLocationSuggestions(response.data.suggestions || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Location suggestions error:', error);
      setLocationSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Handle location input change with debouncing
  const handleLocationChange = (e) => {
    const location = e.target.value;
    setFormData(prev => ({ ...prev, location }));
    setSelectedSuggestion(null);
    setIsSelectingSuggestion(false); // Reset selection flag
    
    // Reset geocoding status
    setGeocodingStatus(null);
    setGeocodedLocation('');
    setCoordinates({ lat: 0, lng: 0 });
    
    // Clear previous timeout
    if (suggestionsTimeoutRef.current) {
      clearTimeout(suggestionsTimeoutRef.current);
    }
    
    // Set new timeout for suggestions
    suggestionsTimeoutRef.current = setTimeout(() => {
      fetchLocationSuggestions(location);
    }, 300);
  };
  // Handle location suggestion selection
 const handleSuggestionSelect = async (suggestion) => {
    try {
      setIsSelectingSuggestion(true); // Set flag to prevent closing
      setLoadingSuggestions(true);
      setShowSuggestions(false);
      setSelectedSuggestion(suggestion);
      
      // Update input immediately
      setFormData(prev => ({
        ...prev,
        location: suggestion.description
      }));
      
      // Get detailed place information
      const response = await listingsAPI.getPlaceDetails({ place_id: suggestion.place_id });
      
      if (response.data.success) {
        const placeDetails = response.data.place_details;
        
        setFormData(prev => ({
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
      setLoadingSuggestions(false);
      setIsSelectingSuggestion(false);
    }
  };


  // Handle input focus
  const handleLocationFocus = () => {
    if (locationSuggestions.length > 0 && formData.location.length > 1) {
      setShowSuggestions(true);
    }
  };

  // Handle input blur with delay to allow for suggestion selection
  const handleLocationBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      if (!isSelectingSuggestion) {
        setShowSuggestions(false);
      }
    }, 200);
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target) &&
        locationInputRef.current &&
        !locationInputRef.current.contains(event.target) &&
        !isSelectingSuggestion
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSelectingSuggestion]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (suggestionsTimeoutRef.current) {
        clearTimeout(suggestionsTimeoutRef.current);
      }
    };
  }, []);
  // Handle image upload with drag and drop
  const handleImageUpload = (files) => {
    if (!files || files.length === 0) return;
    
    setUploadingImages(true);
    
    Array.from(files).forEach((file, index) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return;
      }
      
      // Validate file size (max 5MB)
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

  // Handle file input change
  const handleFileInputChange = (e) => {
    handleImageUpload(e.target.files);
  };

  // Handle drag and drop
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

  // Remove image
  const removeImage = (imageId) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
  };

  // Add/remove amenities
  const toggleAmenity = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  // Form validation
  useEffect(() => {
    const errors = {};
    
    if (currentStep >= 1) {
      if (!formData.title.trim()) errors.title = 'Title is required';
      if (!formData.description.trim() || formData.description.length < 50) {
        errors.description = 'Description must be at least 50 characters';
      }
      if (!formData.location.trim()) errors.location = 'Location is required';
      if (!formData.price_per_night || formData.price_per_night < 500) {
        errors.price_per_night = 'Price must be at least ₹500';
      }
    }
    
    if (currentStep >= 4) {
      if (images.length === 0) errors.images = 'At least one image is required';
    }
    
    setFormErrors(errors);
    setIsFormValid(Object.keys(errors).length === 0);
  }, [formData, currentStep, images]);

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isFormValid) {
      toast.error('Please fix all form errors before submitting');
      return;
    }

    setLoading(true);

    try {
      const listingData = {
        ...formData,
        images: images.map(img => img.url || img.preview),
        price_per_night: parseFloat(formData.price_per_night),
        max_guests: parseInt(formData.max_guests),
        coordinates: coordinates.lat !== 0 && coordinates.lng !== 0 ? coordinates : { lat: 0, lng: 0 }
      };

      const response = await listingsAPI.create(listingData);
      
      toast.success('🎉 Listing created successfully!');
      
      if (response.data.coordinates && response.data.coordinates.lat !== 0) {
        toast.success('📍 Location coordinates saved!');
      }
      
      router.push('/host/listings');
    } catch (error) {
      console.error('Create listing error:', error);
      toast.error(error.response?.data?.error || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  // Property types with icons
  const propertyTypes = [
    { 
      value: 'homestay', 
      label: 'Homestay', 
      icon: '🏠',
      desc: 'Stay with a local family',
      popular: true
    },
    { 
      value: 'farmstay', 
      label: 'Farmstay', 
      icon: '🚜',
      desc: 'Experience rural farm life',
      popular: true
    },
    { 
      value: 'heritage_home', 
      label: 'Heritage Home', 
      icon: '🏛️',
      desc: 'Traditional architecture',
      popular: false
    },
    { 
      value: 'eco_lodge', 
      label: 'Eco Lodge', 
      icon: '🌿',
      desc: 'Sustainable accommodation',
      popular: true
    },
    { 
      value: 'village_house', 
      label: 'Village House', 
      icon: '🏘️',
      desc: 'Independent village home',
      popular: false
    },
    { 
      value: 'cottage', 
      label: 'Cottage', 
      icon: '🏡',
      desc: 'Cozy countryside cottage',
      popular: false
    }
  ];

  const popularAmenities = [
    { name: 'Wi-Fi', icon: '📶', category: 'technology' },
    { name: 'Home-cooked meals', icon: '🍽️', category: 'food' },
    { name: 'Local guide', icon: '👨‍🏫', category: 'service' },
    { name: 'Traditional cuisine', icon: '🥘', category: 'food' },
    { name: 'Cultural performances', icon: '🎭', category: 'entertainment' },
    { name: 'Yoga sessions', icon: '🧘', category: 'wellness' },
    { name: 'Nature walks', icon: '🚶', category: 'activity' },
    { name: 'Organic farming', icon: '🌱', category: 'activity' },
    { name: 'Handicraft workshop', icon: '🎨', category: 'activity' },
    { name: 'Bicycle rental', icon: '🚴', category: 'transport' },
    { name: 'Fireplace', icon: '🔥', category: 'comfort' },
    { name: 'Garden', icon: '🌻', category: 'outdoor' },
    { name: 'Parking', icon: '🚗', category: 'transport' },
    { name: 'Air conditioning', icon: '❄️', category: 'comfort' },
    { name: 'Hot water', icon: '🚿', category: 'comfort' },
    { name: 'Laundry service', icon: '👕', category: 'service' }
  ];

  const steps = [
    { number: 1, title: 'Basic Info', desc: 'Title, description, location' },
    { number: 2, title: 'Property Details', desc: 'Type and capacity' },
    { number: 3, title: 'Amenities', desc: 'Features and services' },
    { number: 4, title: 'Photos & Publish', desc: 'Upload images and publish' }
  ];

  if (!isHost) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 pt-20 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center bg-white rounded-3xl p-12 shadow-2xl border border-gray-100"
        >
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XMarkIcon className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-8">Only hosts can create listings.</p>
          <button 
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Go to Homepage
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 pt-20">
      {/* Floating background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="relative inline-block mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 via-green-600 to-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-green-500/25">
              <HomeIcon className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <SparklesIcon className="w-3 h-3 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-green-600 bg-clip-text text-transparent mb-4">
            Create Your Listing
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Share your authentic rural experience with travelers from around the world
          </p>
        </motion.div>

        {/* Progress Steps */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg transition-all duration-500 ${
                    currentStep >= step.number 
                      ? 'bg-gradient-to-br from-green-500 to-blue-600 text-white shadow-lg shadow-green-500/25 scale-110' 
                      : currentStep === step.number
                      ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                    {currentStep > step.number ? (
                      <CheckIcon className="w-7 h-7" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <div className="mt-3 text-center">
                    <div className={`font-semibold text-sm ${
                      currentStep >= step.number ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{step.desc}</div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 md:w-24 h-1 mx-4 rounded-full transition-all duration-500 ${
                    currentStep > step.number ? 'bg-gradient-to-r from-green-500 to-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl border border-white/20"
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    ✨ Tell Us About Your Property
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Start by sharing the basic details that will make travelers fall in love with your place
                  </p>
                </div>
                
                <div className="max-w-4xl mx-auto space-y-8">
                  {/* Property Title */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      <HomeIcon className="w-5 h-5 inline mr-2" />
                      Property Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Traditional Rajasthani Haveli Experience"
                      className={`w-full px-4 py-4 border-2 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-lg ${
                        formErrors.title ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-green-300'
                      }`}
                    />
                    {formErrors.title && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <XMarkIcon className="w-4 h-4 mr-1" />
                        {formErrors.title}
                      </p>
                    )}
                    <div className="mt-2 text-xs text-gray-500">
                      Make it catchy and descriptive - this is what travelers see first!
                    </div>
                  </div>

                  {/* Description with AI Generator */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-semibold text-gray-700">
                        <SparklesIcon className="w-5 h-5 inline mr-2" />
                        Description *
                      </label>
                      <AIContentGenerator
                        title={formData.title}
                        location={formData.location}
                        price_per_night={formData.price_per_night}
                        property_type={formData.property_type}
                        onContentGenerated={(description) => {
                          setFormData(prev => ({ ...prev, description }));
                        }}
                        onSuggestionsGenerated={(suggestions) => {
                          if (suggestions.suggested_amenities) {
                            setFormData(prev => ({
                              ...prev,
                              amenities: [...new Set([...prev.amenities, ...suggestions.suggested_amenities])]
                            }));
                          }
                          
                          if (suggestions.house_rules) {
                            setFormData(prev => ({
                              ...prev,
                              house_rules: suggestions.house_rules
                            }));
                          }
                          
                          if (suggestions.sustainability_features) {
                            setFormData(prev => ({
                              ...prev,
                              sustainability_features: suggestions.sustainability_features
                            }));
                          }
                        }}
                      />
                    </div>
                    <textarea
                      rows={6}
                      required
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your property, what makes it special, and the experience guests can expect... or use AI to generate compelling content!"
                      className={`w-full px-4 py-4 border-2 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 resize-none ${
                        formErrors.description ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-green-300'
                      }`}
                    />
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <div className={`${formErrors.description ? 'text-red-600' : 'text-gray-500'}`}>
                        {formErrors.description || 'Minimum 50 characters recommended'}
                      </div>
                      <div className={`${formData.description.length >= 50 ? 'text-green-600' : 'text-gray-500'}`}>
                        {formData.description.length} characters
                      </div>
                    </div>
                  </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Location with Smart Suggestions */}
                  <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      <MapPinIcon className="w-5 h-5 inline mr-2" />
                      Location *
                    </label>
                    <div className="relative">
                      <input
                        ref={locationInputRef}
                        type="text"
                        required
                        value={formData.location}
                        onChange={handleLocationChange}
                        onFocus={handleLocationFocus}
                        onBlur={handleLocationBlur}
                        placeholder="Start typing your village, district, state..."
                        autoComplete="off"
                        className={`w-full px-4 py-4 border-2 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-lg ${
                          formErrors.location ? 'border-red-300 bg-red-50' :
                          geocodingStatus === 'success' ? 'border-green-500 bg-green-50' :
                          geocodingStatus === 'error' ? 'border-red-500 bg-red-50' :
                          geocodingStatus === 'loading' ? 'border-blue-500 bg-blue-50' : 
                          'border-gray-200 hover:border-green-300'
                        }`}
                      />
                      
                      {/* Status Indicator */}
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        {loadingSuggestions && (
                          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        )}
                        {geocodingStatus === 'success' && !loadingSuggestions && (
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckIcon className="w-5 h-5 text-white" />
                          </div>
                        )}
                        {geocodingStatus === 'error' && !loadingSuggestions && (
                          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                            <XMarkIcon className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Location Suggestions Dropdown */}
                    <AnimatePresence>
                      {showSuggestions && locationSuggestions.length > 0 && (
                        <motion.div
                          ref={suggestionsRef}
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                          style={{ boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
                        >
                          <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-100">
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
                                  e.preventDefault(); // Prevent input blur
                                  setIsSelectingSuggestion(true);
                                }}
                                onMouseUp={() => {
                                  handleSuggestionSelect(suggestion);
                                }}
                                className="w-full p-4 text-left hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 transition-all duration-200 border-b border-gray-50 last:border-b-0 focus:outline-none focus:bg-gradient-to-r focus:from-green-50 focus:to-blue-50"
                              >
                                <div className="flex items-start space-x-3">
                                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                    <MapPinIcon className="w-4 h-4 text-green-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 truncate">
                                      {suggestion.main_text}
                                    </div>
                                    <div className="text-sm text-gray-500 truncate">
                                      {suggestion.secondary_text}
                                    </div>
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
                          
                          {/* Powered by Google */}
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
                    
                    {geocodingStatus === 'error' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 p-4 bg-red-50 border border-red-200 rounded-2xl"
                      >
                        <div className="flex items-center space-x-2 text-sm text-red-700">
                          <XMarkIcon className="w-4 h-4" />
                          <span className="font-semibold">Location verification failed</span>
                        </div>
                        <p className="text-sm text-red-600 mt-1">
                          Please try a more specific address or check spelling
                        </p>
                      </motion.div>
                    )}
                    
                    {formErrors.location && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <XMarkIcon className="w-4 h-4 mr-1" />
                        {formErrors.location}
                      </p>
                    )}
                    
                    {/* Helper text */}
                    <div className="mt-2 text-xs text-gray-500">
                      💡 Start typing and select from suggestions for best results
                    </div>
                  </div>

                    {/* Price per Night */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        <CurrencyRupeeIcon className="w-5 h-5 inline mr-2" />
                        Price per Night (₹) *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          min="500"
                          max="50000"
                          value={formData.price_per_night}
                          onChange={(e) => setFormData(prev => ({ ...prev, price_per_night: e.target.value }))}
                          placeholder="2000"
                          className={`w-full px-4 py-4 border-2 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-lg ${
                            formErrors.price_per_night ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-green-300'
                          }`}
                        />
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                          per night
                        </div>
                      </div>
                      {formErrors.price_per_night && (
                        <p className="mt-2 text-sm text-red-600 flex items-center">
                          <XMarkIcon className="w-4 h-4 mr-1" />
                          {formErrors.price_per_night}
                        </p>
                      )}
                      <div className="mt-2 text-xs text-gray-500">
                        Set a competitive price for your local market
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="mt-12 flex justify-end">
                  <motion.button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    disabled={!formData.title || !formData.description || !formData.location || !formData.price_per_night || formData.description.length < 50}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg transition-all duration-300 flex items-center space-x-2 ${
                      (!formData.title || !formData.description || !formData.location || !formData.price_per_night || formData.description.length < 50)
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-green-500/25'
                    }`}
                  >
                    <span>Continue to Property Details</span>
                    <ChevronRightIcon className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Property Details */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl border border-white/20"
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    🏠 Property Details
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Help travelers understand what type of experience you're offering
                  </p>
                </div>
                
                <div className="max-w-6xl mx-auto space-y-10">
                  {/* Property Type Selection */}
                  <div>
                    <label className="block text-lg font-semibold text-gray-900 mb-6 text-center">
                      What type of property is this?
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {propertyTypes.map((type) => (
                        <motion.button
                          key={type.value}
                          type="button"
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setFormData(prev => ({ ...prev, property_type: type.value }))}
                          className={`relative p-6 rounded-2xl border-2 transition-all duration-300 text-left group ${
                            formData.property_type === type.value
                              ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg shadow-green-500/25'
                              : 'border-gray-200 hover:border-green-300 hover:shadow-lg bg-white'
                          }`}
                        >
                          {type.popular && (
                            <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-400 to-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                              Popular
                            </div>
                          )}
                          <div className="text-4xl mb-4">{type.icon}</div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{type.label}</h3>
                          <p className="text-gray-600 text-sm">{type.desc}</p>
                          {formData.property_type === type.value && (
                            <motion.div
                              layoutId="selectedPropertyType"
                              className="absolute inset-0 border-2 border-green-500 rounded-2xl bg-green-500/10"
                            />
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Maximum Guests */}
                  <div className="max-w-md mx-auto">
                    <label className="block text-lg font-semibold text-gray-900 mb-4 text-center">
                      <UsersIcon className="w-6 h-6 inline mr-2" />
                      Maximum Guests
                    </label>
                    <div className="relative">
                      <select
                        value={formData.max_guests}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_guests: parseInt(e.target.value) }))}
                        className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-lg font-medium bg-white appearance-none cursor-pointer"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map(num => (
                          <option key={num} value={num}>
                            {num} guest{num > 1 ? 's' : ''}
                          </option>
                        ))}
                      </select>
                      <ChevronRightIcon className="absolute right-4 top-1/2 transform -translate-y-1/2 rotate-90 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                    <div className="mt-2 text-sm text-gray-500 text-center">
                      Consider your space and comfort level
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="mt-12 flex justify-between">
                  <motion.button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-semibold text-lg transition-all duration-300 flex items-center space-x-2"
                  >
                    <ChevronLeftIcon className="w-5 h-5" />
                    <span>Back</span>
                  </motion.button>
                  
                  <motion.button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl font-semibold text-lg shadow-lg shadow-green-500/25 transition-all duration-300 flex items-center space-x-2"
                  >
                    <span>Continue to Amenities</span>
                    <ChevronRightIcon className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Amenities */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl border border-white/20"
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    ✨ Amenities & Features
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    What special features and services do you offer to make guests feel at home?
                  </p>
                </div>
                
                <div className="max-w-6xl mx-auto space-y-8">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">Select your amenities</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {popularAmenities.map((amenity) => (
                        <motion.button
                          key={amenity.name}
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => toggleAmenity(amenity.name)}
                          className={`p-4 rounded-2xl border-2 transition-all duration-300 text-left group ${
                            formData.amenities.includes(amenity.name)
                              ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg shadow-green-500/10'
                              : 'border-gray-200 hover:border-green-300 hover:shadow-md bg-white'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">{amenity.icon}</div>
                            <div className="flex-1">
                              <div className={`font-medium ${
                                formData.amenities.includes(amenity.name) ? 'text-green-900' : 'text-gray-900'
                              }`}>
                                {amenity.name}
                              </div>
                              <div className="text-xs text-gray-500 capitalize">{amenity.category}</div>
                            </div>
                            {formData.amenities.includes(amenity.name) && (
                              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <CheckIcon className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Selected Amenities Preview */}
                  {formData.amenities.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6"
                    >
                      <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                        <CheckIcon className="w-5 h-5 mr-2" />
                        Selected Amenities ({formData.amenities.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {formData.amenities.map((amenity) => {
                          const amenityData = popularAmenities.find(a => a.name === amenity);
                          return (
                            <span
                              key={amenity}
                              className="inline-flex items-center space-x-2 bg-white/80 text-green-800 px-3 py-2 rounded-xl text-sm font-medium border border-green-200"
                            >
                              <span>{amenityData?.icon}</span>
                              <span>{amenity}</span>
                              <button
                                type="button"
                                onClick={() => toggleAmenity(amenity)}
                                className="text-green-600 hover:text-green-800 ml-1"
                              >
                                <XMarkIcon className="w-4 h-4" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Navigation */}
                <div className="mt-12 flex justify-between">
                  <motion.button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-semibold text-lg transition-all duration-300 flex items-center space-x-2"
                  >
                    <ChevronLeftIcon className="w-5 h-5" />
                    <span>Back</span>
                  </motion.button>
                  
                  <motion.button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl font-semibold text-lg shadow-lg shadow-green-500/25 transition-all duration-300 flex items-center space-x-2"
                  >
                    <span>Continue to Photos</span>
                    <ChevronRightIcon className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Photos & Publish */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl border border-white/20"
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    📸 Photos & Final Review
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Add beautiful photos that showcase your property and review your listing before publishing
                  </p>
                </div>
                
                <div className="max-w-6xl mx-auto space-y-10">
                  {/* Photo Upload Section */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">
                      Property Photos *
                    </h3>
                    
                    {/* Upload Area */}
                    <div 
                      className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                        dragActive 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-300 hover:border-green-400 hover:bg-green-50'
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
                          className="mx-auto w-20 h-20 bg-gradient-to-br from-green-100 to-blue-100 rounded-2xl flex items-center justify-center mb-6"
                        >
                          <CloudArrowUpIcon className="w-10 h-10 text-green-600" />
                        </motion.div>
                        <h4 className="text-2xl font-bold text-gray-900 mb-3">
                          Upload Photos
                        </h4>
                        <p className="text-gray-600 mb-4 max-w-md mx-auto">
                          Drag and drop your photos here, or click to browse. 
                          Show off your property's best features!
                        </p>
                        <div className="text-sm text-gray-500">
                          Supported formats: JPG, PNG, GIF • Max 5MB each • At least 1 photo required
                        </div>
                        
                        {uploadingImages && (
                          <div className="mt-6">
                            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-green-600 font-medium">Uploading photos...</p>
                          </div>
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
                          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                            <PhotoIcon className="w-5 h-5 mr-2" />
                            Uploaded Photos ({images.length})
                          </h4>
                          <button
                            type="button"
                            onClick={() => document.getElementById('photo-upload').click()}
                            className="flex items-center space-x-2 text-green-600 hover:text-green-700 font-medium transition-colors duration-300"
                          >
                            <PlusIcon className="w-5 h-5" />
                            <span>Add More</span>
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                                <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 flex space-x-2">
                                  <button
                                    type="button"
                                    className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-all duration-300"
                                  >
                                    <EyeIcon className="w-5 h-5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeImage(image.id)}
                                    className="p-2 bg-red-500/80 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-all duration-300"
                                  >
                                    <TrashIcon className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                              
                              {/* Primary photo indicator */}
                              {index === 0 && (
                                <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-lg flex items-center space-x-1">
                                  <StarIcon className="w-3 h-3" />
                                  <span>Primary</span>
                                </div>
                                )}
                             
                             {/* Image info */}
                             <div className="absolute bottom-3 left-3 right-3 bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded-lg truncate">
                               {image.name}
                             </div>
                           </motion.div>
                         ))}
                       </div>
                       
                       <div className="mt-4 text-sm text-gray-500 text-center">
                         💡 Tip: The first photo will be your main listing image. Make it count!
                       </div>
                     </motion.div>
                   )}
                   
                   {/* Error message for missing images */}
                   {formErrors.images && (
                     <motion.div
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl"
                     >
                       <p className="text-red-600 flex items-center">
                         <XMarkIcon className="w-5 h-5 mr-2" />
                         {formErrors.images}
                       </p>
                     </motion.div>
                   )}
                 </div>

                 {/* Listing Preview */}
                 <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8">
                   <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                     <EyeIcon className="w-6 h-6 mr-2" />
                     Listing Preview
                   </h3>
                   
                   <div className="bg-white rounded-2xl p-6 shadow-lg">
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                       {/* Preview Card */}
                       <div>
                         <div className="aspect-video bg-gray-200 rounded-2xl mb-4 overflow-hidden">
                           {images.length > 0 ? (
                             <img
                               src={images[0].preview || images[0].url}
                               alt="Property preview"
                               className="w-full h-full object-cover"
                             />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-gray-400">
                               <PhotoIcon className="w-16 h-16" />
                             </div>
                           )}
                         </div>
                         
                         <div className="space-y-3">
                           <h4 className="text-xl font-bold text-gray-900">
                             {formData.title || 'Your Property Title'}
                           </h4>
                           <p className="text-gray-600 text-sm line-clamp-3">
                             {formData.description || 'Your property description will appear here...'}
                           </p>
                           <div className="flex items-center justify-between">
                             <div className="flex items-center space-x-2 text-sm text-gray-500">
                               <MapPinIcon className="w-4 h-4" />
                               <span>{formData.location || 'Location'}</span>
                             </div>
                             <div className="text-xl font-bold text-green-600">
                               ₹{formData.price_per_night || '0'}/night
                             </div>
                           </div>
                         </div>
                       </div>
                       
                       {/* Summary Details */}
                       <div className="space-y-6">
                         <div>
                           <h5 className="font-semibold text-gray-900 mb-3">Property Details</h5>
                           <div className="grid grid-cols-2 gap-4 text-sm">
                             <div>
                               <span className="text-gray-500">Type:</span>
                               <p className="font-medium capitalize">
                                 {formData.property_type.replace('_', ' ')}
                               </p>
                             </div>
                             <div>
                               <span className="text-gray-500">Max Guests:</span>
                               <p className="font-medium">{formData.max_guests}</p>
                             </div>
                             <div>
                               <span className="text-gray-500">Photos:</span>
                               <p className="font-medium">{images.length} uploaded</p>
                             </div>
                             <div>
                               <span className="text-gray-500">Amenities:</span>
                               <p className="font-medium">{formData.amenities.length} selected</p>
                             </div>
                           </div>
                         </div>
                         
                         {formData.amenities.length > 0 && (
                           <div>
                             <h5 className="font-semibold text-gray-900 mb-3">Top Amenities</h5>
                             <div className="flex flex-wrap gap-2">
                               {formData.amenities.slice(0, 6).map((amenity) => {
                                 const amenityData = popularAmenities.find(a => a.name === amenity);
                                 return (
                                   <span
                                     key={amenity}
                                     className="inline-flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-lg text-xs"
                                   >
                                     <span>{amenityData?.icon}</span>
                                     <span>{amenity}</span>
                                   </span>
                                 );
                               })}
                               {formData.amenities.length > 6 && (
                                 <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                                   +{formData.amenities.length - 6} more
                                 </span>
                               )}
                             </div>
                           </div>
                         )}
                         
                         {geocodingStatus === 'success' && (
                           <div>
                             <h5 className="font-semibold text-gray-900 mb-3">Location Verified</h5>
                             <div className="flex items-center space-x-2 text-sm text-green-600">
                               <CheckIcon className="w-4 h-4" />
                               <span>Coordinates verified and saved</span>
                             </div>
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                 </div>
               </div>

               {/* Navigation & Publish */}
               <div className="mt-12 flex justify-between items-center">
                 <motion.button
                   type="button"
                   onClick={() => setCurrentStep(3)}
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-semibold text-lg transition-all duration-300 flex items-center space-x-2"
                 >
                   <ChevronLeftIcon className="w-5 h-5" />
                   <span>Back</span>
                 </motion.button>
                 
                 <div className="flex space-x-4">
                   <motion.button
                     type="button"
                     whileHover={{ scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                     className="px-8 py-4 border-2 border-green-500 text-green-600 hover:bg-green-50 rounded-2xl font-semibold text-lg transition-all duration-300 flex items-center space-x-2"
                     disabled={!isFormValid || loading}
                   >
                     <HeartIcon className="w-5 h-5" />
                     <span>Save as Draft</span>
                   </motion.button>
                   
                   <motion.button
                     type="submit"
                     disabled={!isFormValid || loading || images.length === 0}
                     whileHover={{ scale: isFormValid && images.length > 0 ? 1.05 : 1 }}
                     whileTap={{ scale: isFormValid && images.length > 0 ? 0.95 : 1 }}
                     className={`px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg transition-all duration-300 flex items-center space-x-2 ${
                       (!isFormValid || images.length === 0)
                         ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                         : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-green-500/25'
                     }`}
                   >
                     {loading ? (
                       <>
                         <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                         <span>Publishing...</span>
                       </>
                     ) : (
                       <>
                         <SparklesIcon className="w-5 h-5" />
                         <span>Publish Listing</span>
                       </>
                     )}
                   </motion.button>
                 </div>
               </div>
               
               {/* Validation Messages */}
               {(!isFormValid || images.length === 0) && (
                 <motion.div
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="mt-6 text-center"
                 >
                   <div className="inline-flex items-center space-x-2 text-amber-600 bg-amber-50 px-6 py-3 rounded-2xl border border-amber-200">
                     <XMarkIcon className="w-5 h-5" />
                     <span className="font-medium">
                       {images.length === 0
                         ? 'Please upload at least one photo to publish'
                         : Object.keys(formErrors).length > 0
                         ? 'Please fix the errors above to continue'
                         : 'Please complete all required fields'}
                     </span>
                   </div>
                 </motion.div>
               )}
             </motion.div>
           )}
         </AnimatePresence>
       </form>

       {/* Help & Tips Section */}
       <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.5 }}
         className="mt-16 bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 rounded-3xl p-8 shadow-xl border border-white/20"
       >
         <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center flex items-center justify-center">
           <SparklesIcon className="w-6 h-6 mr-2" />
           Pro Tips for Success
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           <div className="text-center">
             <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
               <PhotoIcon className="w-8 h-8 text-white" />
             </div>
             <h4 className="font-semibold text-gray-900 mb-2">High-Quality Photos</h4>
             <p className="text-sm text-gray-600">
               Use natural lighting and capture your property's unique character. First photo is most important!
             </p>
           </div>
           <div className="text-center">
             <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
               <SparklesIcon className="w-8 h-8 text-white" />
             </div>
             <h4 className="font-semibold text-gray-900 mb-2">Compelling Description</h4>
             <p className="text-sm text-gray-600">
               Tell your story! What makes your place special? What experiences can guests expect?
             </p>
           </div>
           <div className="text-center">
             <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
               <MapPinIcon className="w-8 h-8 text-white" />
             </div>
             <h4 className="font-semibold text-gray-900 mb-2">Accurate Location</h4>
             <p className="text-sm text-gray-600">
               Precise location helps travelers find you easily and improves your search ranking.
             </p>
           </div>
         </div>
       </motion.div>

       {/* Quick Actions */}
       <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ delay: 0.7 }}
         className="mt-8 text-center"
       >
         <p className="text-gray-600 mb-4">Need help or want to try something else?</p>
         <div className="flex flex-wrap justify-center gap-4">
           <motion.button
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             onClick={() => router.push('/ai-features/voice-listing')}
             className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2"
           >
             <span>🎤</span>
             <span>Try Voice Listing</span>
           </motion.button>
           
           <motion.button
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             onClick={() => router.push('/host/dashboard')}
             className="px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl font-semibold hover:border-gray-300 hover:shadow-md transition-all duration-300 flex items-center space-x-2"
           >
             <span>📊</span>
             <span>Go to Dashboard</span>
           </motion.button>
         </div>
       </motion.div>
     </div>

     {/* Click outside to close suggestions */}
     {showSuggestions && (
       <div 
         className="fixed inset-0 z-30" 
         onClick={() => setShowSuggestions(false)}
       />
     )}
   </div>
 );
};

export default CreateListingPage;