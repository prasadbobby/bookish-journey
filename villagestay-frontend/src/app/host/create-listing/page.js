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
  ArrowPathIcon,
  AcademicCapIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { listingsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import AIContentGenerator from '@/components/ai/AIContentGenerator';

const CreateListingPage = () => {
  const { user, isHost } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0); // Start with category selection
  const [listingCategory, setListingCategory] = useState(''); // 'homestay' or 'experience'
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
  
  // Separate form data for homestays and experiences
  const [homestayData, setHomestayData] = useState({
    title: '',
    description: '',
    location: '',
    price_per_night: '',
    property_type: 'homestay',
    max_guests: 2,
    amenities: [],
    house_rules: [],
    sustainability_features: [],
    check_in_time: '14:00',
    check_out_time: '11:00',
    cancellation_policy: 'flexible',
    instant_book: false,
    coordinates: { lat: 0, lng: 0 }
  });

  const [experienceData, setExperienceData] = useState({
    title: '',
    description: '',
    location: '',
    price_per_person: '',
    category: 'cultural',
    duration: 2,
    max_participants: 8,
    inclusions: [],
    requirements: [],
    difficulty_level: 'easy',
    age_restrictions: { min_age: 0, max_age: 100 },
    languages: ['English'],
    meeting_point: '',
    what_to_bring: [],
    cancellation_policy: 'flexible',
    group_size_preference: 'small',
    coordinates: { lat: 0, lng: 0 }
  });

  const [formErrors, setFormErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);

  // Get current form data based on category
  const getCurrentFormData = () => {
    return listingCategory === 'homestay' ? homestayData : experienceData;
  };

  const setCurrentFormData = (updateFn) => {
    if (listingCategory === 'homestay') {
      setHomestayData(updateFn);
    } else {
      setExperienceData(updateFn);
    }
  };

  // Category selection data
  const listingCategories = [
    {
      value: 'homestay',
      title: 'Homestay',
      icon: '🏠',
      description: 'Offer accommodation in your home, farm, or property',
      features: ['Overnight stays', 'Authentic local living', 'Cultural immersion', 'Home-cooked meals'],
      pricing: 'Per night',
      popular: true
    },
    {
      value: 'experience',
      title: 'Experience',
      icon: '🎭',
      description: 'Share your skills, culture, and local knowledge',
      features: ['Cultural activities', 'Skill workshops', 'Local tours', 'Traditional crafts'],
      pricing: 'Per person',
      popular: true
    }
  ];

  // Property types for homestays
  const homestayTypes = [
    { value: 'homestay', label: 'Homestay', icon: '🏠', desc: 'Stay with a local family', popular: true },
    { value: 'farmstay', label: 'Farmstay', icon: '🚜', desc: 'Experience rural farm life', popular: true },
    { value: 'heritage_home', label: 'Heritage Home', icon: '🏛️', desc: 'Traditional architecture', popular: false },
    { value: 'eco_lodge', label: 'Eco Lodge', icon: '🌿', desc: 'Sustainable accommodation', popular: true },
    { value: 'village_house', label: 'Village House', icon: '🏘️', desc: 'Independent village home', popular: false },
    { value: 'cottage', label: 'Cottage', icon: '🏡', desc: 'Cozy countryside cottage', popular: false }
  ];

  // Experience categories
  const experienceCategories = [
    { value: 'cultural', label: 'Cultural', icon: '🎭', desc: 'Traditional arts, music, dance', popular: true },
    { value: 'culinary', label: 'Culinary', icon: '🍛', desc: 'Cooking classes, food tours', popular: true },
    { value: 'farming', label: 'Farming', icon: '🌾', desc: 'Agricultural activities', popular: true },
    { value: 'craft', label: 'Handicrafts', icon: '🎨', desc: 'Traditional crafts and art', popular: true },
    { value: 'spiritual', label: 'Spiritual', icon: '🙏', desc: 'Meditation, yoga, rituals', popular: false },
    { value: 'adventure', label: 'Adventure', icon: '🏔️', desc: 'Outdoor activities, trekking', popular: false },
    { value: 'wellness', label: 'Wellness', icon: '🧘', desc: 'Ayurveda, spa, healing', popular: false },
    { value: 'nature', label: 'Nature', icon: '🌳', desc: 'Wildlife, bird watching', popular: false }
  ];

  // Amenities for homestays
  const homestayAmenities = [
    { name: 'Wi-Fi', icon: '📶', category: 'technology' },
    { name: 'Home-cooked meals', icon: '🍽️', category: 'food' },
    { name: 'Local guide', icon: '👨‍🏫', category: 'service' },
    { name: 'Traditional cuisine', icon: '🥘', category: 'food' },
    { name: 'Air conditioning', icon: '❄️', category: 'comfort' },
    { name: 'Hot water', icon: '🚿', category: 'comfort' },
    { name: 'Garden', icon: '🌻', category: 'outdoor' },
    { name: 'Parking', icon: '🚗', category: 'transport' },
    { name: 'Bicycle rental', icon: '🚴', category: 'transport' },
    { name: 'Fireplace', icon: '🔥', category: 'comfort' },
    { name: 'Laundry service', icon: '👕', category: 'service' },
    { name: 'Cultural performances', icon: '🎭', category: 'entertainment' }
  ];

  // Inclusions for experiences
  const experienceInclusions = [
    { name: 'All materials', icon: '🎨', category: 'materials' },
    { name: 'Light refreshments', icon: '🍵', category: 'food' },
    { name: 'Full meal', icon: '🍽️', category: 'food' },
    { name: 'Transportation', icon: '🚗', category: 'transport' },
    { name: 'Professional guide', icon: '👨‍🏫', category: 'guide' },
    { name: 'Equipment provided', icon: '🛠️', category: 'equipment' },
    { name: 'Take-home items', icon: '🎁', category: 'souvenir' },
    { name: 'Certificate', icon: '📜', category: 'certification' },
    { name: 'Photo session', icon: '📸', category: 'memory' },
    { name: 'Cultural dress', icon: '👘', category: 'costume' }
  ];

  // Steps configuration based on category
  const getSteps = () => {
    const baseSteps = [
      { number: 0, title: 'Category', desc: 'Choose what to offer' }
    ];

    if (listingCategory === 'homestay') {
      return [
        ...baseSteps,
        { number: 1, title: 'Basic Info', desc: 'Title, description, location' },
        { number: 2, title: 'Property Details', desc: 'Type and capacity' },
        { number: 3, title: 'Amenities', desc: 'Features and services' },
        { number: 4, title: 'Photos & Publish', desc: 'Upload images and publish' }
      ];
    } else {
      return [
        ...baseSteps,
        { number: 1, title: 'Basic Info', desc: 'Title, description, location' },
        { number: 2, title: 'Experience Details', desc: 'Category, duration, difficulty' },
        { number: 3, title: 'Inclusions', desc: 'What\'s included' },
        { number: 4, title: 'Photos & Publish', desc: 'Upload images and publish' }
      ];
    }
  };

  // Debounced location suggestions (same as before)
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

  // Handle location input change
  const handleLocationChange = (e) => {
    const location = e.target.value;
    setCurrentFormData(prev => ({ ...prev, location }));
    setSelectedSuggestion(null);
    setIsSelectingSuggestion(false);
    
    setGeocodingStatus(null);
    setGeocodedLocation('');
    setCoordinates({ lat: 0, lng: 0 });
    
    if (suggestionsTimeoutRef.current) {
      clearTimeout(suggestionsTimeoutRef.current);
    }
    
    suggestionsTimeoutRef.current = setTimeout(() => {
      fetchLocationSuggestions(location);
    }, 300);
  };

  // Handle location suggestion selection
  const handleSuggestionSelect = async (suggestion) => {
    try {
      setIsSelectingSuggestion(true);
      setLoadingSuggestions(true);
      setShowSuggestions(false);
      setSelectedSuggestion(suggestion);
      
      setCurrentFormData(prev => ({
        ...prev,
        location: suggestion.description
      }));
      
      const response = await listingsAPI.getPlaceDetails({ place_id: suggestion.place_id });
      
      if (response.data.success) {
        const placeDetails = response.data.place_details;
        
        setCurrentFormData(prev => ({
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

  // Image upload functions (same as before)
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

  // Toggle functions for arrays
  const toggleArrayItem = (array, item, setterKey) => {
    setCurrentFormData(prev => ({
      ...prev,
      [setterKey]: prev[setterKey].includes(item)
        ? prev[setterKey].filter(a => a !== item)
        : [...prev[setterKey], item]
    }));
  };

useEffect(() => {
  const errors = {};
  const formData = getCurrentFormData();
  
  if (currentStep >= 1) {
    if (!formData.title?.trim()) errors.title = 'Title is required';
    if (!formData.description?.trim() || formData.description.length < 50) {
      errors.description = 'Description must be at least 50 characters';
    }
    if (!formData.location?.trim()) errors.location = 'Location is required';
    
    // Fix: Different price validation for different categories
    if (listingCategory === 'homestay') {
      if (!formData.price_per_night || formData.price_per_night < 500) {
        errors.price_per_night = 'Price must be at least ₹500 per night';
      }
    } else if (listingCategory === 'experience') {
      if (!formData.price_per_person || formData.price_per_person < 100) {
        errors.price_per_person = 'Price must be at least ₹100 per person';
      }
    }
  }
  
  if (currentStep >= 4) {
    if (images.length === 0) errors.images = 'At least one image is required';
  }
  
  setFormErrors(errors);
  setIsFormValid(Object.keys(errors).length === 0);
}, [getCurrentFormData(), currentStep, images, listingCategory]);

  // Submit form
// Update the handleSubmit function in your CreateListingPage component

const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!isFormValid) {
    toast.error('Please fix all form errors before submitting');
    return;
  }

  if (images.length === 0) {
    toast.error('Please upload at least one photo');
    return;
  }

  setLoading(true);

  try {
    const formData = getCurrentFormData();
    
    console.log('🔍 Current form data before submission:', formData);
    console.log('🔍 Listing category:', listingCategory);
    
    // Prepare submission data with proper structure
    const submissionData = {
      listing_category: listingCategory,
      title: formData.title,
      description: formData.description,
      location: formData.location,
      images: images.map(img => img.url || img.preview),
      coordinates: coordinates.lat !== 0 && coordinates.lng !== 0 ? coordinates : { lat: 0, lng: 0 }
    };

    // Add category-specific fields
    if (listingCategory === 'homestay') {
      submissionData.price_per_night = parseFloat(formData.price_per_night);
      submissionData.property_type = formData.property_type;
      submissionData.max_guests = parseInt(formData.max_guests);
      submissionData.amenities = formData.amenities;
      submissionData.house_rules = formData.house_rules || [];
      submissionData.sustainability_features = formData.sustainability_features || [];
      submissionData.check_in_time = formData.check_in_time || '14:00';
      submissionData.check_out_time = formData.check_out_time || '11:00';
      submissionData.cancellation_policy = formData.cancellation_policy || 'flexible';
      submissionData.instant_book = formData.instant_book || false;
    } else if (listingCategory === 'experience') {
      submissionData.price_per_person = parseFloat(formData.price_per_person);
      submissionData.category = formData.category;
      submissionData.duration = parseFloat(formData.duration);
      submissionData.max_participants = parseInt(formData.max_participants);
      submissionData.inclusions = formData.inclusions;
      submissionData.requirements = formData.requirements || [];
      submissionData.difficulty_level = formData.difficulty_level;
      submissionData.age_restrictions = formData.age_restrictions || { min_age: 0, max_age: 100 };
      submissionData.languages = formData.languages || ['English'];
      submissionData.meeting_point = formData.meeting_point || '';
      submissionData.what_to_bring = formData.what_to_bring || [];
      submissionData.cancellation_policy = formData.cancellation_policy || 'flexible';
      submissionData.group_size_preference = formData.group_size_preference || 'small';
    }

    console.log('📤 Final submission data:', submissionData);
    console.log('📤 Required fields check:', {
      category: submissionData.listing_category,
      title: submissionData.title,
      description: submissionData.description,
      location: submissionData.location,
      price_field: listingCategory === 'homestay' ? 'price_per_night' : 'price_per_person',
      price_value: listingCategory === 'homestay' ? submissionData.price_per_night : submissionData.price_per_person
    });

    const response = await listingsAPI.create(submissionData);
    
    const categoryName = listingCategory === 'homestay' ? 'Homestay' : 'Experience';
    toast.success(`🎉 ${categoryName} created successfully!`);
    
    if (response.data.coordinates && response.data.coordinates.lat !== 0) {
      toast.success('📍 Location coordinates saved!');
    }
    
    // Redirect to listings page
    router.push('/host/listings');
    
  } catch (error) {
    console.error('❌ Create listing error:', error);
    
    // More detailed error handling
    if (error.response?.data?.error) {
      toast.error(error.response.data.error);
    } else if (error.response?.status === 400) {
      toast.error('Please check all required fields and try again');
    } else {
      toast.error('Failed to create listing. Please try again.');
    }
    
    // Log the full error for debugging
    console.error('❌ Full error details:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      config: error.config
    });
    
  } finally {
    setLoading(false);
  }
};


  // Handle input focus/blur for location suggestions (same as before)
  const handleLocationFocus = () => {
    const formData = getCurrentFormData();
    if (locationSuggestions.length > 0 && formData.location.length > 1) {
      setShowSuggestions(true);
    }
  };

  const handleLocationBlur = () => {
    setTimeout(() => {
      if (!isSelectingSuggestion) {
        setShowSuggestions(false);
      }
    }, 200);
  };

  // Click outside to close suggestions
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
              {listingCategory === 'homestay' ? <HomeIcon className="w-10 h-10 text-white" /> : 
               listingCategory === 'experience' ? <AcademicCapIcon className="w-10 h-10 text-white" /> :
               <SparklesIcon className="w-10 h-10 text-white" />}
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <SparklesIcon className="w-3 h-3 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-green-600 bg-clip-text text-transparent mb-4">
            {listingCategory ? `Create Your ${listingCategory === 'homestay' ? 'Homestay' : 'Experience'}` : 'Create Your Listing'}
          </h1>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {listingCategory === 'homestay' 
              ? 'Share your authentic rural accommodation with travelers from around the world'
              : listingCategory === 'experience'
              ? 'Share your skills, culture, and local knowledge through unique experiences'
              : 'Choose what you want to offer to travelers from around the world'
            }
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
            {getSteps().map((step, index) => (
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
                {index < getSteps().length - 1 && (
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
            {/* Step 0: Category Selection */}
            {currentStep === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl border border-white/20"
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    ✨ What would you like to offer?
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    Choose whether you want to offer accommodation or unique local experiences
                  </p>
                </div>
                
                <div className="max-w-4xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {listingCategories.map((category) => (
                      <motion.button
                        key={category.value}
                        type="button"
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setListingCategory(category.value);
                          setCurrentStep(1);
                        }}
                        className={`relative p-8 rounded-3xl border-2 transition-all duration-300 text-left group bg-white hover:shadow-2xl hover:shadow-green-500/10 ${
                          listingCategory === category.value
                            ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50'
                            : 'border-gray-200 hover:border-green-300'
                        }`}
                      >
                        {category.popular && (
                          <div className="absolute -top-3 -right-3 bg-gradient-to-r from-orange-400 to-red-500 text-white text-xs font-bold px-4 py-2 rounded-full">
                            Popular
                          </div>
                        )}
                        
                        <div className="text-6xl mb-6 text-center">{category.icon}</div>
                        
                        <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">
                          {category.title}
                        </h3>
                        
                        <p className="text-gray-600 text-center mb-6">
                          {category.description}
                        </p>
                        
                        <div className="space-y-3 mb-6">
                          {category.features.map((feature, index) => (
                            <div key={index} className="flex items-center space-x-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm text-gray-700">{feature}</span>
                            </div>
                          ))}
                        </div>
                        
                        <div className="text-center">
                          <div className="inline-flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-full text-sm font-medium text-gray-700">
                            <CurrencyRupeeIcon className="w-4 h-4" />
                            <span>Pricing: {category.pricing}</span>
                          </div>
                        </div>
                        
                        <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-blue-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 1: Basic Information - Universal for both categories */}
            {currentStep === 1 && listingCategory && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl border border-white/20"
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    ✨ Tell Us About Your {listingCategory === 'homestay' ? 'Property' : 'Experience'}
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    {listingCategory === 'homestay' 
                      ? 'Start by sharing the basic details that will make travelers fall in love with your place'
                      : 'Share the details that will help travelers understand what amazing experience you offer'
                    }
                  </p>
                </div>
                
                <div className="max-w-4xl mx-auto space-y-8">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      {listingCategory === 'homestay' ? <HomeIcon className="w-5 h-5 inline mr-2" /> : <AcademicCapIcon className="w-5 h-5 inline mr-2" />}
                      {listingCategory === 'homestay' ? 'Property' : 'Experience'} Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={getCurrentFormData().title}
                      onChange={(e) => setCurrentFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder={listingCategory === 'homestay' 
                        ? "e.g., Traditional Rajasthani Haveli Experience"
                        : "e.g., Learn Traditional Pottery Making"
                      }
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
                  </div>

                  {/* Description with AI Generator */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-semibold text-gray-700">
                        <SparklesIcon className="w-5 h-5 inline mr-2" />
                        Description *
                      </label>
                      <AIContentGenerator
                        title={getCurrentFormData().title}
                        location={getCurrentFormData().location}
                        price_per_night={listingCategory === 'homestay' ? getCurrentFormData().price_per_night : getCurrentFormData().price_per_person}
                        property_type={listingCategory === 'homestay' ? getCurrentFormData().property_type : getCurrentFormData().category}
                        onContentGenerated={(description) => {
                          setCurrentFormData(prev => ({ ...prev, description }));
                        }}
                        onSuggestionsGenerated={(suggestions) => {
                          if (listingCategory === 'homestay') {
                            if (suggestions.suggested_amenities) {
                              setCurrentFormData(prev => ({
                                ...prev,
                                amenities: [...new Set([...prev.amenities, ...suggestions.suggested_amenities])]
                              }));
                            }
                            
                            if (suggestions.house_rules) {
                              setCurrentFormData(prev => ({
                                ...prev,
                                house_rules: suggestions.house_rules
                              }));
                            }
                            
                            if (suggestions.sustainability_features) {
                              setCurrentFormData(prev => ({
                                ...prev,
                                sustainability_features: suggestions.sustainability_features
                              }));
                            }
                          } else {
                            if (suggestions.suggested_amenities) {
                              setCurrentFormData(prev => ({
                                ...prev,
                                inclusions: [...new Set([...prev.inclusions, ...suggestions.suggested_amenities])]
                              }));
                            }
                          }
                        }}
                      />
                    </div>
                    <textarea
                      rows={6}
                      required
                      value={getCurrentFormData().description}
                      onChange={(e) => setCurrentFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder={listingCategory === 'homestay'
                        ? "Describe your property, what makes it special, and the experience guests can expect..."
                        : "Describe your experience, what participants will learn, and what makes it unique..."
                      }
                      className={`w-full px-4 py-4 border-2 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 resize-none ${
                        formErrors.description ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-green-300'
                      }`}
                    />
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <div className={`${formErrors.description ? 'text-red-600' : 'text-gray-500'}`}>
                        {formErrors.description || 'Minimum 50 characters recommended'}
                      </div>
                      <div className={`${getCurrentFormData().description.length >= 50 ? 'text-green-600' : 'text-gray-500'}`}>
                        {getCurrentFormData().description.length} characters
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Location - Same for both */}
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
                          value={getCurrentFormData().location}
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
                                   e.preventDefault();
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
                                   </div>
                                   <ChevronRightIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                 </div>
                               </motion.button>
                             ))}
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
                     
                     {formErrors.location && (
                       <p className="mt-2 text-sm text-red-600 flex items-center">
                         <XMarkIcon className="w-4 h-4 mr-1" />
                         {formErrors.location}
                       </p>
                     )}
                   </div>

                   {/* Price - Different for homestay vs experience */}
                   <div>
                     <label className="block text-sm font-semibold text-gray-700 mb-3">
                       <CurrencyRupeeIcon className="w-5 h-5 inline mr-2" />
                       Price {listingCategory === 'homestay' ? 'per Night' : 'per Person'} (₹) *
                     </label>
                     <div className="relative">
                       <input
                         type="number"
                         required
                         min={listingCategory === 'homestay' ? "500" : "100"}
                         max="50000"
                         value={listingCategory === 'homestay' ? getCurrentFormData().price_per_night : getCurrentFormData().price_per_person}
                         onChange={(e) => setCurrentFormData(prev => ({ 
                           ...prev, 
                           [listingCategory === 'homestay' ? 'price_per_night' : 'price_per_person']: e.target.value 
                         }))}
                         placeholder={listingCategory === 'homestay' ? "2000" : "500"}
                         className={`w-full px-4 py-4 border-2 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-lg ${
                           (formErrors.price_per_night || formErrors.price_per_person) ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-green-300'
                         }`}
                       />
                       <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                         {listingCategory === 'homestay' ? 'per night' : 'per person'}
                       </div>
                     </div>
                     {(formErrors.price_per_night || formErrors.price_per_person) && (
                       <p className="mt-2 text-sm text-red-600 flex items-center">
                         <XMarkIcon className="w-4 h-4 mr-1" />
                         {formErrors.price_per_night || formErrors.price_per_person}
                       </p>
                     )}
                     <div className="mt-2 text-xs text-gray-500">
                       Set a competitive price for your local market
                     </div>
                   </div>
                 </div>
               </div>

               {/* Navigation */}
               <div className="mt-12 flex justify-between">
                 <motion.button
                   type="button"
                   onClick={() => setCurrentStep(0)}
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-semibold text-lg transition-all duration-300 flex items-center space-x-2"
                 >
                   <ChevronLeftIcon className="w-5 h-5" />
                   <span>Back</span>
                 </motion.button>
                 
<motion.button
  type="button"
  onClick={() => setCurrentStep(2)}
  disabled={(() => {
    const formData = getCurrentFormData();
    const hasTitle = formData.title?.trim();
    const hasDescription = formData.description?.trim() && formData.description.length >= 50;
    const hasLocation = formData.location?.trim();
    
    let hasPrice = false;
    if (listingCategory === 'homestay') {
      hasPrice = formData.price_per_night && formData.price_per_night >= 500;
    } else if (listingCategory === 'experience') {
      hasPrice = formData.price_per_person && formData.price_per_person >= 100;
    }
    
    return !hasTitle || !hasDescription || !hasLocation || !hasPrice;
  })()}
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  className={`px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg transition-all duration-300 flex items-center space-x-2 ${
    (() => {
      const formData = getCurrentFormData();
      const hasTitle = formData.title?.trim();
      const hasDescription = formData.description?.trim() && formData.description.length >= 50;
      const hasLocation = formData.location?.trim();
      
      let hasPrice = false;
      if (listingCategory === 'homestay') {
        hasPrice = formData.price_per_night && formData.price_per_night >= 500;
      } else if (listingCategory === 'experience') {
        hasPrice = formData.price_per_person && formData.price_per_person >= 100;
      }
      
      return (!hasTitle || !hasDescription || !hasLocation || !hasPrice)
        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
        : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-green-500/25';
    })()
  }`}
>
  <span>Continue to {listingCategory === 'homestay' ? 'Property' : 'Experience'} Details</span>
  <ChevronRightIcon className="w-5 h-5" />
</motion.button>
               </div>
             </motion.div>
           )}

           {/* Step 2: Property/Experience Details */}
           {currentStep === 2 && listingCategory && (
             <motion.div
               key="step2"
               initial={{ opacity: 0, x: 50 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -50 }}
               className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl border border-white/20"
             >
               <div className="text-center mb-8">
                 <h2 className="text-3xl font-bold text-gray-900 mb-4">
                   {listingCategory === 'homestay' ? '🏠 Property Details' : '🎭 Experience Details'}
                 </h2>
                 <p className="text-gray-600 max-w-2xl mx-auto">
                   {listingCategory === 'homestay' 
                     ? 'Help travelers understand what type of accommodation you\'re offering'
                     : 'Help travelers understand what type of experience you\'re offering'
                   }
                 </p>
               </div>
               
               <div className="max-w-6xl mx-auto space-y-10">
                 {/* Property Type Selection for Homestays */}
                 {listingCategory === 'homestay' && (
                   <>
                     <div>
                       <label className="block text-lg font-semibold text-gray-900 mb-6 text-center">
                         What type of property is this?
                       </label>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {homestayTypes.map((type) => (
                           <motion.button
                             key={type.value}
                             type="button"
                             whileHover={{ scale: 1.02, y: -2 }}
                             whileTap={{ scale: 0.98 }}
                             onClick={() => setCurrentFormData(prev => ({ ...prev, property_type: type.value }))}
                             className={`relative p-6 rounded-2xl border-2 transition-all duration-300 text-left group ${
                               getCurrentFormData().property_type === type.value
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
                           value={getCurrentFormData().max_guests}
                           onChange={(e) => setCurrentFormData(prev => ({ ...prev, max_guests: parseInt(e.target.value) }))}
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
                     </div>
                   </>
                 )}

                 {/* Experience Category Selection */}
                 {listingCategory === 'experience' && (
                   <>
                     <div>
                       <label className="block text-lg font-semibold text-gray-900 mb-6 text-center">
                         What type of experience is this?
                       </label>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                         {experienceCategories.map((category) => (
                           <motion.button
                             key={category.value}
                             type="button"
                             whileHover={{ scale: 1.02, y: -2 }}
                             whileTap={{ scale: 0.98 }}
                             onClick={() => setCurrentFormData(prev => ({ ...prev, category: category.value }))}
                             className={`relative p-6 rounded-2xl border-2 transition-all duration-300 text-left group ${
                               getCurrentFormData().category === category.value
                                 ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg shadow-green-500/25'
                                 : 'border-gray-200 hover:border-green-300 hover:shadow-lg bg-white'
                             }`}
                           >
                             {category.popular && (
                               <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-400 to-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                 Popular
                               </div>
                             )}
                             <div className="text-4xl mb-4">{category.icon}</div>
                             <h3 className="text-lg font-bold text-gray-900 mb-2">{category.label}</h3>
                             <p className="text-gray-600 text-xs">{category.desc}</p>
                           </motion.button>
                         ))}
                       </div>
                     </div>

                     {/* Duration and Participants */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       <div>
                         <label className="block text-lg font-semibold text-gray-900 mb-4 text-center">
                           <ClockIcon className="w-6 h-6 inline mr-2" />
                           Duration (hours)
                         </label>
                         <div className="relative">
                           <select
                             value={getCurrentFormData().duration}
                             onChange={(e) => setCurrentFormData(prev => ({ ...prev, duration: parseFloat(e.target.value) }))}
                             className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-lg font-medium bg-white appearance-none cursor-pointer"
                           >
                             {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8].map(hours => (
                               <option key={hours} value={hours}>
                                 {hours} hour{hours > 1 ? 's' : ''}
                               </option>
                             ))}
                           </select>
                         </div>
                       </div>

                       <div>
                         <label className="block text-lg font-semibold text-gray-900 mb-4 text-center">
                           <UsersIcon className="w-6 h-6 inline mr-2" />
                           Max Participants
                         </label>
                         <div className="relative">
                           <select
                             value={getCurrentFormData().max_participants}
                             onChange={(e) => setCurrentFormData(prev => ({ ...prev, max_participants: parseInt(e.target.value) }))}
                             className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-lg font-medium bg-white appearance-none cursor-pointer"
                           >
                             {[1, 2, 4, 6, 8, 10, 12, 15, 20, 25, 30].map(num => (
                               <option key={num} value={num}>
                                 {num} participant{num > 1 ? 's' : ''}
                               </option>
                             ))}
                           </select>
                         </div>
                       </div>

                       <div>
                         <label className="block text-lg font-semibold text-gray-900 mb-4 text-center">
                           Difficulty Level
                         </label>
                         <div className="relative">
                           <select
                             value={getCurrentFormData().difficulty_level}
                             onChange={(e) => setCurrentFormData(prev => ({ ...prev, difficulty_level: e.target.value }))}
                             className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-lg font-medium bg-white appearance-none cursor-pointer"
                           >
                             <option value="easy">Easy</option>
                             <option value="moderate">Moderate</option>
                             <option value="challenging">Challenging</option>
                           </select>
                         </div>
                       </div>
                     </div>
                   </>
                 )}
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
                   <span>Continue to {listingCategory === 'homestay' ? 'Amenities' : 'Inclusions'}</span>
                   <ChevronRightIcon className="w-5 h-5" />
                 </motion.button>
               </div>
             </motion.div>
           )}

           {/* Step 3: Amenities/Inclusions */}
           {currentStep === 3 && listingCategory && (
             <motion.div
               key="step3"
               initial={{ opacity: 0, x: 50 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -50 }}
               className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl border border-white/20"
             >
               <div className="text-center mb-8">
                 <h2 className="text-3xl font-bold text-gray-900 mb-4">
                   ✨ {listingCategory === 'homestay' ? 'Amenities & Features' : 'What\'s Included'}
                 </h2>
                 <p className="text-gray-600 max-w-2xl mx-auto">
                   {listingCategory === 'homestay' 
                     ? 'What special features and services do you offer to make guests feel at home?'
                     : 'What will participants get as part of this experience?'
                   }
                 </p>
               </div>
               
               <div className="max-w-6xl mx-auto space-y-8">
                 <div>
                   <h3 className="text-xl font-semibold text-gray-900 mb-6">
                     Select your {listingCategory === 'homestay' ? 'amenities' : 'inclusions'}
                   </h3>
                   <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                     {(listingCategory === 'homestay' ? homestayAmenities : experienceInclusions).map((item) => (
                       <motion.button
                         key={item.name}
                         type="button"
                         whileHover={{ scale: 1.05 }}
                         whileTap={{ scale: 0.95 }}
                         onClick={() => toggleArrayItem(
                           listingCategory === 'homestay' ? homestayAmenities : experienceInclusions,
                           item.name,
                           listingCategory === 'homestay' ? 'amenities' : 'inclusions'
                         )}
                         className={`p-4 rounded-2xl border-2 transition-all duration-300 text-left group ${
                           (listingCategory === 'homestay' ? getCurrentFormData().amenities : getCurrentFormData().inclusions).includes(item.name)
                             ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg shadow-green-500/10'
                             : 'border-gray-200 hover:border-green-300 hover:shadow-md bg-white'
                         }`}
                       >
                         <div className="flex items-center space-x-3">
                           <div className="text-2xl">{item.icon}</div>
                           <div className="flex-1">
                             <div className={`font-medium ${
                               (listingCategory === 'homestay' ? getCurrentFormData().amenities : getCurrentFormData().inclusions).includes(item.name) ? 'text-green-900' : 'text-gray-900'
                             }`}>
                               {item.name}
                             </div>
                             <div className="text-xs text-gray-500 capitalize">{item.category}</div>
                           </div>
                           {(listingCategory === 'homestay' ? getCurrentFormData().amenities : getCurrentFormData().inclusions).includes(item.name) && (
                             <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                               <CheckIcon className="w-4 h-4 text-white" />
                             </div>
                           )}
                         </div>
                       </motion.button>
                     ))}
                   </div>
                 </div>

                 {/* Selected Items Preview */}
                 {(listingCategory === 'homestay' ? getCurrentFormData().amenities : getCurrentFormData().inclusions).length > 0 && (
                   <motion.div
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6"
                   >
                     <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                       <CheckIcon className="w-5 h-5 mr-2" />
                       Selected {listingCategory === 'homestay' ? 'Amenities' : 'Inclusions'} ({(listingCategory === 'homestay' ? getCurrentFormData().amenities : getCurrentFormData().inclusions).length})
                     </h4>
                     <div className="flex flex-wrap gap-2">
                       {(listingCategory === 'homestay' ? getCurrentFormData().amenities : getCurrentFormData().inclusions).map((item) => {
                         const itemData = (listingCategory === 'homestay' ? homestayAmenities : experienceInclusions).find(a => a.name === item);
                         return (
                           <span
                             key={item}
                             className="inline-flex items-center space-x-2 bg-white/80 text-green-800 px-3 py-2 rounded-xl text-sm font-medium border border-green-200"
                           >
                             <span>{itemData?.icon}</span>
                             <span>{item}</span>
                             <button
                               type="button"
                               onClick={() => toggleArrayItem(
                                 listingCategory === 'homestay' ? homestayAmenities : experienceInclusions,
                                 item,
                                 listingCategory === 'homestay' ? 'amenities' : 'inclusions'
                               )}
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

           {/* Step 4: Photos & Publish - Universal */}
           {currentStep === 4 && listingCategory && (
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
                   Add beautiful photos that showcase your {listingCategory === 'homestay' ? 'property' : 'experience'} and review your listing before publishing
                 </p>
               </div>
               
               <div className="max-w-6xl mx-auto space-y-10">
                 {/* Photo Upload Section */}
                 <div>
                   <h3 className="text-xl font-semibold text-gray-900 mb-6">
                     {listingCategory === 'homestay' ? 'Property' : 'Experience'} Photos *
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
                         Show off your {listingCategory === 'homestay' ? 'property\'s' : 'experience\'s'} best features!
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
                                 alt={`${listingCategory} photo ${index + 1}`}
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
                     {listingCategory === 'homestay' ? 'Homestay' : 'Experience'} Preview
                   </h3>
                   
                   <div className="bg-white rounded-2xl p-6 shadow-lg">
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                       {/* Preview Card */}
                       <div>
                         <div className="aspect-video bg-gray-200 rounded-2xl mb-4 overflow-hidden">
                           {images.length > 0 ? (
                             <img
                               src={images[0].preview || images[0].url}
                               alt="Preview"
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
                             {getCurrentFormData().title || `Your ${listingCategory === 'homestay' ? 'Property' : 'Experience'} Title`}
                           </h4>
                           <p className="text-gray-600 text-sm line-clamp-3">
                             {getCurrentFormData().description || `Your ${listingCategory} description will appear here...`}
                           </p>
                           <div className="flex items-center justify-between">
                             <div className="flex items-center space-x-2 text-sm text-gray-500">
                               <MapPinIcon className="w-4 h-4" />
                               <span>{getCurrentFormData().location || 'Location'}</span>
                             </div>
                             <div className="text-xl font-bold text-green-600">
                               ₹{(listingCategory === 'homestay' ? getCurrentFormData().price_per_night : getCurrentFormData().price_per_person) || '0'}/{listingCategory === 'homestay' ? 'night' : 'person'}
                             </div>
                           </div>
                         </div>
                       </div>
                       
                       {/* Summary Details */}
                       <div className="space-y-6">
                         <div>
                           <h5 className="font-semibold text-gray-900 mb-3">{listingCategory === 'homestay' ? 'Property' : 'Experience'} Details</h5>
                           <div className="grid grid-cols-2 gap-4 text-sm">
                             <div>
                               <span className="text-gray-500">{listingCategory === 'homestay' ? 'Type:' : 'Category:'}</span>
                               <p className="font-medium capitalize">
                                 {(listingCategory === 'homestay' ? getCurrentFormData().property_type : getCurrentFormData().category)?.replace('_', ' ')}
                               </p>
                             </div>
                             <div>
                               <span className="text-gray-500">{listingCategory === 'homestay' ? 'Max Guests:' : 'Max Participants:'}</span>
                               <p className="font-medium">{listingCategory === 'homestay' ? getCurrentFormData().max_guests : getCurrentFormData().max_participants}</p>
                             </div>
                             {listingCategory === 'experience' && (
                               <>
                                 <div>
                                   <span className="text-gray-500">Duration:</span>
                                   <p className="font-medium">{getCurrentFormData().duration} hours</p>
                                 </div>
                                 <div>
                                   <span className="text-gray-500">Difficulty:</span>
                                   <p className="font-medium capitalize">{getCurrentFormData().difficulty_level}</p>
                                 </div>
                               </>
                             )}
                             <div>
                               <span className="text-gray-500">Photos:</span>
                               <p className="font-medium">{images.length} uploaded</p>
                             </div>
                             <div>
                               <span className="text-gray-500">{listingCategory === 'homestay' ? 'Amenities:' : 'Inclusions:'}</span>
                               <p className="font-medium">{(listingCategory === 'homestay' ? getCurrentFormData().amenities : getCurrentFormData().inclusions).length} selected</p>
                             </div>
                           </div>
                         </div>
                         
                         {(listingCategory === 'homestay' ? getCurrentFormData().amenities : getCurrentFormData().inclusions).length > 0 && (
                           <div>
                             <h5 className="font-semibold text-gray-900 mb-3">Top {listingCategory === 'homestay' ? 'Amenities' : 'Inclusions'}</h5>
                             <div className="flex flex-wrap gap-2">
                               {(listingCategory === 'homestay' ? getCurrentFormData().amenities : getCurrentFormData().inclusions).slice(0, 6).map((item) => {
                                 const itemData = (listingCategory === 'homestay' ? homestayAmenities : experienceInclusions).find(a => a.name === item);
                                 return (
                                   <span
                                     key={item}
                                     className="inline-flex items-center space-x-1 bg-green-100 text-green-800 px-2 py-1 rounded-lg text-xs"
                                   >
                                     <span>{itemData?.icon}</span>
                                     <span>{item}</span>
                                   </span>
                                 );
                               })}
                               {(listingCategory === 'homestay' ? getCurrentFormData().amenities : getCurrentFormData().inclusions).length > 6 && (
                                 <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                                   +{(listingCategory === 'homestay' ? getCurrentFormData().amenities : getCurrentFormData().inclusions).length - 6} more
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
                         <span>Publish {listingCategory === 'homestay' ? 'Homestay' : 'Experience'}</span>
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